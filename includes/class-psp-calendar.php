<?php
/**
 * Calendar Events CPT & REST
 */
if (!defined('ABSPATH')) { exit; }

class PSP_Calendar {
    public static function register_cpt() : void {
        $labels = [
            'name' => __('Calendar Events', 'psp'),
            'singular_name' => __('Calendar Event', 'psp'),
        ];
        $caps = [
            'read_post' => 'read_psp_calendar_event',
            'read_private_posts' => 'read_private_psp_calendar_events',
            'edit_post' => 'edit_psp_calendar_event',
            'edit_posts' => 'edit_psp_calendar_events',
            'edit_others_posts' => 'edit_others_psp_calendar_events',
            'publish_posts' => 'publish_psp_calendar_events',
            'delete_post' => 'delete_psp_calendar_event',
            'delete_posts' => 'delete_psp_calendar_events',
        ];
        register_post_type('psp_calendar_event', [
            'labels' => $labels,
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => 'psp-admin',
            'capability_type' => ['psp_calendar_event','psp_calendar_events'],
            'map_meta_cap' => false,
            'capabilities' => $caps,
            'supports' => ['title','editor','author'],
            'show_in_rest' => true,
            'menu_icon' => 'dashicons-calendar-alt',
        ]);

        register_post_meta('psp_calendar_event', 'psp_start_date', [
            'type' => 'string',
            'single' => true,
            'show_in_rest' => true,
            'auth_callback' => function() { return current_user_can('read_psp_calendar_event'); },
        ]);
        register_post_meta('psp_calendar_event', 'psp_end_date', [
            'type' => 'string',
            'single' => true,
            'show_in_rest' => true,
            'auth_callback' => function() { return current_user_can('read_psp_calendar_event'); },
        ]);
        register_post_meta('psp_calendar_event', 'psp_partner_id', [
            'type' => 'integer',
            'single' => true,
            'show_in_rest' => true,
            'auth_callback' => function() { return current_user_can('read_psp_calendar_event'); },
        ]);
    }

    public static function register_routes() : void {
        register_rest_route('poolsafe/v1', '/calendar-events', [
            [
                'methods' => 'GET',
                'permission_callback' => function() { return is_user_logged_in(); },
                'callback' => [ __CLASS__, 'list_events' ],
            ],
            [
                'methods' => 'POST',
                'permission_callback' => function() { return current_user_can('publish_psp_calendar_events'); },
                'callback' => [ __CLASS__, 'create_event' ],
                'args' => [
                    'title' => ['required' => true, 'type' => 'string'],
                    'description' => ['required' => false, 'type' => 'string'],
                    'start_date' => ['required' => true, 'type' => 'string'],
                    'end_date' => ['required' => false, 'type' => 'string'],
                    'partner_id' => ['required' => false, 'type' => 'integer'],
                ],
            ],
        ]);
    }

    public static function list_events($req) {
        $args = [
            'post_type' => 'psp_calendar_event',
            'posts_per_page' => 50,
            'post_status' => 'publish',
            'orderby' => 'meta_value',
            'meta_key' => 'psp_start_date',
            'order' => 'ASC',
        ];
        $q = new WP_Query($args);
        $data = [];
        foreach ($q->posts as $p) {
            $data[] = [
                'id' => $p->ID,
                'title' => get_the_title($p),
                'description' => get_the_content(null, false, $p),
                'start_date' => get_post_meta($p->ID, 'psp_start_date', true),
                'end_date' => get_post_meta($p->ID, 'psp_end_date', true),
                'partner_id' => intval(get_post_meta($p->ID, 'psp_partner_id', true)),
            ];
        }
        return rest_ensure_response($data);
    }

    public static function create_event($req) {
        $post_id = wp_insert_post([
            'post_type' => 'psp_calendar_event',
            'post_title' => sanitize_text_field($req['title']),
            'post_content' => wp_kses_post($req['description'] ?? ''),
            'post_status' => 'publish',
        ]);
        if (is_wp_error($post_id)) {
            return $post_id;
        }
        if (isset($req['start_date'])) update_post_meta($post_id, 'psp_start_date', sanitize_text_field($req['start_date']));
        if (isset($req['end_date'])) update_post_meta($post_id, 'psp_end_date', sanitize_text_field($req['end_date']));
        if (isset($req['partner_id'])) update_post_meta($post_id, 'psp_partner_id', intval($req['partner_id']));

        return rest_ensure_response([ 'id' => $post_id ]);
    }
}
