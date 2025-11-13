<?php
/**
 * HubSpot CRM Integration
 */
if (!defined('ABSPATH')) { exit; }

class PSP_HubSpot {
    const OPTION_KEY = 'psp_hubspot_settings';
    const API_BASE = 'https://api.hubapi.com';

    public static function init() : void {
        // Hooks for auto-sync
        add_action('save_post_psp_partner', [ __CLASS__, 'on_partner_save' ], 10, 2);
        add_action('save_post_psp_ticket', [ __CLASS__, 'on_ticket_save' ], 10, 2);
        
        // Admin settings
        add_action('admin_init', [ __CLASS__, 'register_settings' ]);
        
        // REST routes
        add_action('rest_api_init', [ __CLASS__, 'register_routes' ]);
    }

    public static function register_settings() : void {
        register_setting('psp_hubspot_group', self::OPTION_KEY, [
            'type' => 'array',
            'sanitize_callback' => [ __CLASS__, 'sanitize_settings' ],
            'default' => [
                'api_key' => '',
                'portal_id' => '',
                'auto_sync_partners' => false,
                'auto_sync_tickets' => false,
            ],
        ]);

        add_settings_section('psp_hubspot_section', __('HubSpot Integration', 'psp'), function(){
            echo '<p>' . esc_html__('Connect to HubSpot CRM to sync partners and tickets.', 'psp') . '</p>';
        }, 'psp-hubspot');

        add_settings_field('psp_hubspot_api_key', __('API Key', 'psp'), [ __CLASS__, 'field_api_key' ], 'psp-hubspot', 'psp_hubspot_section');
        add_settings_field('psp_hubspot_portal_id', __('Portal ID', 'psp'), [ __CLASS__, 'field_portal_id' ], 'psp-hubspot', 'psp_hubspot_section');
        add_settings_field('psp_hubspot_auto_sync_partners', __('Auto-sync Partners', 'psp'), [ __CLASS__, 'field_auto_sync_partners' ], 'psp-hubspot', 'psp_hubspot_section');
        add_settings_field('psp_hubspot_auto_sync_tickets', __('Auto-sync Tickets', 'psp'), [ __CLASS__, 'field_auto_sync_tickets' ], 'psp-hubspot', 'psp_hubspot_section');
    }

    public static function sanitize_settings($input) : array {
        $out = is_array($input) ? $input : [];
        $out['api_key'] = isset($out['api_key']) ? sanitize_text_field($out['api_key']) : '';
        $out['portal_id'] = isset($out['portal_id']) ? sanitize_text_field($out['portal_id']) : '';
        $out['auto_sync_partners'] = !empty($out['auto_sync_partners']);
        $out['auto_sync_tickets'] = !empty($out['auto_sync_tickets']);
        return $out;
    }

    public static function get_settings() : array {
        // Priority 1: Check Setup Wizard settings first
        $wizard_api_key = '';
        $wizard_portal_id = '';
        $wizard_sync_enabled = false;
        $wizard_sync_frequency = '';
        
        if (class_exists('PSP_Setup_Wizard')) {
            $wizard_api_key = PSP_Setup_Wizard::get_setting('hubspot_api_key');
            $wizard_portal_id = PSP_Setup_Wizard::get_setting('hubspot_portal_id');
            $wizard_sync_enabled = PSP_Setup_Wizard::get_setting('hubspot_sync_enabled') === '1';
            $wizard_sync_frequency = PSP_Setup_Wizard::get_setting('hubspot_sync_frequency');
        }
        
        // Priority 2: Fallback to old settings (for backward compatibility)
        $old_opts = get_option(self::OPTION_KEY, []);
        if (!is_array($old_opts)) $old_opts = [];
        
        $defaults = [
            'api_key' => '',
            'portal_id' => '',
            'auto_sync_partners' => false,
            'auto_sync_tickets' => false,
        ];
        
        $settings = wp_parse_args($old_opts, $defaults);
        
        // Override with Setup Wizard settings if present
        if (!empty($wizard_api_key)) {
            $settings['api_key'] = $wizard_api_key;
        }
        if (!empty($wizard_portal_id)) {
            $settings['portal_id'] = $wizard_portal_id;
        }
        if ($wizard_sync_enabled) {
            $settings['auto_sync_partners'] = true;
            $settings['auto_sync_tickets'] = ($wizard_sync_frequency === 'realtime');
        }
        
        return $settings;
    }

