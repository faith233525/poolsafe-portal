<?php
/**
 * Tickets CPT & meta
 */
if (!defined('ABSPATH')) { exit; }

class PSP_Tickets {
    public static function init() : void {
        // Hook into ticket creation for email notifications
        add_action('transition_post_status', [ __CLASS__, 'on_status_change' ], 10, 3);
    }

    public static function register_cpt() : void {
        $labels = [
            'name' => __('Tickets', 'psp'),
            'singular_name' => __('Ticket', 'psp'),
        ];
        $caps = [
            'read_post' => 'read_psp_ticket',
            'read_private_posts' => 'read_private_psp_tickets',
            'edit_post' => 'edit_psp_ticket',
            'edit_posts' => 'edit_psp_tickets',
            'edit_others_posts' => 'edit_others_psp_tickets',
            'publish_posts' => 'publish_psp_tickets',
            'delete_post' => 'delete_psp_ticket',
            'delete_posts' => 'delete_psp_tickets',
            'delete_others_posts' => 'delete_others_psp_tickets',
        ];
        register_post_type('psp_ticket', [
            'labels' => $labels,
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => true,
            'capability_type' => ['psp_ticket','psp_tickets'],
            'map_meta_cap' => false,
            'capabilities' => $caps,
            'supports' => ['title','editor','author','custom-fields','comments'],
            'show_in_rest' => true,
            'menu_icon' => 'dashicons-tickets',
        ]);

        // Register core meta fields
        self::register_meta('priority', 'string');
        self::register_meta('status', 'string');
        self::register_meta('partner_id', 'integer');
        self::register_meta('attachment_ids', 'array');

        // Register contact fields
        self::register_meta('first_name', 'string');
        self::register_meta('last_name', 'string');
        self::register_meta('position', 'string');
        self::register_meta('contact_email', 'string');
        self::register_meta('contact_number', 'string');
        self::register_meta('units_affected', 'string');

            // Register enhanced ticket fields
            self::register_meta('category', 'string');
            self::register_meta('severity', 'string');
            self::register_meta('video_link', 'string');
            self::register_meta('resort_name', 'string');
            
            // Email thread tracking
            self::register_meta('source', 'string'); // portal, email, phone, chat
            self::register_meta('sender_email', 'string'); // Original sender email
            self::register_meta('sender_name', 'string'); // Original sender name
            self::register_meta('thread_id', 'string'); // Email thread ID for tracking
            self::register_meta('response_count', 'integer'); // Number of responses
            self::register_meta('last_response_at', 'string'); // ISO datetime
            self::register_meta('last_response_by', 'string'); // User ID or email
            self::register_meta('last_response_via', 'string'); // portal, outlook, gmail
    }

    private static function register_meta(string $key, string $type) : void {
        register_post_meta('psp_ticket', "psp_{$key}", [
            'type' => $type,
            'single' => true,
            'show_in_rest' => true,
            'auth_callback' => function() { return current_user_can('read_psp_ticket'); },
        ]);
    }

    /**
     * Handle ticket status changes
     */
    public static function on_status_change($new_status, $old_status, $post) : void {
        if ($post->post_type !== 'psp_ticket') return;

        // New ticket created
        if ($new_status === 'publish' && $old_status !== 'publish') {
            if (class_exists('PSP_Email')) {
                PSP_Email::notify_new_ticket($post->ID);
            }
        }

        // Status changed (but not publish -> publish)
        if ($new_status !== $old_status && $new_status === 'publish' && $old_status === 'publish') {
            // Check if status meta field changed
            $current_status = get_post_meta($post->ID, 'psp_status', true);
            $previous_status = get_post_meta($post->ID, '_psp_previous_status', true);
            
            if ($current_status && $previous_status && $current_status !== $previous_status) {
                if (class_exists('PSP_Email')) {
                    PSP_Email::notify_status_change($post->ID, $previous_status, $current_status);
                }
            }
        }
    }
}
