<?php
/**
 * REST API namespace and routes
 */
if (!defined('ABSPATH')) { exit; }

class PSP_REST {
    public static function register_routes() : void {
        register_rest_route('poolsafe/v1', '/health', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => function() {
                return rest_ensure_response([ 'ok' => true, 'version' => PSP_VERSION ]);
            }
        ]);

        // UI Settings (branding colors) - support/admin can read & write
        register_rest_route('poolsafe/v1', '/ui-settings', [
            [
                'methods' => 'GET',
                'permission_callback' => function(){ return current_user_can('administrator') || current_user_can('psp_support'); },
                'callback' => function(){
                    $o = class_exists('PSP_Settings') ? PSP_Settings::get_settings() : [];
                    $out = [
                        'primary_color' => $o['primary_color'] ?? '#3b82f6',
                        'primary_hover_color' => $o['primary_hover_color'] ?? '#2563eb',
                        'lock_highlight_bg' => $o['lock_highlight_bg'] ?? '#fef3c7',
                        'lock_highlight_border' => $o['lock_highlight_border'] ?? '#fbbf24',
                    ];
                    return rest_ensure_response($out);
                }
            ],
            [
                'methods' => 'PUT',
                'permission_callback' => function(){ return current_user_can('administrator') || current_user_can('psp_support'); },
                'args' => [
                    'primary_color' => [ 'required' => false, 'type' => 'string' ],
                    'primary_hover_color' => [ 'required' => false, 'type' => 'string' ],
                    'lock_highlight_bg' => [ 'required' => false, 'type' => 'string' ],
                    'lock_highlight_border' => [ 'required' => false, 'type' => 'string' ],
                ],
                'callback' => function(WP_REST_Request $req){
                    if (!class_exists('PSP_Settings')) return new WP_Error('unavail', 'Settings unavailable', [ 'status' => 500 ]);
                    $opt = PSP_Settings::get_settings();
                    $fields = [ 'primary_color', 'primary_hover_color', 'lock_highlight_bg', 'lock_highlight_border' ];
                    foreach ($fields as $f){
                        if (isset($req[$f])) {
                            $hex = sanitize_hex_color($req[$f]);
                            if ($hex) { $opt[$f] = $hex; }
                        }
                    }
                    update_option(PSP_Settings::OPTION_KEY, PSP_Settings::sanitize($opt));
                    return rest_ensure_response([ 'ok' => true ]);
                }
            ],
        ]);

        // Tickets minimal routes (list/create) - Support/Admin only for create
        register_rest_route('poolsafe/v1', '/tickets', [
            [
                'methods' => 'GET',
                'permission_callback' => function() { return is_user_logged_in(); },
                'callback' => [ __CLASS__, 'list_tickets' ],
            ],
            [
                'methods' => 'POST',
                'permission_callback' => function() { return current_user_can('publish_psp_tickets'); },
                'callback' => [ __CLASS__, 'create_ticket' ],
                'args' => [
                    'title' => ['required' => true, 'type' => 'string'],
                    'content' => ['required' => false, 'type' => 'string'],
                    'partner_id' => ['required' => false, 'type' => 'integer'],
                    'priority' => ['required' => false, 'type' => 'string'],
                ],
            ],
        ]);

        // Partners map data (Support/Admin only)
        register_rest_route('poolsafe/v1', '/partners/map', [
            'methods' => 'GET',
            'permission_callback' => function() { return current_user_can('psp_support') || current_user_can('administrator'); },
            'callback' => [ __CLASS__, 'partners_map' ],
        ]);

        // Partners list with full details (support/admin only)
        register_rest_route('poolsafe/v1', '/partners', [
            'methods' => 'GET',
            'permission_callback' => function() { return current_user_can('psp_support') || current_user_can('administrator'); },
            'callback' => [ __CLASS__, 'list_partners' ],
        ]);

        // Current user's partner (no sensitive fields for non-support users)
        register_rest_route('poolsafe/v1', '/partners/me', [
            'methods' => 'GET',
            'permission_callback' => function() { return is_user_logged_in(); },
            'callback' => [ __CLASS__, 'get_my_partner' ],
        ]);

        // Lock info (restricted to support/admin)
        register_rest_route('poolsafe/v1', '/partners/(?P<id>\\d+)/lock-info', [
            [
                'methods' => 'GET',
                'permission_callback' => function(){ return current_user_can('administrator') || current_user_can('psp_support'); },
                'callback' => [ __CLASS__, 'get_lock_info' ],
            ],
            [
                'methods' => 'PUT',
                'permission_callback' => function(){ return current_user_can('administrator') || current_user_can('psp_support'); },
                'args' => [
                    'lock_make' => [ 'required' => false, 'type' => 'string' ],
                    'master_code' => [ 'required' => false, 'type' => 'string' ],
                    'sub_master_code' => [ 'required' => false, 'type' => 'string' ],
                    'lock_part' => [ 'required' => false, 'type' => 'string' ],
                    'key' => [ 'required' => false, 'type' => 'string' ],
                ],
                'callback' => [ __CLASS__, 'update_lock_info' ],
            ],
        ]);

        // Update coordinates (support/admin only)
        register_rest_route('poolsafe/v1', '/partners/(?P<id>\\d+)/coords', [
            'methods' => 'PUT',
            'permission_callback' => function(){ return current_user_can('administrator') || current_user_can('psp_support'); },
            'args' => [
                'latitude' => [ 'required' => true, 'type' => 'number' ],
                'longitude' => [ 'required' => true, 'type' => 'number' ],
            ],
            'callback' => [ __CLASS__, 'update_coords' ],
        ]);

        // Update partner (limited fields) - support/admin only
        register_rest_route('poolsafe/v1', '/partners/(?P<id>\\d+)', [
            'methods' => 'PUT',
            'permission_callback' => function(){ return current_user_can('administrator') || current_user_can('psp_support'); },
            'args' => [
                'top_colour' => [ 'required' => false, 'type' => 'string' ],
            ],
            'callback' => [ __CLASS__, 'update_partner' ],
        ]);