    public static function is_configured() : bool {
        $opts = self::get_settings();
        return !empty($opts['api_key']);
    }

    // Field callbacks
    public static function field_api_key() : void {
        $opts = self::get_settings();
        echo '<input type="password" class="regular-text" name="' . esc_attr(self::OPTION_KEY) . '[api_key]" value="' . esc_attr($opts['api_key']) . '" placeholder="' . esc_attr__('Enter HubSpot API key', 'psp') . '" />';
        echo '<p class="description">' . esc_html__('Private app API key from HubSpot.', 'psp') . '</p>';
    }

    public static function field_portal_id() : void {
        $opts = self::get_settings();
        echo '<input type="text" class="regular-text" name="' . esc_attr(self::OPTION_KEY) . '[portal_id]" value="' . esc_attr($opts['portal_id']) . '" placeholder="21854204" />';
        echo '<p class="description">' . esc_html__('Your HubSpot portal/account ID.', 'psp') . '</p>';
    }

    public static function field_auto_sync_partners() : void {
        $opts = self::get_settings();
        echo '<label><input type="checkbox" name="' . esc_attr(self::OPTION_KEY) . '[auto_sync_partners]" value="1" ' . checked($opts['auto_sync_partners'], true, false) . ' /> ' . esc_html__('Automatically sync partners to HubSpot as contacts', 'psp') . '</label>';
    }

    public static function field_auto_sync_tickets() : void {
        $opts = self::get_settings();
        echo '<label><input type="checkbox" name="' . esc_attr(self::OPTION_KEY) . '[auto_sync_tickets]" value="1" ' . checked($opts['auto_sync_tickets'], true, false) . ' /> ' . esc_html__('Automatically sync tickets to HubSpot as deals', 'psp') . '</label>';
    }

    // Auto-sync hooks
    public static function on_partner_save($post_id, $post) : void {
        if (wp_is_post_autosave($post_id) || wp_is_post_revision($post_id)) return;
        $opts = self::get_settings();
        if ($opts['auto_sync_partners'] && self::is_configured()) {
            self::sync_partner($post_id);
        }
    }

    public static function on_ticket_save($post_id, $post) : void {
        if (wp_is_post_autosave($post_id) || wp_is_post_revision($post_id)) return;
        $opts = self::get_settings();
        if ($opts['auto_sync_tickets'] && self::is_configured()) {
            self::sync_ticket($post_id);
        }
    }

