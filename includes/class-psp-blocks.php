<?php
/**
 * Gutenberg Blocks (server-rendered)
 */
if (!defined('ABSPATH')) { exit; }

class PSP_Blocks {
    public static function init() : void {
        add_action('init', [ __CLASS__, 'register_blocks' ]);
    }

    public static function register_blocks() : void {
        $blocks = [
            'psp/portal' => [
                'title' => __('Pool Safe: Portal', 'psp'),
                'shortcode' => 'poolsafe_portal',
                'icon' => 'admin-site-alt3',
            ],
            'psp/map' => [
                'title' => __('Pool Safe: Map', 'psp'),
                'shortcode' => 'poolsafe_map',
                'icon' => 'location',
            ],
            'psp/tickets' => [
                'title' => __('Pool Safe: Tickets', 'psp'),
                'shortcode' => 'poolsafe_tickets',
                'icon' => 'tickets-alt',
            ],
            'psp/partners' => [
                'title' => __('Pool Safe: Partners', 'psp'),
                'shortcode' => 'poolsafe_partners',
                'icon' => 'groups',
            ],
            'psp/gallery' => [
                'title' => __('Pool Safe: Gallery', 'psp'),
                'shortcode' => 'poolsafe_gallery',
                'icon' => 'format-gallery',
            ],
            'psp/notifications' => [
                'title' => __('Pool Safe: Notifications', 'psp'),
                'shortcode' => 'poolsafe_notifications',
                'icon' => 'megaphone',
            ],
            'psp/calendar' => [
                'title' => __('Pool Safe: Calendar', 'psp'),
                'shortcode' => 'poolsafe_calendar',
                'icon' => 'calendar-alt',
            ],
        ];

        foreach ($blocks as $name => $config) {
            register_block_type($name, [
                'api_version' => 2,
                'title' => $config['title'],
                'category' => 'widgets',
                'icon' => $config['icon'],
                'supports' => [
                    'html' => false,
                    'customClassName' => false,
                ],
                'render_callback' => function() use ($config) {
                    return do_shortcode('[' . $config['shortcode'] . ']');
                },
            ]);
        }
    }
}