        // Import partner from CSV - support/admin only
        register_rest_route('poolsafe/v1', '/partners/import', [
            'methods' => 'POST',
            'permission_callback' => function(){ return current_user_can('administrator') || current_user_can('psp_support'); },
            'args' => [
                'company_name' => [ 'required' => true, 'type' => 'string' ],
                'management_company' => [ 'required' => false, 'type' => 'string' ],
                'phone' => [ 'required' => false, 'type' => 'string' ],
                'street_address' => [ 'required' => false, 'type' => 'string' ],
                'city' => [ 'required' => false, 'type' => 'string' ],
                'state' => [ 'required' => false, 'type' => 'string' ],
                'zip' => [ 'required' => false, 'type' => 'string' ],
                'country' => [ 'required' => false, 'type' => 'string' ],
                'units' => [ 'required' => false, 'type' => 'integer' ],
                'number' => [ 'required' => false, 'type' => 'string' ],
                'display_name' => [ 'required' => false, 'type' => 'string' ],
                'top_colour' => [ 'required' => false, 'type' => 'string' ],
                'lock_make' => [ 'required' => false, 'type' => 'string' ],
                'master_code' => [ 'required' => false, 'type' => 'string' ],
                'sub_master_code' => [ 'required' => false, 'type' => 'string' ],
                'lock_part' => [ 'required' => false, 'type' => 'string' ],
                'key' => [ 'required' => false, 'type' => 'string' ],
                'user_login' => [ 'required' => false, 'type' => 'string' ],
                'user_pass' => [ 'required' => false, 'type' => 'string' ],
            ],
            'callback' => [ __CLASS__, 'import_partner' ],
        ]);

        // =========================
        // User Management (Support/Admin only)
        // =========================
        register_rest_route('poolsafe/v1', '/users', [
            [
                'methods' => 'GET',
                'permission_callback' => function(){ return current_user_can('administrator') || current_user_can('psp_support'); },
                'args' => [
                    'role' => [ 'required' => false, 'type' => 'string' ],
                ],
                'callback' => [ __CLASS__, 'list_users' ],
            ],
            [
                'methods' => 'POST',
                'permission_callback' => function(){ return current_user_can('administrator') || current_user_can('psp_support'); },
                'args' => [
                    'email' => [ 'required' => true, 'type' => 'string' ],
                    'first_name' => [ 'required' => false, 'type' => 'string' ],
                    'last_name' => [ 'required' => false, 'type' => 'string' ],
                    'partner_id' => [ 'required' => false, 'type' => 'integer' ],
                    'role' => [ 'required' => false, 'type' => 'string' ],
                ],
                'callback' => [ __CLASS__, 'create_user' ],
            ],
        ]);

        register_rest_route('poolsafe/v1', '/users/(?P<id>\\d+)', [
            'methods' => 'PUT',
            'permission_callback' => function(){ return current_user_can('administrator') || current_user_can('psp_support'); },
            'args' => [
                'email' => [ 'required' => false, 'type' => 'string' ],
                'first_name' => [ 'required' => false, 'type' => 'string' ],
                'last_name' => [ 'required' => false, 'type' => 'string' ],
                'partner_id' => [ 'required' => false, 'type' => 'integer' ],
                'reset_password' => [ 'required' => false, 'type' => 'boolean' ],
            ],
            'callback' => [ __CLASS__, 'update_user' ],
        ]);

        // =========================
        // Partner Contacts (Support/Admin only - reference data)
        // =========================
        register_rest_route('poolsafe/v1', '/partners/(?P<id>\\d+)/contacts', [
            [
                'methods' => 'GET',
                'permission_callback' => function(){ return current_user_can('administrator') || current_user_can('psp_support'); },
                'callback' => [ __CLASS__, 'get_partner_contacts' ],
            ],
            [
                'methods' => 'POST',
                'permission_callback' => function(){ return current_user_can('administrator') || current_user_can('psp_support'); },
                'args' => [
                    'name' => [ 'required' => true, 'type' => 'string' ],
                    'role' => [ 'required' => false, 'type' => 'string' ], // GM, Ops, IT, etc.
                    'email' => [ 'required' => true, 'type' => 'string' ],
                    'phone' => [ 'required' => false, 'type' => 'string' ],
                    'is_primary' => [ 'required' => false, 'type' => 'boolean' ],
                ],
                'callback' => [ __CLASS__, 'create_partner_contact' ],
            ],
        ]);

        register_rest_route('poolsafe/v1', '/partners/(?P<partner_id>\\d+)/contacts/(?P<contact_id>\\d+)', [
            [
                'methods' => 'PUT',
                'permission_callback' => function(){ return current_user_can('administrator') || current_user_can('psp_support'); },
                'args' => [
                    'name' => [ 'required' => false, 'type' => 'string' ],
                    'role' => [ 'required' => false, 'type' => 'string' ],
                    'email' => [ 'required' => false, 'type' => 'string' ],
                    'phone' => [ 'required' => false, 'type' => 'string' ],
                    'is_primary' => [ 'required' => false, 'type' => 'boolean' ],
                ],
                'callback' => [ __CLASS__, 'update_partner_contact' ],
            ],
            [
                'methods' => 'DELETE',
                'permission_callback' => function(){ return current_user_can('administrator') || current_user_can('psp_support'); },
                'callback' => [ __CLASS__, 'delete_partner_contact' ],
            ],
        ]);

        // =========================
        // Company Users (authorized login accounts)
        // =========================
        register_rest_route('poolsafe/v1', '/partners/(?P<id>\\d+)/company-users', [
            'methods' => 'GET',
            'permission_callback' => function(){ return current_user_can('administrator') || current_user_can('psp_support'); },
            'callback' => [ __CLASS__, 'list_company_users' ],
        ]);

        register_rest_route('poolsafe/v1', '/partners/(?P<id>\\d+)/company-users/link', [
            'methods' => 'POST',
            'permission_callback' => function(){ return current_user_can('administrator') || current_user_can('psp_support'); },
            'args' => [
                'user_id' => [ 'required' => true, 'type' => 'integer' ],
            ],
            'callback' => [ __CLASS__, 'link_company_user' ],
        ]);