    // Sync partner to HubSpot contact
    public static function sync_partner($partner_id) : array {
        if (!self::is_configured()) {
            return [ 'success' => false, 'error' => 'HubSpot not configured' ];
        }

        $opts = self::get_settings();
        $company_name = get_the_title($partner_id);
        $email = get_post_meta($partner_id, 'psp_company_email', true);
        if (empty($email)) {
            $email = 'contact@' . sanitize_title($company_name) . '.com';
        }

        $properties = [
            'email' => $email,
            'company' => $company_name,
            'address' => get_post_meta($partner_id, 'psp_street_address', true),
            'city' => get_post_meta($partner_id, 'psp_city', true),
            'state' => get_post_meta($partner_id, 'psp_state', true),
            'zip' => get_post_meta($partner_id, 'psp_zip', true),
            'country' => get_post_meta($partner_id, 'psp_country', true),
            'loungenie_units' => (string) get_post_meta($partner_id, 'psp_number_of_lounge_units', true),
            'top_colour' => get_post_meta($partner_id, 'psp_top_colour', true),
            'partner_id' => (string) $partner_id,
        ];

        $response = wp_remote_post(self::API_BASE . '/crm/v3/objects/contacts', [
            'headers' => [
                'Authorization' => 'Bearer ' . $opts['api_key'],
                'Content-Type' => 'application/json',
            ],
            'body' => json_encode([ 'properties' => array_filter($properties) ]),
            'timeout' => 15,
        ]);

        if (is_wp_error($response)) {
            return [ 'success' => false, 'error' => $response->get_error_message() ];
        }

        $code = wp_remote_retrieve_response_code($response);
        $body = json_decode(wp_remote_retrieve_body($response), true);

        if ($code >= 200 && $code < 300) {
            $contact_id = isset($body['id']) ? $body['id'] : null;
            update_post_meta($partner_id, 'psp_hubspot_contact_id', $contact_id);
            return [ 'success' => true, 'contact_id' => $contact_id ];
        }

        return [ 'success' => false, 'error' => isset($body['message']) ? $body['message'] : 'Unknown error', 'code' => $code ];
    }

    // Sync ticket to HubSpot deal
    public static function sync_ticket($ticket_id) : array {
        if (!self::is_configured()) {
            return [ 'success' => false, 'error' => 'HubSpot not configured' ];
        }

        $opts = self::get_settings();
        $title = get_the_title($ticket_id);
        $partner_id = get_post_meta($ticket_id, 'psp_partner_id', true);
        $priority = get_post_meta($ticket_id, 'psp_priority', true);

        $properties = [
            'dealname' => $title,
            'dealstage' => 'appointmentscheduled',
            'ticket_id' => (string) $ticket_id,
            'ticket_priority' => $priority,
            'partner_id' => (string) $partner_id,
        ];

        $response = wp_remote_post(self::API_BASE . '/crm/v3/objects/deals', [
            'headers' => [
                'Authorization' => 'Bearer ' . $opts['api_key'],
                'Content-Type' => 'application/json',
            ],
            'body' => json_encode([ 'properties' => array_filter($properties) ]),
            'timeout' => 15,
        ]);

        if (is_wp_error($response)) {
            return [ 'success' => false, 'error' => $response->get_error_message() ];
        }

        $code = wp_remote_retrieve_response_code($response);
        $body = json_decode(wp_remote_retrieve_body($response), true);

        if ($code >= 200 && $code < 300) {
            $deal_id = isset($body['id']) ? $body['id'] : null;
            update_post_meta($ticket_id, 'psp_hubspot_deal_id', $deal_id);
            return [ 'success' => true, 'deal_id' => $deal_id ];
        }

        return [ 'success' => false, 'error' => isset($body['message']) ? $body['message'] : 'Unknown error', 'code' => $code ];
    }

    // REST routes
    public static function register_routes() : void {
        register_rest_route('poolsafe/v1', '/hubspot/status', [
            'methods' => 'GET',
            'permission_callback' => function(){ return current_user_can('administrator'); },
            'callback' => function(){
                return rest_ensure_response([
                    'configured' => self::is_configured(),
                    'settings' => self::get_settings(),
                ]);
            },
        ]);

        register_rest_route('poolsafe/v1', '/hubspot/sync/partner/(?P<id>\\d+)', [
            'methods' => 'POST',
            'permission_callback' => function(){ return current_user_can('administrator'); },
            'callback' => function($req){
                $result = self::sync_partner(intval($req['id']));
                return rest_ensure_response($result);
            },
        ]);

        register_rest_route('poolsafe/v1', '/hubspot/sync/ticket/(?P<id>\\d+)', [
            'methods' => 'POST',
            'permission_callback' => function(){ return current_user_can('administrator'); },
            'callback' => function($req){
                $result = self::sync_ticket(intval($req['id']));
                return rest_ensure_response($result);
            },
        ]);
    }
}
