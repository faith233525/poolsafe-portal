<?php
/**
 * Settings API for plugin (map tiles, SLA thresholds, reminders)
 */
if (!defined('ABSPATH')) { exit; }

class PSP_Settings {
    const OPTION_KEY = 'psp_settings';

    public static function register() : void {
        register_setting('psp_settings_group', self::OPTION_KEY, [
            'type' => 'array',
            'sanitize_callback' => [ __CLASS__, 'sanitize' ],
            'default' => [
                'map_tile_url' => 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'map_attribution' => '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                // SLA defaults (hours)
                'sla_urgent' => 4,
                'sla_high' => 24,
                'sla_medium' => 72,
                'sla_low' => 168,
                // Reminder schedule CSV (hours), e.g. "24,72"
                'sla_reminder_schedule' => '24,72',
                // UI Colors (support-editable via REST)
                'primary_color' => '#3b82f6',
                'primary_hover_color' => '#2563eb',
                'lock_highlight_bg' => '#fef3c7',
                'lock_highlight_border' => '#fbbf24',
            ],
        ]);

        add_settings_section('psp_settings_section', __('Portal Settings', 'psp'), function(){
            echo '<p>' . esc_html__('Configure portal options such as map tiles.', 'psp') . '</p>';
        }, 'psp-settings');

        add_settings_field('psp_map_tile_url', __('Map Tile URL', 'psp'), [ __CLASS__, 'field_tile_url' ], 'psp-settings', 'psp_settings_section');
        add_settings_field('psp_map_attribution', __('Map Attribution (HTML)', 'psp'), [ __CLASS__, 'field_attribution' ], 'psp-settings', 'psp_settings_section');

        // SLA Settings Section
        add_settings_section('psp_sla_section', __('SLA Settings', 'psp'), function(){
            echo '<p>' . esc_html__('Configure SLA thresholds (in hours) and overdue reminder schedule.', 'psp') . '</p>';
        }, 'psp-settings');

        add_settings_field('psp_sla_urgent', __('Urgent SLA (hours)', 'psp'), [ __CLASS__, 'field_sla_urgent' ], 'psp-settings', 'psp_sla_section');
        add_settings_field('psp_sla_high', __('High SLA (hours)', 'psp'), [ __CLASS__, 'field_sla_high' ], 'psp-settings', 'psp_sla_section');
        add_settings_field('psp_sla_medium', __('Medium SLA (hours)', 'psp'), [ __CLASS__, 'field_sla_medium' ], 'psp-settings', 'psp_sla_section');
        add_settings_field('psp_sla_low', __('Low SLA (hours)', 'psp'), [ __CLASS__, 'field_sla_low' ], 'psp-settings', 'psp_sla_section');
        add_settings_field('psp_sla_reminder_schedule', __('Overdue reminder schedule (hours, CSV)', 'psp'), [ __CLASS__, 'field_sla_reminder_schedule' ], 'psp-settings', 'psp_sla_section');

        // Branding Colors Section (admin UI; also editable by support via REST)
        add_settings_section('psp_branding_section', __('Branding & Colors', 'psp'), function(){
            echo '<p>' . esc_html__('Set portal colors. Support users can also adjust these from the frontend Support Tools.', 'psp') . '</p>';
        }, 'psp-settings');
        add_settings_field('psp_primary_color', __('Primary Color', 'psp'), [ __CLASS__, 'field_primary_color' ], 'psp-settings', 'psp_branding_section');
        add_settings_field('psp_primary_hover_color', __('Primary Hover Color', 'psp'), [ __CLASS__, 'field_primary_hover_color' ], 'psp-settings', 'psp_branding_section');
        add_settings_field('psp_lock_highlight_bg', __('Lock Highlight Background', 'psp'), [ __CLASS__, 'field_lock_highlight_bg' ], 'psp-settings', 'psp_branding_section');
        add_settings_field('psp_lock_highlight_border', __('Lock Highlight Border', 'psp'), [ __CLASS__, 'field_lock_highlight_border' ], 'psp-settings', 'psp_branding_section');
    }

