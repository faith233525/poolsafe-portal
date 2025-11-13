<?php
/**
 * Filter WordPress menus to hide support-only pages from partner users
 */
if (!defined('ABSPATH')) { exit; }

class PSP_Menu_Filter {
    /**
     * Initialize menu filtering
     */
    public static function init() : void {
        add_filter('wp_get_nav_menu_items', [ __CLASS__, 'hide_support_menu_items' ], 10, 3);
    }

    /**
     * Hide support-only menu items from partner users
     * 
     * @param array $items Menu items
     * @param object $menu Menu object
     * @param array $args Menu arguments
     * @return array Filtered menu items
     */
    public static function hide_support_menu_items($items, $menu, $args) {
        // Only filter for logged-in users
        if (!is_user_logged_in()) {
            return $items;
        }

        // Skip if user is support or admin
        if (current_user_can('psp_support') || current_user_can('administrator')) {
            return $items;
        }

        // Partner users - filter out support-only pages
        $support_only_keywords = [
            'support-tools',
            'support_tools',
            'user-management',
            'user_management',
            'poolsafe_support_tools',
            'poolsafe_user_management'
        ];

        $filtered_items = [];
        foreach ($items as $item) {
            $should_hide = false;

            // Check page slug/URL
            $url_lower = strtolower($item->url);
            foreach ($support_only_keywords as $keyword) {
                if (strpos($url_lower, $keyword) !== false) {
                    $should_hide = true;
                    break;
                }
            }

            // Check menu item title
            $title_lower = strtolower($item->title);
            if (strpos($title_lower, 'support tool') !== false || 
                strpos($title_lower, 'user management') !== false) {
                $should_hide = true;
            }

            // Check if the page contains support-only shortcodes
            if ($item->object === 'page' && $item->object_id) {
                $page = get_post($item->object_id);
                if ($page && $page->post_content) {
                    $content_lower = strtolower($page->post_content);
                    if (strpos($content_lower, '[poolsafe_support_tools]') !== false ||
                        strpos($content_lower, '[poolsafe_user_management]') !== false) {
                        $should_hide = true;
                    }
                }
            }

            if (!$should_hide) {
                $filtered_items[] = $item;
            }
        }

        return $filtered_items;
    }
}
