<?php
/**
 * Partners CPT & meta (company, address, lock info, map location)
 */
if (!defined('ABSPATH')) { exit; }

class PSP_Partners {
    public static function register_cpt() : void {
        $labels = [
            'name' => __('Partners', 'psp'),
            'singular_name' => __('Partner', 'psp'),
        ];
        $caps = [
            'read_post' => 'read_psp_partner',
            'read_private_posts' => 'read_private_psp_partners',
            'edit_post' => 'edit_psp_partner',
            'edit_posts' => 'edit_psp_partners',
            'edit_others_posts' => 'edit_others_psp_partners',
            'publish_posts' => 'publish_psp_partners',
            'delete_post' => 'delete_psp_partner',
            'delete_posts' => 'delete_psp_partners',
            'delete_others_posts' => 'delete_others_psp_partners',
        ];
        register_post_type('psp_partner', [
            'labels' => $labels,
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => true,
            'capability_type' => ['psp_partner','psp_partners'],
            'map_meta_cap' => false,
            'capabilities' => $caps,
            'supports' => ['title','editor','custom-fields'],
            'show_in_rest' => true,
            'menu_icon' => 'dashicons-building',
        ]);

        // Company & location
        self::register_meta('company_name', 'string');
        self::register_meta('management_company', 'string');
        self::register_meta('street_address', 'string');
        self::register_meta('city', 'string');
        self::register_meta('state', 'string');
        self::register_meta('zip', 'string');
        self::register_meta('country', 'string');
        self::register_meta('latitude', 'number');
        self::register_meta('longitude', 'number');
    self::register_meta('number_of_lounge_units', 'integer');
    // New standardized key (snake_case short name)
    self::register_meta('units', 'integer');
        self::register_meta('top_colour', 'string');
        
        // Installation & Operation tracking
        self::register_meta('installation_date', 'string');
        self::register_meta('operation_type', 'string'); // year_round or seasonal
        self::register_meta('seasonal_open_date', 'string');
        self::register_meta('seasonal_close_date', 'string');
        self::register_meta('is_active', 'boolean'); // Currently active/operational
        // Lock info (restricted to support/admin via UI; REST auth callback below)
        self::register_meta('lock_make', 'string', 'psp_support');
        self::register_meta('master_code', 'string', 'psp_support');
        self::register_meta('sub_master_code', 'string', 'psp_support');
        self::register_meta('lock_part', 'string', 'psp_support');
        self::register_meta('key', 'string', 'psp_support');
        // Amenity features (F&B call button, USB charging, safe lock)
        self::register_meta('has_fb_call_button', 'boolean');
        self::register_meta('has_usb_charging', 'boolean');
        self::register_meta('has_safe_lock', 'boolean');
        self::register_meta('company_email', 'string');
        self::register_meta('phone_number', 'string');
        self::register_meta('email_domain', 'string'); // For email-to-ticket auto-matching
        self::register_meta('phone', 'string'); // New standardized phone field

        // Company-user linkage meta
        self::register_meta('primary_user_id', 'integer'); // WP user ID designated as primary contact
        self::register_meta('user_ids', 'string'); // JSON encoded array of linked WP user IDs

        // Auto-geocode on save when address is present and coordinates are empty
        add_action('save_post_psp_partner', [ __CLASS__, 'maybe_geocode_coordinates' ], 20, 3);
        
        // Admin list columns
        add_filter('manage_psp_partner_posts_columns', [ __CLASS__, 'add_admin_columns' ]);
        add_action('manage_psp_partner_posts_custom_column', [ __CLASS__, 'render_admin_column' ], 10, 2);
    }

    private static function register_meta(string $key, string $type, string $minRole = 'read_psp_partner') : void {
        register_post_meta('psp_partner', "psp_{$key}", [
            'type' => $type,
            'single' => true,
            'show_in_rest' => true,
            'auth_callback' => function() use ($minRole) {
                if ($minRole === 'psp_support') {
                    return current_user_can('administrator') || current_user_can('psp_support');
                }
                return current_user_can('read_psp_partner');
            },
        ]);
    }

    /**
     * Attempt to geocode coordinates based on address if lat/lng are empty.
     */
    public static function maybe_geocode_coordinates(int $post_id, $post, bool $update) : void {
        if (wp_is_post_revision($post_id) || $post->post_type !== 'psp_partner') return;
        $lat = get_post_meta($post_id, 'psp_latitude', true);
        $lng = get_post_meta($post_id, 'psp_longitude', true);
        if (!empty($lat) && !empty($lng)) return; // already set

        $parts = [];
        foreach (['psp_street_address','psp_city','psp_state','psp_zip','psp_country'] as $k) {
            $v = trim((string) get_post_meta($post_id, $k, true));
            if ($v !== '') $parts[] = $v;
        }
        if (empty($parts)) return;
        $address = implode(', ', $parts);

        $geo = self::geocode_address($address);
        if ($geo && isset($geo['lat'], $geo['lng'])) {
            update_post_meta($post_id, 'psp_latitude', (float) $geo['lat']);
            update_post_meta($post_id, 'psp_longitude', (float) $geo['lng']);
        }

        // Migrate old units field to new key if needed
        $units_new = get_post_meta($post_id, 'psp_units', true);
        if ($units_new === '' || $units_new === null) {
            $units_old = get_post_meta($post_id, 'psp_number_of_lounge_units', true);
            if ($units_old !== '' && $units_old !== null) {
                update_post_meta($post_id, 'psp_units', intval($units_old));
            }
        }
    }

    /**
     * Geocode an address using OpenStreetMap Nominatim (no API key). Obeys rate limits implicitly.
     * Returns ['lat' => float, 'lng' => float] or null.
     */
    public static function geocode_address(string $address) : ?array {
        $url = add_query_arg([
            'format' => 'json',
            'q' => $address,
            'limit' => 1,
        ], 'https://nominatim.openstreetmap.org/search');
        $args = [
            'timeout' => 10,
            'headers' => [
                'User-Agent' => 'PoolSafePortal/1.0 (' . home_url('/') . ')',
            ],
        ];
        $res = wp_remote_get($url, $args);
        if (is_wp_error($res)) return null;
        $code = wp_remote_retrieve_response_code($res);
        if ($code !== 200) return null;
        $body = wp_remote_retrieve_body($res);
        $json = json_decode($body, true);
        if (!is_array($json) || empty($json[0])) return null;
        $item = $json[0];
        if (!isset($item['lat'], $item['lon'])) return null;
        return [ 'lat' => (float) $item['lat'], 'lng' => (float) $item['lon'] ];
    }

    /**
     * Add custom columns to Partners admin list
     */
    public static function add_admin_columns($columns) : array {
        // Insert geocode status column after title
        $new = [];
        foreach ($columns as $key => $label) {
            $new[$key] = $label;
            if ($key === 'title') {
                $new['psp_geocode_status'] = __('Map Coordinates', 'psp');
            }
        }
        return $new;
    }

    /**
     * Render custom column content
     */
    public static function render_admin_column(string $column, int $post_id) : void {
        if ($column === 'psp_geocode_status') {
            $lat = get_post_meta($post_id, 'psp_latitude', true);
            $lng = get_post_meta($post_id, 'psp_longitude', true);
            if (!empty($lat) && !empty($lng)) {
                echo '<span style="color:#00a32a;" title="' . esc_attr__('Coordinates present', 'psp') . '">✓</span>';
            } else {
                echo '<span style="color:#dba617;" title="' . esc_attr__('Missing coordinates', 'psp') . '">✗</span>';
            }
        }
    }
}
