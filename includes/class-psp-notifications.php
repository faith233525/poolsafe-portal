<?php
/**
 * Notifications CPT & meta + REST endpoints
 */
if (!defined('ABSPATH')) { exit; }

class PSP_Notifications {
    public static function register_cpt() : void {
        $labels = [
            'name' => __('Notifications', 'psp'),
            'singular_name' => __('Notification', 'psp'),
        ];
        register_post_type('psp_notification', [
            'labels' => $labels,
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => 'psp-admin',
            'supports' => ['title','editor','custom-fields','author'],
            'show_in_rest' => false,
            'menu_icon' => 'dashicons-megaphone',
        ]);

        self::register_meta('target_user', 'integer');
        self::register_meta('read', 'boolean');
        self::register_meta('type', 'string');
        self::register_meta('delivery_targets', 'string'); // JSON array of user IDs actually notified
        self::register_meta('partner_id', 'integer');
    }

    public static function register_routes() : void {
        register_rest_route('poolsafe/v1', '/notifications', [
            [
                'methods' => 'GET',
                'permission_callback' => function(){ return is_user_logged_in(); },
                'callback' => [ __CLASS__, 'list_user' ],
            ],
            [
                'methods' => 'POST',
                'permission_callback' => function(){ return current_user_can('publish_psp_tickets') || current_user_can('administrator'); },
                'args' => [
                    'user_id' => [ 'required' => true, 'type' => 'integer' ],
                    'title' => [ 'required' => true, 'type' => 'string' ],
                    'content' => [ 'required' => false, 'type' => 'string' ],
                ],
                'callback' => [ __CLASS__, 'create' ],
            ],
        ]);

        register_rest_route('poolsafe/v1', '/notifications/(?P<id>\\d+)/read', [
            'methods' => 'POST',
            'permission_callback' => function($req){
                $pid = intval($req['id']);
                $owner = intval(get_post_meta($pid, 'psp_target_user', true));
                return is_user_logged_in() && get_current_user_id() === $owner;
            },
            'callback' => [ __CLASS__, 'mark_read' ],
        ]);
    }

    private static function register_meta(string $key, string $type) : void {
        register_post_meta('psp_notification', "psp_{$key}", [
            'type' => $type,
            'single' => true,
            'show_in_rest' => false,
            'auth_callback' => '__return_true',
        ]);
    }

    public static function list_user(WP_REST_Request $req){
        $uid = get_current_user_id();
        $q = new WP_Query([
            'post_type' => 'psp_notification',
            'posts_per_page' => 50,
            'meta_query' => [ [ 'key' => 'psp_target_user', 'value' => $uid, 'compare' => '=' ] ],
            'orderby' => 'date', 'order' => 'DESC'
        ]);
        $out = [];
        foreach ($q->posts as $p){
            $out[] = [
                'id' => $p->ID,
                'title' => get_the_title($p),
                'content' => apply_filters('the_content', $p->post_content),
                'read' => (bool) get_post_meta($p->ID, 'psp_read', true),
                'createdAt' => get_post_time('c', true, $p),
            ];
        }
        return rest_ensure_response($out);
    }

    public static function create(WP_REST_Request $req){
        $post_id = wp_insert_post([
            'post_type' => 'psp_notification',
            'post_title' => sanitize_text_field($req['title']),
            'post_content' => wp_kses_post($req['content'] ?? ''),
            'post_status' => 'publish',
            'post_author' => get_current_user_id(),
        ]);
        if (is_wp_error($post_id)) return $post_id;
        update_post_meta($post_id, 'psp_target_user', intval($req['user_id']));
        update_post_meta($post_id, 'psp_read', false);
        return rest_ensure_response([ 'id' => $post_id ]);
    }

    public static function mark_read(WP_REST_Request $req){
        $pid = intval($req['id']);
        update_post_meta($pid, 'psp_read', true);
        return rest_ensure_response([ 'ok' => true ]);
    }

    /**
     * High-level dispatch: choose recipients based on subscription prefs.
     * @param int $partner_id Related company/partner ID (optional)
     * @param string $category tickets|service_records|alerts|announcements
     * @param string $title Notification title
     * @param string $content HTML/plain content
     * @param array $extra_meta Additional meta key=>value pairs
     */
    public static function dispatch(int $partner_id, string $category, string $title, string $content, array $extra_meta = []) : array {
        $recipients = [];
        $fallback_used = false;
        // Collect subscribed users
        if (class_exists('PSP_Company_Users') && $partner_id){
            $users = PSP_Company_Users::get_partner_users($partner_id);
            foreach ($users as $u){
                $prefs = PSP_Company_Users::get_user_notify_prefs($u->ID);
                if ($prefs['enabled'] && in_array($category, $prefs['categories'], true)){
                    $recipients[] = $u->ID;
                }
            }
            // Fallback to primary if none
            if (empty($recipients)){
                $primary = PSP_Company_Users::get_primary($partner_id);
                if ($primary){ $recipients[] = $primary; $fallback_used = true; }
            }
        }
        // Global fallback to admin/support if still empty
        if (empty($recipients)){
            $admins = get_users([ 'role__in' => ['administrator','psp_support'], 'fields' => ['ID'] ]);
            foreach ($admins as $a){ $recipients[] = $a->ID; }
            $fallback_used = true;
        }
        $created = [];
        foreach (array_unique($recipients) as $uid){
            $post_id = wp_insert_post([
                'post_type' => 'psp_notification',
                'post_title' => wp_strip_all_tags($title),
                'post_content' => wp_kses_post($content),
                'post_status' => 'publish',
                'post_author' => get_current_user_id() ?: $uid,
            ]);
            if (is_wp_error($post_id)) continue;
            update_post_meta($post_id, 'psp_target_user', $uid);
            update_post_meta($post_id, 'psp_read', false);
            update_post_meta($post_id, 'psp_type', sanitize_text_field($category));
            if ($partner_id) update_post_meta($post_id, 'psp_partner_id', $partner_id);
            foreach ($extra_meta as $k=>$v){ update_post_meta($post_id, 'psp_'.$k, $v); }
            $created[] = $post_id;
        }
        // Record delivery targets on first notification (for auditing)
        if (!empty($created)){
            update_post_meta($created[0], 'psp_delivery_targets', wp_json_encode([ 'user_ids' => $recipients, 'fallback_used' => $fallback_used, 'category' => $category ]));
        }
        return [ 'notification_ids' => $created, 'recipient_ids' => $recipients, 'fallback_used' => $fallback_used ];
    }
}