    public static function sanitize($input) : array {
        $out = is_array($input) ? $input : [];
        $out['map_tile_url'] = isset($out['map_tile_url']) ? esc_url_raw($out['map_tile_url']) : '';
        // Allow limited HTML for attribution
        $allowed = [ 'a' => ['href' => [], 'title' => [], 'target' => []], 'span' => [] , 'strong' => [], 'em' => [] ];
        $out['map_attribution'] = isset($out['map_attribution']) ? wp_kses((string)$out['map_attribution'], $allowed) : '';
        
        // Login page slug: sanitize as URL-safe slug
        $out['login_page_slug'] = isset($out['login_page_slug']) ? sanitize_title($out['login_page_slug']) : 'login';
        if (empty($out['login_page_slug'])) { $out['login_page_slug'] = 'login'; }

        // SLA thresholds: coerce to integers and ensure sane bounds
        foreach (['sla_urgent','sla_high','sla_medium','sla_low'] as $k) {
            $v = isset($out[$k]) ? intval($out[$k]) : 0;
            if ($v <= 0) { $v = 1; }
            if ($v > 24*30) { $v = 24*30; } // max 30 days
            $out[$k] = $v;
        }
        // Reminder schedule as CSV of positive integers
        if (isset($out['sla_reminder_schedule'])) {
            $parts = array_filter(array_map('trim', explode(',', (string)$out['sla_reminder_schedule'])), function($p){ return $p !== ''; });
            $ints = array_map('intval', $parts);
            $ints = array_values(array_filter($ints, function($n){ return $n > 0 && $n <= 24*90; })); // up to 90 days
            $out['sla_reminder_schedule'] = implode(',', $ints);
        } else {
            $out['sla_reminder_schedule'] = '';
        }

        // Colors: sanitize HEX or fallback to defaults
        $color_defaults = [
            'primary_color' => '#3b82f6',
            'primary_hover_color' => '#2563eb',
            'lock_highlight_bg' => '#fef3c7',
            'lock_highlight_border' => '#fbbf24',
        ];
        foreach ($color_defaults as $k => $def) {
            if (isset($out[$k])) {
                $hex = sanitize_hex_color($out[$k]);
                $out[$k] = $hex ? $hex : $def;
            } else {
                $out[$k] = $def;
            }
        }
        return $out;
    }

    public static function get_settings() : array {
        $defaults = [
            'map_tile_url' => 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'map_attribution' => '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            'sla_urgent' => 4,
            'sla_high' => 24,
            'sla_medium' => 72,
            'sla_low' => 168,
            'sla_reminder_schedule' => '24,72',
            'login_page_slug' => 'login',
            'primary_color' => '#3b82f6',
            'primary_hover_color' => '#2563eb',
            'lock_highlight_bg' => '#fef3c7',
            'lock_highlight_border' => '#fbbf24',
        ];
        $opts = get_option(self::OPTION_KEY, []);
        if (!is_array($opts)) $opts = [];
        return wp_parse_args($opts, $defaults);
    }

    public static function get_sla_thresholds() : array {
        $o = self::get_settings();
        return [
            'urgent' => intval($o['sla_urgent'] ?? 4),
            'high' => intval($o['sla_high'] ?? 24),
            'medium' => intval($o['sla_medium'] ?? 72),
            'low' => intval($o['sla_low'] ?? 168),
        ];
    }

    public static function field_tile_url() : void {
        $opts = self::get_settings();
        echo '<input type="text" class="regular-text" name="' . esc_attr(self::OPTION_KEY) . '[map_tile_url]" value="' . esc_attr($opts['map_tile_url']) . '" placeholder="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />';
    }

    public static function field_attribution() : void {
        $opts = self::get_settings();
        echo '<textarea class="large-text" rows="3" name="' . esc_attr(self::OPTION_KEY) . '[map_attribution]">' . esc_textarea($opts['map_attribution']) . '</textarea>';
    }

