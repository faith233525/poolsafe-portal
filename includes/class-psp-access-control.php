<?php
/**
 * Global access control: protect all pages, hide menus for guests, redirect to login.
 */
if (!defined('ABSPATH')) { exit; }

class PSP_Access_Control {
    /**
     * Initialize hooks.
     */
    public static function init() : void {
        // Frontend redirect for non-logged-in users (except allowed endpoints)
        add_action('template_redirect', [__CLASS__, 'maybe_redirect_guest']);

        // Hide theme navigation menus for guests
        add_filter('wp_nav_menu_args', [__CLASS__, 'filter_nav_menu_args']);
    add_filter('wp_nav_menu_items', [__CLASS__, 'filter_nav_menu_items'], 99, 2);

        // Hide admin bar for non-logged-in and non-admin/support users
        add_filter('show_admin_bar', [__CLASS__, 'hide_admin_bar']);
    }

    /**
     * Redirect unauthenticated visitors to portal login page, except allowed routes.
     */
    public static function maybe_redirect_guest() : void {
        if (is_user_logged_in()) {
            return; // Authenticated: allow.
        }

        // Allow WordPress core login, registration, logout
        if (self::is_core_auth_page()) { return; }

    // Allow our custom login shortcode page (slug: login or portal-login for backward compatibility)
        if (self::is_portal_login_page()) { return; }

        // Allow OAuth callback & start endpoints
        if (self::is_oauth_flow_request()) { return; }

        // Allow AJAX, REST API, cron, and admin-post actions
        if (self::is_system_request()) { return; }

        // Allow robots, favicon, assets
        if (self::is_public_asset_request()) { return; }

        // Otherwise redirect to login page
        // Prefer new /login slug; keep /portal-login working if user browses directly
        $login_url = self::get_login_url();
        // Preserve intended URL for post-login redirect (optional future enhancement)
        wp_safe_redirect($login_url);
        exit;
    }

    /** WordPress core auth endpoints */
    protected static function is_core_auth_page() : bool {
        return (function_exists('is_page') && (is_page('wp-login.php'))) || self::is_login_php();
    }

    /** Detect direct wp-login.php access */
    protected static function is_login_php() : bool {
        $script = isset($_SERVER['SCRIPT_NAME']) ? wp_basename($_SERVER['SCRIPT_NAME']) : '';
        return $script === 'wp-login.php';
    }

    /** Detect portal login page by path or content (simple heuristic) */
    protected static function is_portal_login_page() : bool {
        // Check URL path
        $req_uri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '';
        if (strpos($req_uri, '/portal-login') !== false) { return true; }
        if (strpos($req_uri, '/login') !== false) { return true; }
        return false; // We rely on slug; content scan would require a query.
    }

    /** Resolve login URL with graceful fallback */
    protected static function get_login_url() : string {
        // Get configured login slug from settings
        $settings = function_exists('get_option') ? get_option('psp_settings', []) : [];
        $slug = isset($settings['login_page_slug']) && $settings['login_page_slug'] ? $settings['login_page_slug'] : 'login';
        
        // If a page with configured slug exists, use its permalink
        if (function_exists('get_page_by_path') && function_exists('get_permalink')) {
            $p = get_page_by_path($slug);
            if ($p) { return get_permalink($p); }
            // Fallback to portal-login for backward compatibility
            $p2 = get_page_by_path('portal-login');
            if ($p2) { return get_permalink($p2); }
        }
        // Otherwise fall back to home_url with configured slug
        if (function_exists('home_url')) {
            return home_url('/' . $slug);
        }
        // Last resort: relative path
        return '/' . $slug;
    }

    /** OAuth flow endpoints (start & callback) */
    protected static function is_oauth_flow_request() : bool {
        $action = isset($_GET['action']) ? sanitize_key($_GET['action']) : '';
        if ($action === 'psp_graph_oauth_start' || $action === 'psp_graph_oauth_callback') {
            return true;
        }
        return false;
    }

    /** System/internal requests that should not be blocked */
    protected static function is_system_request() : bool {
        if (defined('DOING_AJAX') && DOING_AJAX) { return true; }
        if (defined('REST_REQUEST') && REST_REQUEST) { return true; }
        if (defined('DOING_CRON') && DOING_CRON) { return true; }
        // admin-post.php endpoints
        $script = isset($_SERVER['SCRIPT_NAME']) ? wp_basename($_SERVER['SCRIPT_NAME']) : '';
        if ($script === 'admin-post.php') { return true; }
        return false;
    }

    /** Allow public assets (css/js/images) & well-known */
    protected static function is_public_asset_request() : bool {
        $uri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '';
        // Basic exclusions
        $allowed_prefixes = [ '/wp-content/uploads/', '/wp-content/plugins/', '/wp-includes/', '/favicon.ico', '/robots.txt', '/.well-known/' ];
        foreach ($allowed_prefixes as $prefix) {
            if (strpos($uri, $prefix) !== false) { return true; }
        }
        return false;
    }

    /** Hide menus by returning empty container for guests */
    public static function filter_nav_menu_args($args) {
        if (!is_user_logged_in()) {
            // Replace walker / output with empty ul to avoid theme fallback.
            $args['echo'] = false;
            $args['fallback_cb'] = '__return_empty_string';
            $args['menu'] = 0; // Force no specific menu.
        }
        return $args;
    }

    /**
     * Ensure menu items are empty for guests regardless of theme behavior
     */
    public static function filter_nav_menu_items($items, $args) {
        if (!is_user_logged_in()) {
            return '';
        }
        return $items;
    }

    /** Hide admin bar for all guests */
    public static function hide_admin_bar($show) : bool {
        if (!is_user_logged_in()) { return false; }
        return $show;
    }
}
