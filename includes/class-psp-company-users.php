<?php
/**
 * Company <-> User linkage & helpers
 */
if (!defined('ABSPATH')) { exit; }

class PSP_Company_Users {
    public static function init() : void {
        // Register user meta for notification preferences
        self::register_user_meta('notify_enabled', 'boolean');
        self::register_user_meta('notify_categories', 'string'); // JSON encoded array
        self::register_user_meta('notify_channels', 'string'); // JSON encoded array
        self::register_user_meta('partner_id', 'integer'); // Linked partner/company
        // Migration hook (runs once per request, lightweight)
        add_action('init', [ __CLASS__, 'maybe_run_migration' ]);
    }

    private static function register_user_meta(string $key, string $type) : void {
        register_meta('user', "psp_{$key}", [
            'type' => $type,
            'single' => true,
            'show_in_rest' => false,
            'auth_callback' => function(){ return is_user_logged_in(); },
        ]);
    }

    public static function get_linked_user_ids(int $partner_id) : array {
        $raw = get_post_meta($partner_id, 'psp_user_ids', true);
        if (!$raw) return [];
        $ids = json_decode($raw, true);
        return is_array($ids) ? array_filter(array_map('intval', $ids)) : [];
    }

    public static function save_linked_user_ids(int $partner_id, array $ids) : void {
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids))));
        update_post_meta($partner_id, 'psp_user_ids', wp_json_encode($ids));
    }

    public static function link_user(int $partner_id, int $user_id) : bool {
        if (!get_post($partner_id) || get_post_type($partner_id) !== 'psp_partner') return false;
        $ids = self::get_linked_user_ids($partner_id);
        if (!in_array($user_id, $ids, true)) {
            $ids[] = $user_id;
            self::save_linked_user_ids($partner_id, $ids);
        }
        update_user_meta($user_id, 'psp_partner_id', $partner_id);
        // Assign primary if none
        $primary = intval(get_post_meta($partner_id, 'psp_primary_user_id', true));
        if ($primary === 0) {
            update_post_meta($partner_id, 'psp_primary_user_id', $user_id);
        }
        return true;
    }

    public static function unlink_user(int $partner_id, int $user_id) : bool {
        $ids = self::get_linked_user_ids($partner_id);
        $new = array_diff($ids, [ $user_id ]);
        self::save_linked_user_ids($partner_id, $new);
        $primary = intval(get_post_meta($partner_id, 'psp_primary_user_id', true));
        if ($primary === $user_id) {
            // Reassign primary to first remaining or clear
            $next = reset($new);
            if ($next) {
                update_post_meta($partner_id, 'psp_primary_user_id', $next);
            } else {
                delete_post_meta($partner_id, 'psp_primary_user_id');
            }
        }
        // Clear user meta link if it matches this partner
        $linked = intval(get_user_meta($user_id, 'psp_partner_id', true));
        if ($linked === $partner_id) {
            delete_user_meta($user_id, 'psp_partner_id');
        }
        return true;
    }

    public static function set_primary(int $partner_id, int $user_id) : bool {
        $ids = self::get_linked_user_ids($partner_id);
        if (!in_array($user_id, $ids, true)) return false;
        update_post_meta($partner_id, 'psp_primary_user_id', $user_id);
        return true;
    }

    public static function get_primary(int $partner_id) : int {
        return intval(get_post_meta($partner_id, 'psp_primary_user_id', true));
    }

    public static function get_partner_users(int $partner_id) : array {
        $ids = self::get_linked_user_ids($partner_id);
        $users = [];
        foreach ($ids as $uid) {
            $u = get_user_by('ID', $uid);
            if ($u) $users[] = $u;
        }
        return $users;
    }

    public static function get_user_notify_prefs(int $user_id) : array {
        $enabled = get_user_meta($user_id, 'psp_notify_enabled', true);
        $cats = json_decode((string) get_user_meta($user_id, 'psp_notify_categories', true), true);
        $channels = json_decode((string) get_user_meta($user_id, 'psp_notify_channels', true), true);
        if (!is_array($cats)) $cats = ['tickets','alerts'];
        if (!is_array($channels)) $channels = ['portal'];
        return [
            'enabled' => $enabled === '' ? true : (bool) $enabled,
            'categories' => $cats,
            'channels' => $channels,
        ];
    }

    /**
     * Migration: ensure each partner has primary_user_id set and defaults for user notify meta.
     * Safe + idempotent.
     */
    public static function maybe_run_migration() : void {
        // Only run for support/admin to avoid overhead for partners
        if (!current_user_can('administrator') && !current_user_can('psp_support')) return;
        $flag = get_transient('psp_company_users_migrated');
        if ($flag) return; // run at most once per hour
        $partners = get_posts([
            'post_type' => 'psp_partner',
            'posts_per_page' => 200,
            'post_status' => 'any',
            'fields' => 'ids'
        ]);
        foreach ($partners as $pid){
            $primary = intval(get_post_meta($pid, 'psp_primary_user_id', true));
            $linked = self::get_linked_user_ids($pid);
            // If no linked array yet, attempt to discover by user meta
            if (empty($linked)){
                $linked_users = get_users([ 'meta_key' => 'psp_partner_id', 'meta_value' => $pid, 'fields' => ['ID'] ]);
                $linked = wp_list_pluck($linked_users, 'ID');
                if (!empty($linked)){ self::save_linked_user_ids($pid, $linked); }
            }
            if ($primary === 0 && !empty($linked)){
                update_post_meta($pid, 'psp_primary_user_id', intval($linked[0]));
            }
            // Ensure each linked user has defaults
            foreach ($linked as $uid){
                $enabled = get_user_meta($uid, 'psp_notify_enabled', true);
                if ($enabled === '') update_user_meta($uid, 'psp_notify_enabled', 1);
                $cats = get_user_meta($uid, 'psp_notify_categories', true);
                if ($cats === '') update_user_meta($uid, 'psp_notify_categories', wp_json_encode(['tickets','alerts']));
                $chans = get_user_meta($uid, 'psp_notify_channels', true);
                if ($chans === '') update_user_meta($uid, 'psp_notify_channels', wp_json_encode(['portal']));
            }
        }
        set_transient('psp_company_users_migrated', 1, HOUR_IN_SECONDS);
    }
}