    public static function field_sla_urgent() : void {
        $o = self::get_settings();
        echo '<input type="number" class="small-text" min="1" max="720" name="' . esc_attr(self::OPTION_KEY) . '[sla_urgent]" value="' . esc_attr(intval($o['sla_urgent'])) . '" />';
        echo ' <span class="description">' . esc_html__('Hours to respond for Urgent priority', 'psp') . '</span>';
    }

    public static function field_sla_high() : void {
        $o = self::get_settings();
        echo '<input type="number" class="small-text" min="1" max="720" name="' . esc_attr(self::OPTION_KEY) . '[sla_high]" value="' . esc_attr(intval($o['sla_high'])) . '" />';
        echo ' <span class="description">' . esc_html__('Hours to respond for High priority', 'psp') . '</span>';
    }

    public static function field_sla_medium() : void {
        $o = self::get_settings();
        echo '<input type="number" class="small-text" min="1" max="720" name="' . esc_attr(self::OPTION_KEY) . '[sla_medium]" value="' . esc_attr(intval($o['sla_medium'])) . '" />';
        echo ' <span class="description">' . esc_html__('Hours to respond for Medium priority', 'psp') . '</span>';
    }

    public static function field_sla_low() : void {
        $o = self::get_settings();
        echo '<input type="number" class="small-text" min="1" max="720" name="' . esc_attr(self::OPTION_KEY) . '[sla_low]" value="' . esc_attr(intval($o['sla_low'])) . '" />';
        echo ' <span class="description">' . esc_html__('Hours to respond for Low priority', 'psp') . '</span>';
    }

    public static function field_sla_reminder_schedule() : void {
        $o = self::get_settings();
        echo '<input type="text" class="regular-text" name="' . esc_attr(self::OPTION_KEY) . '[sla_reminder_schedule]" value="' . esc_attr($o['sla_reminder_schedule']) . '" placeholder="24,72" />';
        echo '<p class="description">' . esc_html__('Comma-separated hours after SLA breach to send reminder emails (e.g., 24,72).', 'psp') . '</p>';
    }

    public static function field_login_page_slug() : void {
        $o = self::get_settings();
        echo '<input type="text" class="regular-text" name="' . esc_attr(self::OPTION_KEY) . '[login_page_slug]" value="' . esc_attr($o['login_page_slug']) . '" placeholder="login" />';
        echo '<p class="description">' . esc_html__('Page slug for the login page (default: login). Non-logged-in users will be redirected to this page. Both /login and /portal-login are accepted.', 'psp') . '</p>';
    }

    // Branding fields
    public static function field_primary_color() : void {
        $o = self::get_settings();
        echo '<input type="text" class="regular-text" name="' . esc_attr(self::OPTION_KEY) . '[primary_color]" value="' . esc_attr($o['primary_color']) . '" /> ';
        echo '<input type="color" value="' . esc_attr($o['primary_color']) . '" oninput="this.previousElementSibling.value=this.value" />';
    }
    public static function field_primary_hover_color() : void {
        $o = self::get_settings();
        echo '<input type="text" class="regular-text" name="' . esc_attr(self::OPTION_KEY) . '[primary_hover_color]" value="' . esc_attr($o['primary_hover_color']) . '" /> ';
        echo '<input type="color" value="' . esc_attr($o['primary_hover_color']) . '" oninput="this.previousElementSibling.value=this.value" />';
    }
    public static function field_lock_highlight_bg() : void {
        $o = self::get_settings();
        echo '<input type="text" class="regular-text" name="' . esc_attr(self::OPTION_KEY) . '[lock_highlight_bg]" value="' . esc_attr($o['lock_highlight_bg']) . '" /> ';
        echo '<input type="color" value="' . esc_attr($o['lock_highlight_bg']) . '" oninput="this.previousElementSibling.value=this.value" />';
    }
    public static function field_lock_highlight_border() : void {
        $o = self::get_settings();
        echo '<input type="text" class="regular-text" name="' . esc_attr(self::OPTION_KEY) . '[lock_highlight_border]" value="' . esc_attr($o['lock_highlight_border']) . '" /> ';
        echo '<input type="color" value="' . esc_attr($o['lock_highlight_border']) . '" oninput="this.previousElementSibling.value=this.value" />';
    }
}