        register_rest_route('poolsafe/v1', '/partners/(?P<id>\\d+)/company-users/primary', [
            'methods' => 'PATCH',
            'permission_callback' => function(){ return current_user_can('administrator') || current_user_can('psp_support'); },
            'args' => [
                'user_id' => [ 'required' => true, 'type' => 'integer' ],
            ],
            'callback' => [ __CLASS__, 'set_primary_company_user' ],
        ]);

        // User notification preferences
        register_rest_route('poolsafe/v1', '/users/(?P<id>\\d+)/notification-prefs', [
            [
                'methods' => 'GET',
                'permission_callback' => function(WP_REST_Request $r){
                    $uid = intval($r['id']);
                    return get_current_user_id() === $uid || current_user_can('administrator') || current_user_can('psp_support');
                },
                'callback' => [ __CLASS__, 'get_user_notification_prefs' ],
            ],
            [
                'methods' => 'PATCH',
                'permission_callback' => function(WP_REST_Request $r){
                    $uid = intval($r['id']);
                    return get_current_user_id() === $uid || current_user_can('administrator') || current_user_can('psp_support');
                },
                'args' => [
                    'enabled' => [ 'required' => false, 'type' => 'boolean' ],
                    'categories' => [ 'required' => false ],
                    'channels' => [ 'required' => false ],
                ],
                'callback' => [ __CLASS__, 'update_user_notification_prefs' ],
            ],
        ]);
    }

    public static function list_tickets(WP_REST_Request $req) {
        $args = [
            'post_type' => 'psp_ticket',
            'posts_per_page' => 50,
            'post_status' => 'any',
        ];
        
        // Role-based filtering: partners only see their own tickets
        $user_id = get_current_user_id();
        $is_partner = !current_user_can('psp_support') && !current_user_can('administrator');
        if ($is_partner) {
            $args['author'] = $user_id;
        }

        // Support/Admin can filter by partner_id for profile view
        $partner_filter = intval($req->get_param('partner_id'));
        if ($partner_filter && !$is_partner) {
            $args['meta_query'] = [
                [ 'key' => 'psp_partner_id', 'value' => $partner_filter, 'compare' => '=' ]
            ];
        }
        
        $q = new WP_Query($args);
        $data = [];
        foreach ($q->posts as $p) {
            $data[] = [
                'id' => $p->ID,
                'title' => get_the_title($p),
                'status' => get_post_meta($p->ID, 'psp_status', true),
                'priority' => get_post_meta($p->ID, 'psp_priority', true),
                'partner_id' => intval(get_post_meta($p->ID, 'psp_partner_id', true)),
                'date' => get_post_time('c', true, $p),
                'firstName' => get_post_meta($p->ID, 'psp_first_name', true),
                'lastName' => get_post_meta($p->ID, 'psp_last_name', true),
                'position' => get_post_meta($p->ID, 'psp_position', true),
                'contactEmail' => get_post_meta($p->ID, 'psp_contact_email', true),
                'contactNumber' => get_post_meta($p->ID, 'psp_contact_number', true),
                'unitsAffected' => get_post_meta($p->ID, 'psp_units_affected', true),
                'category' => get_post_meta($p->ID, 'psp_category', true),
                'severity' => get_post_meta($p->ID, 'psp_severity', true),
                'videoLink' => get_post_meta($p->ID, 'psp_video_link', true),
                'resortName' => get_post_meta($p->ID, 'psp_resort_name', true),
                // snake_case aliases
                'first_name' => get_post_meta($p->ID, 'psp_first_name', true),
                'last_name' => get_post_meta($p->ID, 'psp_last_name', true),
                'contact_email' => get_post_meta($p->ID, 'psp_contact_email', true),
                'contact_number' => get_post_meta($p->ID, 'psp_contact_number', true),
                'units_affected' => get_post_meta($p->ID, 'psp_units_affected', true),
                'video_link' => get_post_meta($p->ID, 'psp_video_link', true),
                'resort_name' => get_post_meta($p->ID, 'psp_resort_name', true),
            ];
        }
        return rest_ensure_response($data);
    }

    public static function create_ticket(WP_REST_Request $req) {
        $current_user = wp_get_current_user();
        
        $post_id = wp_insert_post([
            'post_type' => 'psp_ticket',
            'post_title' => sanitize_text_field($req['title']),
            'post_content' => wp_kses_post($req['content'] ?? ''),
            'post_status' => 'publish',
            'post_author' => $current_user->ID,
        ]);
        if (is_wp_error($post_id)) {
            return $post_id;
        }
        
        // Auto-detect partner from logged-in user (portal submission)
        $partner_id = isset($req['partner_id']) ? intval($req['partner_id']) : null;
        
        if (!$partner_id && $current_user && $current_user->ID) {
            // Get partner_id from user meta
            $user_partner_id = intval(get_user_meta($current_user->ID, 'psp_partner_id', true));
            
            if (!$user_partner_id) {
                // Try matching by email to partner company_email
                $args = [
                    'post_type' => 'psp_partner',
                    'posts_per_page' => 1,
                    'meta_query' => [
                        ['key' => 'psp_company_email', 'value' => $current_user->user_email, 'compare' => '=']
                    ],
                ];
                $partner_query = new WP_Query($args);
                if ($partner_query->posts) {
                    $user_partner_id = $partner_query->posts[0]->ID;
                }
            }
            
            if ($user_partner_id) {
                $partner_id = $user_partner_id;
            }
        }
        
        // Save meta fields
        if (isset($req['priority'])) update_post_meta($post_id, 'psp_priority', sanitize_text_field($req['priority']));
        if ($partner_id) update_post_meta($post_id, 'psp_partner_id', $partner_id);
        
        // Track submission source and email thread info
        update_post_meta($post_id, 'psp_source', sanitize_text_field($req['source'] ?? 'portal'));
        update_post_meta($post_id, 'psp_sender_email', $current_user->user_email ?? '');
        update_post_meta($post_id, 'psp_sender_name', $current_user->display_name ?? '');
        update_post_meta($post_id, 'psp_response_count', 0);
        
        // Generate unique thread ID for email tracking
        $thread_id = 'ticket-' . $post_id . '-' . substr(md5($post_id . time()), 0, 8);
        update_post_meta($post_id, 'psp_thread_id', $thread_id);

        // Save contact information
        if (isset($req['first_name'])) update_post_meta($post_id, 'psp_first_name', sanitize_text_field($req['first_name']));
        if (isset($req['last_name'])) update_post_meta($post_id, 'psp_last_name', sanitize_text_field($req['last_name']));
        if (isset($req['position'])) update_post_meta($post_id, 'psp_position', sanitize_text_field($req['position']));
        if (isset($req['contact_email'])) update_post_meta($post_id, 'psp_contact_email', sanitize_email($req['contact_email']));
        if (isset($req['contact_number'])) update_post_meta($post_id, 'psp_contact_number', sanitize_text_field($req['contact_number']));
        if (isset($req['units_affected'])) update_post_meta($post_id, 'psp_units_affected', sanitize_text_field($req['units_affected']));

            // Save enhanced ticket fields
            if (isset($req['category'])) update_post_meta($post_id, 'psp_category', sanitize_text_field($req['category']));
            if (isset($req['severity'])) update_post_meta($post_id, 'psp_severity', sanitize_text_field($req['severity']));
            if (isset($req['video_link'])) update_post_meta($post_id, 'psp_video_link', esc_url_raw($req['video_link']));
            if (isset($req['resort_name'])) update_post_meta($post_id, 'psp_resort_name', sanitize_text_field($req['resort_name']));

        return rest_ensure_response([ 'id' => $post_id ]);
    }

    public static function partners_map(WP_REST_Request $req) {
        $args = [
            'post_type' => 'psp_partner',
            'posts_per_page' => -1,
            'post_status' => 'any',
        ];
        $q = new WP_Query($args);
        $data = [];
        foreach ($q->posts as $p) {
            $lat = floatval(get_post_meta($p->ID, 'psp_latitude', true));
            $lng = floatval(get_post_meta($p->ID, 'psp_longitude', true));
            $data[] = [
                'id' => $p->ID,
                'companyName' => get_the_title($p),
                // snake_case alias for clients adopting new naming style
                'company_name' => get_the_title($p),
                'latitude' => $lat,
                'longitude' => $lng,
                'openTicketCount' => 0, // future: compute via queries
            ];
        }
        return rest_ensure_response($data);
    }

    public static function list_partners(WP_REST_Request $req) {
        $args = [
            'post_type' => 'psp_partner',
            'posts_per_page' => -1,
            'post_status' => 'any',
            'orderby' => 'title',
            'order' => 'ASC',
        ];
        $q = new WP_Query($args);
        $data = [];
        foreach ($q->posts as $p) {
            $units = get_post_meta($p->ID, 'psp_units', true);
            if ($units === '' || $units === null) {
                $units = get_post_meta($p->ID, 'psp_number_of_lounge_units', true);
            }
            $units = intval($units);
            $data[] = [
                'id' => $p->ID,
                'companyName' => get_post_meta($p->ID, 'psp_company_name', true) ?: get_the_title($p),
                'managementCompany' => get_post_meta($p->ID, 'psp_management_company', true),
                'displayName' => get_the_title($p),
                'streetAddress' => get_post_meta($p->ID, 'psp_street_address', true),
                'city' => get_post_meta($p->ID, 'psp_city', true),
                'state' => get_post_meta($p->ID, 'psp_state', true),
                'zip' => get_post_meta($p->ID, 'psp_zip', true),
                'country' => get_post_meta($p->ID, 'psp_country', true),
                'numberOfLoungeUnits' => intval(get_post_meta($p->ID, 'psp_number_of_lounge_units', true)),
                'units' => $units, // new preferred field name
                'topColour' => get_post_meta($p->ID, 'psp_top_colour', true),
                'phone' => get_post_meta($p->ID, 'psp_phone', true) ?: get_post_meta($p->ID, 'psp_phone_number', true),
                'latitude' => floatval(get_post_meta($p->ID, 'psp_latitude', true)),
                'longitude' => floatval(get_post_meta($p->ID, 'psp_longitude', true)),
                'hasFbCallButton' => (bool) get_post_meta($p->ID, 'psp_has_fb_call_button', true),
                'hasUsbCharging' => (bool) get_post_meta($p->ID, 'psp_has_usb_charging', true),
                'hasSafeLock' => (bool) get_post_meta($p->ID, 'psp_has_safe_lock', true),
                'companyEmail' => get_post_meta($p->ID, 'psp_company_email', true),
                'phoneNumber' => get_post_meta($p->ID, 'psp_phone_number', true),
                // Installation & Operation
                'installationDate' => get_post_meta($p->ID, 'psp_installation_date', true),
                'operationType' => get_post_meta($p->ID, 'psp_operation_type', true),
                'seasonalOpenDate' => get_post_meta($p->ID, 'psp_seasonal_open_date', true),
                'seasonalCloseDate' => get_post_meta($p->ID, 'psp_seasonal_close_date', true),
                'isActive' => (bool) get_post_meta($p->ID, 'psp_is_active', true),
                // snake_case aliases (non-breaking):
                'company_name' => get_post_meta($p->ID, 'psp_company_name', true) ?: get_the_title($p),
                'management_company' => get_post_meta($p->ID, 'psp_management_company', true),
                'display_name' => get_the_title($p),
                'street_address' => get_post_meta($p->ID, 'psp_street_address', true),
                'company_email' => get_post_meta($p->ID, 'psp_company_email', true),
                'phone_number' => get_post_meta($p->ID, 'psp_phone_number', true),
                'installation_date' => get_post_meta($p->ID, 'psp_installation_date', true),
                'operation_type' => get_post_meta($p->ID, 'psp_operation_type', true),
                'seasonal_open_date' => get_post_meta($p->ID, 'psp_seasonal_open_date', true),
                'seasonal_close_date' => get_post_meta($p->ID, 'psp_seasonal_close_date', true),
                'is_active' => (bool) get_post_meta($p->ID, 'psp_is_active', true),
                // Lock details (safe to expose here because this endpoint is support/admin only)
                'lockMake' => get_post_meta($p->ID, 'psp_lock_make', true),
                'masterCode' => get_post_meta($p->ID, 'psp_master_code', true),
                'subMasterCode' => get_post_meta($p->ID, 'psp_sub_master_code', true),
                'lockPart' => get_post_meta($p->ID, 'psp_lock_part', true),
                'key' => get_post_meta($p->ID, 'psp_key', true),
                // snake_case lock aliases as well
                'lock_make' => get_post_meta($p->ID, 'psp_lock_make', true),
                'master_code' => get_post_meta($p->ID, 'psp_master_code', true),
                'sub_master_code' => get_post_meta($p->ID, 'psp_sub_master_code', true),
                'lock_part' => get_post_meta($p->ID, 'psp_lock_part', true),
            ];
        }
        return rest_ensure_response($data);
    }

    public static function get_lock_info(WP_REST_Request $req){
        $pid = intval($req['id']);
        $fields = [ 'lock_make','master_code','sub_master_code','lock_part','key' ];
        $out = [];
        foreach ($fields as $f){
            $out[$f] = get_post_meta($pid, 'psp_'.$f, true);
        }
        return rest_ensure_response($out);
    }

    public static function update_lock_info(WP_REST_Request $req){
        $pid = intval($req['id']);
        $fields = [ 'lock_make','master_code','sub_master_code','lock_part','key' ];
        foreach ($fields as $f){
            if (isset($req[$f])) update_post_meta($pid, 'psp_'.$f, sanitize_text_field($req[$f]));
        }
        return rest_ensure_response([ 'ok' => true ]);
    }

    public static function update_coords(WP_REST_Request $req){
        $pid = intval($req['id']);
        $lat = floatval($req['latitude']);
        $lng = floatval($req['longitude']);
        update_post_meta($pid, 'psp_latitude', $lat);
        update_post_meta($pid, 'psp_longitude', $lng);
        return rest_ensure_response([ 'ok' => true, 'latitude' => $lat, 'longitude' => $lng ]);
    }

    public static function update_partner(WP_REST_Request $req){
        $pid = intval($req['id']);
        if (isset($req['top_colour'])) {
            update_post_meta($pid, 'psp_top_colour', sanitize_text_field($req['top_colour']));
        }
        return rest_ensure_response([ 'ok' => true ]);
    }

    public static function get_my_partner(WP_REST_Request $req){
        $user = wp_get_current_user();
        if (!$user || !$user->ID) return new WP_Error('unauth', 'Unauthorized', [ 'status' => 401 ]);
        $pid = intval(get_user_meta($user->ID, 'psp_partner_id', true));

        $partner_post = null;
        if ($pid){
            $partner_post = get_post($pid);
        }
        if (!$partner_post){
            // Try matching by company email
            $args = [
                'post_type' => 'psp_partner',
                'posts_per_page' => 1,
                'meta_query' => [
                    [ 'key' => 'psp_company_email', 'value' => $user->user_email, 'compare' => '=' ],
                ],
            ];
            $q = new WP_Query($args);
            if ($q->posts){ $partner_post = $q->posts[0]; }
        }
        if (!$partner_post){
            return rest_ensure_response(null);
        }

        $is_support = current_user_can('administrator') || current_user_can('psp_support');
        $units = get_post_meta($partner_post->ID, 'psp_units', true);
        if ($units === '' || $units === null) {
            $units = get_post_meta($partner_post->ID, 'psp_number_of_lounge_units', true);
        }
        $units = intval($units);
        $data = [
            'id' => $partner_post->ID,
            'companyName' => get_post_meta($partner_post->ID, 'psp_company_name', true) ?: get_the_title($partner_post),
            'managementCompany' => get_post_meta($partner_post->ID, 'psp_management_company', true),
            'displayName' => get_the_title($partner_post),
            'streetAddress' => get_post_meta($partner_post->ID, 'psp_street_address', true),
            'city' => get_post_meta($partner_post->ID, 'psp_city', true),
            'state' => get_post_meta($partner_post->ID, 'psp_state', true),
            'zip' => get_post_meta($partner_post->ID, 'psp_zip', true),
            'country' => get_post_meta($partner_post->ID, 'psp_country', true),
            'numberOfLoungeUnits' => intval(get_post_meta($partner_post->ID, 'psp_number_of_lounge_units', true)),
            'units' => $units,
            'topColour' => get_post_meta($partner_post->ID, 'psp_top_colour', true),
            'latitude' => floatval(get_post_meta($partner_post->ID, 'psp_latitude', true)),
            'longitude' => floatval(get_post_meta($partner_post->ID, 'psp_longitude', true)),
            'hasFbCallButton' => (bool) get_post_meta($partner_post->ID, 'psp_has_fb_call_button', true),
            'hasUsbCharging' => (bool) get_post_meta($partner_post->ID, 'psp_has_usb_charging', true),
            'hasSafeLock' => (bool) get_post_meta($partner_post->ID, 'psp_has_safe_lock', true),
            'companyEmail' => get_post_meta($partner_post->ID, 'psp_company_email', true),
            'phoneNumber' => get_post_meta($partner_post->ID, 'psp_phone_number', true),
            // snake_case aliases
            'company_name' => get_post_meta($partner_post->ID, 'psp_company_name', true) ?: get_the_title($partner_post),
            'management_company' => get_post_meta($partner_post->ID, 'psp_management_company', true),
            'display_name' => get_the_title($partner_post),
            'street_address' => get_post_meta($partner_post->ID, 'psp_street_address', true),
            'company_email' => get_post_meta($partner_post->ID, 'psp_company_email', true),
            'phone_number' => get_post_meta($partner_post->ID, 'psp_phone_number', true),
        ];
        if ($is_support){
            $data['lockMake'] = get_post_meta($partner_post->ID, 'psp_lock_make', true);
            $data['masterCode'] = get_post_meta($partner_post->ID, 'psp_master_code', true);
            $data['subMasterCode'] = get_post_meta($partner_post->ID, 'psp_sub_master_code', true);
            $data['lockPart'] = get_post_meta($partner_post->ID, 'psp_lock_part', true);
            $data['key'] = get_post_meta($partner_post->ID, 'psp_key', true);
        }
        return rest_ensure_response($data);
    }

    // =========================
    // User Management Handlers
    // =========================
    public static function list_users(WP_REST_Request $req){
        $role = sanitize_text_field($req['role'] ?? '');
        $args = [
            'number' => 100,
            'orderby' => 'display_name',
            'order' => 'ASC',
        ];
        if ($role){ $args['role'] = $role; }
        $q = new WP_User_Query($args);
        $data = [];
        foreach ($q->get_results() as $u){
            $data[] = [
                'id' => $u->ID,
                'email' => $u->user_email,
                'username' => $u->user_login,
                'displayName' => $u->display_name,
                'firstName' => get_user_meta($u->ID, 'first_name', true),
                'lastName' => get_user_meta($u->ID, 'last_name', true),
                'partnerId' => intval(get_user_meta($u->ID, 'psp_partner_id', true)),
                'roles' => $u->roles,
            ];
        }
        return rest_ensure_response($data);
    }

    public static function create_user(WP_REST_Request $req){
        $email = sanitize_email($req['email']);
        if (empty($email) || !is_email($email)){
            return new WP_Error('invalid_email', 'Invalid email address', [ 'status' => 400 ]);
        }
        if (email_exists($email)){
            return new WP_Error('email_exists', 'Email already registered', [ 'status' => 409 ]);
        }
        $first = sanitize_text_field($req['first_name'] ?? '');
        $last = sanitize_text_field($req['last_name'] ?? '');
        $partner_id = intval($req['partner_id'] ?? 0);
        $role = sanitize_text_field($req['role'] ?? PSP_Roles::ROLE_PARTNER);
        if (!in_array($role, [PSP_Roles::ROLE_PARTNER, PSP_Roles::ROLE_SUPPORT])){
            $role = PSP_Roles::ROLE_PARTNER; // enforce allowed roles
        }
        // Generate username from email local part
        $local = strstr($email, '@', true);
        $base = sanitize_user($local, true);
        if (!$base){ $base = 'user'; }
        $username = $base;
        $i = 1;
        while (username_exists($username)){
            $username = $base . $i;
            $i++;
        }
        $password = wp_generate_password(12, true);
        $user_id = wp_insert_user([
            'user_login' => $username,
            'user_pass' => $password,
            'user_email' => $email,
            'first_name' => $first,
            'last_name' => $last,
            'display_name' => trim($first.' '.$last) ?: $username,
            'role' => $role,
        ]);
        if (is_wp_error($user_id)) return $user_id;
        if ($partner_id){ update_user_meta($user_id, 'psp_partner_id', $partner_id); }

        // Send welcome email
        $subject = __('Your Pool Safe Portal Account', 'psp');
        $message = sprintf("Welcome to the Pool Safe Portal!\n\nUsername: %s\nTemporary Password: %s\nLogin URL: %s\n\nPlease sign in and change your password.", $username, $password, wp_login_url());
        wp_mail($email, $subject, $message);

        return rest_ensure_response([
            'id' => $user_id,
            'email' => $email,
            'username' => $username,
            'password_generated' => $password, // shown once in response
            'partnerId' => $partner_id,
            'role' => $role,
        ]);
    }

    public static function update_user(WP_REST_Request $req){
        $uid = intval($req['id']);
        $u = get_user_by('id', $uid);
        if (!$u) return new WP_Error('not_found', 'User not found', [ 'status' => 404 ]);
        $update = [ 'ID' => $uid ];
        if (isset($req['email'])){
            $email = sanitize_email($req['email']);
            if ($email && is_email($email) && $email !== $u->user_email){
                if (email_exists($email)) return new WP_Error('email_exists', 'Email already registered', [ 'status' => 409 ]);
                $update['user_email'] = $email;
            }
        }
        if (isset($req['first_name'])) $update['first_name'] = sanitize_text_field($req['first_name']);
        if (isset($req['last_name'])) $update['last_name'] = sanitize_text_field($req['last_name']);
        $reset_pass = isset($req['reset_password']) ? (bool)$req['reset_password'] : false;
        $new_password = '';
        if ($reset_pass){
            $new_password = wp_generate_password(12, true);
            $update['user_pass'] = $new_password;
        }
        $res = wp_update_user($update);
        if (is_wp_error($res)) return $res;
        if (isset($req['partner_id'])) update_user_meta($uid, 'psp_partner_id', intval($req['partner_id']));
        if ($reset_pass){
            $subject = __('Your Pool Safe Portal Password Reset', 'psp');
            $message = sprintf("Your password has been reset.\n\nUsername: %s\nNew Password: %s\nLogin URL: %s", $u->user_login, $new_password, wp_login_url());
            wp_mail($update['user_email'] ?? $u->user_email, $subject, $message);
        }
        return rest_ensure_response([
            'id' => $uid,
            'email' => $update['user_email'] ?? $u->user_email,
            'username' => $u->user_login,
            'firstName' => get_user_meta($uid, 'first_name', true),
            'lastName' => get_user_meta($uid, 'last_name', true),
            'partnerId' => intval(get_user_meta($uid, 'psp_partner_id', true)),
            'password_reset' => $reset_pass,
        ]);
    }

    // =========================
    // Partner Contacts Management
    // =========================
    public static function get_partner_contacts(WP_REST_Request $req){
        $partner_id = intval($req['id']);
        $partner = get_post($partner_id);
        if (!$partner || $partner->post_type !== 'psp_partner') {
            return new WP_Error('not_found', 'Partner not found', [ 'status' => 404 ]);
        }

        $contacts = get_post_meta($partner_id, 'psp_contacts', true);
        if (!is_array($contacts)) $contacts = [];

        return rest_ensure_response($contacts);
    }

    public static function create_partner_contact(WP_REST_Request $req){
        $partner_id = intval($req['id']);
        $partner = get_post($partner_id);
        if (!$partner || $partner->post_type !== 'psp_partner') {
            return new WP_Error('not_found', 'Partner not found', [ 'status' => 404 ]);
        }

        $contacts = get_post_meta($partner_id, 'psp_contacts', true);
        if (!is_array($contacts)) $contacts = [];

        $is_primary = isset($req['is_primary']) ? (bool)$req['is_primary'] : false;
        
        // If setting as primary, unmark all others
        if ($is_primary) {
            foreach ($contacts as &$c) {
                $c['is_primary'] = false;
            }
            unset($c);
        }

        // If this is the first contact, make it primary
        if (empty($contacts)) {
            $is_primary = true;
        }

        $new_contact = [
            'id' => uniqid('contact_', true),
            'name' => sanitize_text_field($req['name']),
            'role' => sanitize_text_field($req['role'] ?? ''),
            'email' => sanitize_email($req['email']),
            'phone' => sanitize_text_field($req['phone'] ?? ''),
            'is_primary' => $is_primary,
            'created_at' => current_time('mysql'),
        ];

        $contacts[] = $new_contact;
        update_post_meta($partner_id, 'psp_contacts', $contacts);

        return rest_ensure_response($new_contact);
    }

    public static function update_partner_contact(WP_REST_Request $req){
        $partner_id = intval($req['partner_id']);
        $contact_id = sanitize_text_field($req['contact_id']);
        
        $partner = get_post($partner_id);
        if (!$partner || $partner->post_type !== 'psp_partner') {
            return new WP_Error('not_found', 'Partner not found', [ 'status' => 404 ]);
        }

        $contacts = get_post_meta($partner_id, 'psp_contacts', true);
        if (!is_array($contacts)) $contacts = [];

        $found = false;
        foreach ($contacts as &$c) {
            if ($c['id'] === $contact_id) {
                $found = true;
                if (isset($req['name'])) $c['name'] = sanitize_text_field($req['name']);
                if (isset($req['role'])) $c['role'] = sanitize_text_field($req['role']);
                if (isset($req['email'])) $c['email'] = sanitize_email($req['email']);
                if (isset($req['phone'])) $c['phone'] = sanitize_text_field($req['phone']);
                
                // If setting as primary, unmark all others
                if (isset($req['is_primary']) && $req['is_primary']) {
                    foreach ($contacts as &$other) {
                        $other['is_primary'] = false;
                    }
                    unset($other);
                    $c['is_primary'] = true;
                }
                
                $updated = $c;
                break;
            }
        }
        unset($c);

        if (!$found) {
            return new WP_Error('not_found', 'Contact not found', [ 'status' => 404 ]);
        }

        update_post_meta($partner_id, 'psp_contacts', $contacts);
        return rest_ensure_response($updated);
    }

    public static function delete_partner_contact(WP_REST_Request $req){
        $partner_id = intval($req['partner_id']);
        $contact_id = sanitize_text_field($req['contact_id']);
        
        $partner = get_post($partner_id);
        if (!$partner || $partner->post_type !== 'psp_partner') {
            return new WP_Error('not_found', 'Partner not found', [ 'status' => 404 ]);
        }

        $contacts = get_post_meta($partner_id, 'psp_contacts', true);
        if (!is_array($contacts)) $contacts = [];

        $was_primary = false;
        $filtered = [];
        foreach ($contacts as $c) {
            if ($c['id'] === $contact_id) {
                $was_primary = $c['is_primary'] ?? false;
                continue; // Skip this contact (delete it)
            }
            $filtered[] = $c;
        }

        // If we deleted the primary contact, make the first remaining one primary
        if ($was_primary && !empty($filtered)) {
            $filtered[0]['is_primary'] = true;
        }

        update_post_meta($partner_id, 'psp_contacts', $filtered);
        return rest_ensure_response([ 'deleted' => true ]);
    }

    public static function import_partner(WP_REST_Request $req){
        $company_name = sanitize_text_field($req['company_name']);
        
        if (!$company_name) {
            return new WP_Error('missing_data', 'Company name is required', [ 'status' => 400 ]);
        }
        
        // Check if partner already exists by company name
        $existing = get_posts([
            'post_type' => 'psp_partner',
            'title' => $company_name,
            'posts_per_page' => 1
        ]);
        
        if (!empty($existing)) {
            return new WP_Error('duplicate', 'Partner with this company name already exists', [ 'status' => 409 ]);
        }
        
        // Use display_name if provided, otherwise use company_name
        $title = !empty($req['display_name']) ? sanitize_text_field($req['display_name']) : $company_name;
        
        // Create partner post
        $post_id = wp_insert_post([
            'post_title' => $title,
            'post_type' => 'psp_partner',
            'post_status' => 'publish',
        ]);
        
        if (is_wp_error($post_id)) {
            return $post_id;
        }
        
        // Save all meta fields (18 fields from CSV)
        update_post_meta($post_id, 'psp_company_name', $company_name);
        update_post_meta($post_id, 'psp_management_company', sanitize_text_field($req['management_company'] ?? ''));
        update_post_meta($post_id, 'psp_phone', sanitize_text_field($req['phone'] ?? ''));
        update_post_meta($post_id, 'psp_street_address', sanitize_text_field($req['street_address'] ?? ''));
        update_post_meta($post_id, 'psp_city', sanitize_text_field($req['city'] ?? ''));
        update_post_meta($post_id, 'psp_state', sanitize_text_field($req['state'] ?? ''));
        update_post_meta($post_id, 'psp_zip', sanitize_text_field($req['zip'] ?? ''));
        update_post_meta($post_id, 'psp_country', sanitize_text_field($req['country'] ?? ''));
        update_post_meta($post_id, 'psp_units', intval($req['units'] ?? 0));
        update_post_meta($post_id, 'psp_number_of_lounge_units', intval($req['units'] ?? 0)); // backward compat
        update_post_meta($post_id, 'psp_top_colour', sanitize_text_field($req['top_colour'] ?? ''));
        
        // Lock fields (support-only meta)
        if (!empty($req['lock_make'])) update_post_meta($post_id, 'psp_lock_make', sanitize_text_field($req['lock_make']));
        if (!empty($req['master_code'])) update_post_meta($post_id, 'psp_master_code', sanitize_text_field($req['master_code']));
        if (!empty($req['sub_master_code'])) update_post_meta($post_id, 'psp_sub_master_code', sanitize_text_field($req['sub_master_code']));
        if (!empty($req['lock_part'])) update_post_meta($post_id, 'psp_lock_part', sanitize_text_field($req['lock_part']));
        if (!empty($req['key'])) update_post_meta($post_id, 'psp_key', sanitize_text_field($req['key']));
        
        // Number field (partner identifier)
        if (!empty($req['number'])) update_post_meta($post_id, 'psp_number', sanitize_text_field($req['number']));
        
        // Create WordPress user account if credentials provided
        $user_id = null;
        if (!empty($req['user_login']) && !empty($req['user_pass'])) {
            $user_login = sanitize_user($req['user_login']);
            $user_pass = $req['user_pass']; // Don't sanitize password
            
            // Check if username already exists
            if (!username_exists($user_login)) {
                $user_id = wp_create_user($user_login, $user_pass, $user_login . '@temp.local');
                
                if (!is_wp_error($user_id)) {
                    // Set partner role and link to this partner
                    $user = get_user_by('id', $user_id);
                    $user->set_role('psp_partner');
                    update_user_meta($user_id, 'psp_partner_id', $post_id);
                }
            }
        }
        
        return rest_ensure_response([
            'id' => $post_id,
            'company_name' => $company_name,
            'user_id' => $user_id,
            'success' => true
        ]);
    }

    // =========================
    // Company Users & Notification Prefs Handlers
    // =========================
    public static function list_company_users(WP_REST_Request $req){
        $partner_id = intval($req['id']);
        $partner = get_post($partner_id);
        if (!$partner || $partner->post_type !== 'psp_partner') {
            return new WP_Error('not_found', 'Partner not found', [ 'status' => 404 ]);
        }
        if (!class_exists('PSP_Company_Users')) return new WP_Error('missing', 'Company users module not loaded', [ 'status' => 500 ]);
        $users = PSP_Company_Users::get_partner_users($partner_id);
        $primary = PSP_Company_Users::get_primary($partner_id);
        $out = [];
        foreach ($users as $u) {
            $prefs = PSP_Company_Users::get_user_notify_prefs($u->ID);
            $out[] = [
                'id' => $u->ID,
                'email' => $u->user_email,
                'displayName' => $u->display_name,
                'firstName' => get_user_meta($u->ID, 'first_name', true),
                'lastName' => get_user_meta($u->ID, 'last_name', true),
                'isPrimary' => $u->ID === $primary,
                'notifyEnabled' => $prefs['enabled'],
                'notifyCategories' => $prefs['categories'],
                'notifyChannels' => $prefs['channels'],
            ];
        }
        return rest_ensure_response($out);
    }

    public static function link_company_user(WP_REST_Request $req){
        $partner_id = intval($req['id']);
        $user_id = intval($req['user_id']);
        if (!get_user_by('ID', $user_id)) return new WP_Error('user_not_found', 'User not found', [ 'status' => 404 ]);
        $partner = get_post($partner_id);
        if (!$partner || $partner->post_type !== 'psp_partner') return new WP_Error('partner_not_found', 'Partner not found', [ 'status' => 404 ]);
        if (!class_exists('PSP_Company_Users')) return new WP_Error('missing', 'Company users module not loaded', [ 'status' => 500 ]);
        $ok = PSP_Company_Users::link_user($partner_id, $user_id);
        if (!$ok) return new WP_Error('link_failed', 'Could not link user', [ 'status' => 500 ]);
        return rest_ensure_response([ 'linked' => true ]);
    }

    public static function set_primary_company_user(WP_REST_Request $req){
        $partner_id = intval($req['id']);
        $user_id = intval($req['user_id']);
        $partner = get_post($partner_id);
        if (!$partner || $partner->post_type !== 'psp_partner') return new WP_Error('partner_not_found', 'Partner not found', [ 'status' => 404 ]);
        if (!get_user_by('ID', $user_id)) return new WP_Error('user_not_found', 'User not found', [ 'status' => 404 ]);
        if (!class_exists('PSP_Company_Users')) return new WP_Error('missing', 'Company users module not loaded', [ 'status' => 500 ]);
        $ok = PSP_Company_Users::set_primary($partner_id, $user_id);
        if (!$ok) return new WP_Error('not_linked', 'User not linked to partner', [ 'status' => 400 ]);
        return rest_ensure_response([ 'primary_set' => true ]);
    }

    public static function get_user_notification_prefs(WP_REST_Request $req){
        $uid = intval($req['id']);
        $u = get_user_by('ID', $uid);
        if (!$u) return new WP_Error('not_found', 'User not found', [ 'status' => 404 ]);
        $prefs = class_exists('PSP_Company_Users') ? PSP_Company_Users::get_user_notify_prefs($uid) : [ 'enabled' => true, 'categories' => ['tickets','alerts'], 'channels' => ['portal'] ];
        return rest_ensure_response($prefs);
    }

    public static function update_user_notification_prefs(WP_REST_Request $req){
        $uid = intval($req['id']);
        $u = get_user_by('ID', $uid);
        if (!$u) return new WP_Error('not_found', 'User not found', [ 'status' => 404 ]);
        $enabled = isset($req['enabled']) ? (bool)$req['enabled'] : null;
        $allowed_categories = ['tickets','service_records','alerts','announcements'];
        $allowed_channels = ['email','portal'];
        $cats_in = $req->get_param('categories');
        $channels_in = $req->get_param('channels');
        if ($cats_in !== null && !is_array($cats_in)) return new WP_Error('invalid_categories', 'Categories must be array', [ 'status' => 400 ]);
        if ($channels_in !== null && !is_array($channels_in)) return new WP_Error('invalid_channels', 'Channels must be array', [ 'status' => 400 ]);
        if ($enabled !== null) {
            update_user_meta($uid, 'psp_notify_enabled', $enabled ? 1 : 0);
        }
        if (is_array($cats_in)) {
            $filtered = array_values(array_intersect($allowed_categories, array_map('sanitize_text_field', $cats_in)));
            update_user_meta($uid, 'psp_notify_categories', wp_json_encode($filtered));
        }
        if (is_array($channels_in)) {
            $filtered = array_values(array_intersect($allowed_channels, array_map('sanitize_text_field', $channels_in)));
            update_user_meta($uid, 'psp_notify_channels', wp_json_encode($filtered));
        }
        $prefs = class_exists('PSP_Company_Users') ? PSP_Company_Users::get_user_notify_prefs($uid) : [ 'enabled' => true, 'categories' => ['tickets','alerts'], 'channels' => ['portal'] ];
        return rest_ensure_response($prefs);
    }
}
