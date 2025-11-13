<?php
/**
 * Admin menus, settings, partner meta boxes, user creation, CSV import
 */
if (!defined('ABSPATH')) { exit; }

class PSP_Admin {
    public static function init() : void {
        add_action('add_meta_boxes', [ __CLASS__, 'add_partner_meta_boxes' ]);
        add_action('add_meta_boxes', [ __CLASS__, 'add_ticket_meta_boxes' ]);
        add_action('add_meta_boxes', [ __CLASS__, 'add_service_record_meta_boxes' ]);
        add_action('save_post_psp_partner', [ __CLASS__, 'save_partner_meta' ], 10, 2);
        add_action('save_post_psp_ticket', [ __CLASS__, 'save_ticket_meta' ], 10, 2);
        add_action('save_post_psp_service_record', [ __CLASS__, 'save_service_record_meta' ], 10, 2);
        add_action('admin_post_psp_create_user', [ __CLASS__, 'handle_create_user' ]);
        add_action('admin_post_psp_import_csv', [ __CLASS__, 'handle_csv_import' ]);
        add_action('admin_post_psp_reset_partner_password', [ __CLASS__, 'handle_reset_partner_password' ]);
    add_action('admin_post_psp_geocode_partners', [ __CLASS__, 'handle_geocode_partners' ]);
        add_action('admin_notices', [ __CLASS__, 'admin_notices' ]);
        // Admin list filters
        add_action('restrict_manage_posts', [ __CLASS__, 'add_assignee_filter' ]);
        add_filter('parse_query', [ __CLASS__, 'apply_assignee_filter' ]);
        
        // Partners list: geocode status column
        add_filter('manage_psp_partner_posts_columns', [ __CLASS__, 'add_partner_geocode_column' ]);
        add_action('manage_psp_partner_posts_custom_column', [ __CLASS__, 'render_partner_geocode_column' ], 10, 2);
        add_action('restrict_manage_posts', [ __CLASS__, 'add_partner_geocode_filter' ]);
        add_filter('parse_query', [ __CLASS__, 'apply_partner_geocode_filter' ]);
        
        // Block password changes for partners
        add_filter('show_password_fields', [ __CLASS__, 'hide_password_fields_for_partners' ], 10, 2);
        add_action('personal_options', [ __CLASS__, 'add_password_reset_notice' ]);
        
        // Dashboard widget
        add_action('wp_dashboard_setup', [ __CLASS__, 'add_dashboard_widget' ]);
    }

    /**
     * Add Assigned To filter dropdown to psp_ticket admin list
     */
    public static function add_assignee_filter($post_type) : void {
        global $typenow;
        if (($typenow ?? $post_type) !== 'psp_ticket') return;
        // Get support and admin users
        $users = get_users([
            'role__in' => ['administrator', 'psp_support'],
            'orderby' => 'display_name',
            'order' => 'ASC',
            'fields' => ['ID','display_name']
        ]);
        $current = isset($_GET['psp_assigned_to']) ? sanitize_text_field($_GET['psp_assigned_to']) : '';
        echo '<label for="psp_assigned_to" class="screen-reader-text">' . esc_html__('Filter by assignee', 'psp') . '</label>';
        echo '<select name="psp_assigned_to" id="psp_assigned_to" class="postform">';
        echo '<option value="">' . esc_html__('All Assignees', 'psp') . '</option>';
        echo '<option value="__unassigned__"' . selected($current, '__unassigned__', false) . '>' . esc_html__('Unassigned', 'psp') . '</option>';
        foreach ($users as $user) {
            printf(
                '<option value="%1$s" %3$s>%2$s</option>',
                esc_attr($user->ID),
                esc_html($user->display_name),
                selected($current, (string) $user->ID, false)
            );
        }
        echo '</select>';
    }

    /**
     * Apply Assigned To filter for psp_ticket queries
     */
    public static function apply_assignee_filter($query) {
        if (!is_admin() || !$query->is_main_query()) return;
        $screen = function_exists('get_current_screen') ? get_current_screen() : null;
        $post_type = isset($_GET['post_type']) ? sanitize_text_field($_GET['post_type']) : ($screen ? $screen->post_type : '');
        if ($post_type !== 'psp_ticket') return;
        if (!isset($_GET['psp_assigned_to']) || $_GET['psp_assigned_to'] === '') return;

        $assigned = sanitize_text_field($_GET['psp_assigned_to']);
        $meta_query = (array) $query->get('meta_query');

        if ($assigned === '__unassigned__') {
            // Show tickets where psp_assigned_to is empty or not set
            $meta_query[] = [
                'relation' => 'OR',
                [ 'key' => 'psp_assigned_to', 'value' => '', 'compare' => '=' ],
                [ 'key' => 'psp_assigned_to', 'compare' => 'NOT EXISTS' ],
            ];
        } else {
            $meta_query[] = [ 'key' => 'psp_assigned_to', 'value' => (string) $assigned, 'compare' => '=' ];
        }

        $query->set('meta_query', $meta_query);
    }

    /**
     * Add geocode status column to Partners list
     */
    public static function add_partner_geocode_column($columns) : array {
        $new = [];
        foreach ($columns as $key => $label) {
            $new[$key] = $label;
            if ($key === 'title') {
                $new['psp_geocode_status'] = __('Map Coords', 'psp');
            }
        }
        return $new;
    }

    /**
     * Render geocode status column content
     */
    public static function render_partner_geocode_column($column, $post_id) : void {
        if ($column !== 'psp_geocode_status') return;
        $lat = get_post_meta($post_id, 'psp_latitude', true);
        $lng = get_post_meta($post_id, 'psp_longitude', true);
        if (!empty($lat) && !empty($lng)) {
            echo '<span style="color:#00a32a;" title="' . esc_attr__('Coordinates present', 'psp') . '">✓</span>';
        } else {
            echo '<span style="color:#dba617;" title="' . esc_attr__('Coordinates missing', 'psp') . '">✗</span>';
        }
    }

    /**
     * Add geocode filter dropdown to Partners list
     */
    public static function add_partner_geocode_filter($post_type) : void {
        global $typenow;
        if (($typenow ?? $post_type) !== 'psp_partner') return;
        $current = isset($_GET['psp_geocode_status']) ? sanitize_text_field($_GET['psp_geocode_status']) : '';
        echo '<label for="psp_geocode_status" class="screen-reader-text">' . esc_html__('Filter by geocode status', 'psp') . '</label>';
        echo '<select name="psp_geocode_status" id="psp_geocode_status" class="postform">';
        echo '<option value="">' . esc_html__('All Coordinates', 'psp') . '</option>';
        echo '<option value="missing"' . selected($current, 'missing', false) . '>' . esc_html__('Missing Coordinates', 'psp') . '</option>';
        echo '<option value="present"' . selected($current, 'present', false) . '>' . esc_html__('Has Coordinates', 'psp') . '</option>';
        echo '</select>';
    }

    /**
     * Apply geocode filter for Partners queries
     */
    public static function apply_partner_geocode_filter($query) {
        if (!is_admin() || !$query->is_main_query()) return;
        $screen = function_exists('get_current_screen') ? get_current_screen() : null;
        $post_type = isset($_GET['post_type']) ? sanitize_text_field($_GET['post_type']) : ($screen ? $screen->post_type : '');
        if ($post_type !== 'psp_partner') return;
        if (!isset($_GET['psp_geocode_status']) || $_GET['psp_geocode_status'] === '') return;

        $filter = sanitize_text_field($_GET['psp_geocode_status']);
        $meta_query = (array) $query->get('meta_query');

        if ($filter === 'missing') {
            // Show partners where coordinates are missing
            $meta_query[] = [
                'relation' => 'OR',
                [ 'key' => 'psp_latitude', 'compare' => 'NOT EXISTS' ],
                [ 'key' => 'psp_latitude', 'value' => '', 'compare' => '=' ],
            ];
        } elseif ($filter === 'present') {
            // Show partners with coordinates
            $meta_query[] = [
                'relation' => 'AND',
                [ 'key' => 'psp_latitude', 'value' => '', 'compare' => '!=' ],
                [ 'key' => 'psp_longitude', 'value' => '', 'compare' => '!=' ],
            ];
        }

        $query->set('meta_query', $meta_query);
    }

    public static function register_menus() : void {
        add_menu_page(
            __('Pool Safe Portal', 'psp'),
            __('Pool Safe', 'psp'),
            'manage_options',
            'psp-admin',
            [ __CLASS__, 'render_dashboard' ],
            'dashicons-admin-site',
            58
        );

        add_submenu_page('psp-admin', __('Tickets', 'psp'), __('Tickets', 'psp'), 'edit_psp_tickets', 'edit.php?post_type=psp_ticket');
        add_submenu_page('psp-admin', __('Partners', 'psp'), __('Partners', 'psp'), 'edit_psp_partners', 'edit.php?post_type=psp_partner');
        add_submenu_page('psp-admin', __('Calendar', 'psp'), __('Calendar', 'psp'), 'edit_psp_calendar_events', 'edit.php?post_type=psp_calendar_event');
        add_submenu_page('psp-admin', __('Settings', 'psp'), __('Settings', 'psp'), 'manage_options', 'psp-settings', [ __CLASS__, 'render_settings' ]);
        add_submenu_page('psp-admin', __('Email', 'psp'), __('Email', 'psp'), 'manage_options', 'psp-email', [ __CLASS__, 'render_email' ]);
        add_submenu_page('psp-admin', __('HubSpot', 'psp'), __('HubSpot', 'psp'), 'manage_options', 'psp-hubspot', [ __CLASS__, 'render_hubspot' ]);
        add_submenu_page('psp-admin', __('Import', 'psp'), __('Import', 'psp'), 'manage_options', 'psp-import', [ 'PSP_Import', 'render_page' ]);
        // Add CSV import page under Partners
        add_submenu_page(
            'edit.php?post_type=psp_partner',
            'Import Partners',
            'Import CSV',
            'manage_options',
            'psp-import-partners',
            [ __CLASS__, 'render_import_page' ]
        );

        // Backfill geocoding utility under Partners
        add_submenu_page(
            'edit.php?post_type=psp_partner',
            __('Geocode from Address', 'psp'),
            __('Geocode from Address', 'psp'),
            'manage_options',
            'psp-geocode-partners',
            [ __CLASS__, 'render_geocode_page' ]
        );
    }

    /**
     * Render geocode utility page
     */
    public static function render_geocode_page() : void {
        if (!current_user_can('manage_options')) { wp_die(__('Insufficient permissions', 'psp')); }
        $ran = isset($_GET['ran']) ? intval($_GET['ran']) : 0;
        ?>
        <div class="wrap">
            <h1><?php echo esc_html__('Geocode Partners from Address', 'psp'); ?></h1>
            <p class="description"><?php echo esc_html__('This tool fills Latitude/Longitude for partners using their Street/City/State/Zip/Country. It processes up to 25 partners per run to respect rate limits.', 'psp'); ?></p>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <?php wp_nonce_field('psp_geocode_partners', 'psp_geocode_nonce'); ?>
                <input type="hidden" name="action" value="psp_geocode_partners" />
                <p><button type="submit" class="button button-primary"><?php echo esc_html__('Run Geocoding (up to 25)', 'psp'); ?></button></p>
            </form>
            <?php if ($ran > 0): ?>
                <div class="notice notice-success"><p><?php echo esc_html(sprintf(__('Processed %d partners. You can run again to continue.', 'psp'), $ran)); ?></p></div>
            <?php endif; ?>
            <p style="margin-top:20px;color:#666;">
                <?php echo esc_html__('Tip: Coordinates are also auto-filled when you save a partner with an address.', 'psp'); ?>
            </p>
        </div>
        <?php
    }

    /**
     * Handle geocoding batch
     */
    public static function handle_geocode_partners() : void {
        if (!current_user_can('manage_options')) { wp_die(__('Insufficient permissions', 'psp')); }
        if (!isset($_POST['psp_geocode_nonce']) || !wp_verify_nonce($_POST['psp_geocode_nonce'], 'psp_geocode_partners')) {
            wp_die(__('Security check failed', 'psp'));
        }

        $args = [
            'post_type' => 'psp_partner',
            'posts_per_page' => 25,
            'post_status' => 'any',
            'meta_query' => [
                'relation' => 'AND',
                [
                    'relation' => 'OR',
                    [ 'key' => 'psp_latitude', 'compare' => 'NOT EXISTS' ],
                    [ 'key' => 'psp_latitude', 'value' => '', 'compare' => '=' ],
                ],
                [
                    'relation' => 'OR',
                    [ 'key' => 'psp_street_address', 'value' => '', 'compare' => '!=' ],
                    [ 'key' => 'psp_city', 'value' => '', 'compare' => '!=' ],
                    [ 'key' => 'psp_state', 'value' => '', 'compare' => '!=' ],
                    [ 'key' => 'psp_zip', 'value' => '', 'compare' => '!=' ],
                    [ 'key' => 'psp_country', 'value' => '', 'compare' => '!=' ],
                ],
            ],
        ];
        $q = new WP_Query($args);
        $processed = 0;
        foreach ($q->posts as $p) {
            $parts = [];
            foreach (['psp_street_address','psp_city','psp_state','psp_zip','psp_country'] as $k) {
                $v = trim((string) get_post_meta($p->ID, $k, true));
                if ($v !== '') $parts[] = $v;
            }
            if (empty($parts)) continue;
            $address = implode(', ', $parts);
            $geo = PSP_Partners::geocode_address($address);
            if ($geo && isset($geo['lat'], $geo['lng'])) {
                update_post_meta($p->ID, 'psp_latitude', (float) $geo['lat']);
                update_post_meta($p->ID, 'psp_longitude', (float) $geo['lng']);
                $processed++;
                // be nice to Nominatim
                sleep(1);
            }
        }
        wp_safe_redirect(add_query_arg(['page' => 'psp-geocode-partners', 'ran' => $processed], admin_url('edit.php?post_type=psp_partner')));
        exit;
    }

    public static function render_dashboard() : void { 
        // Get stats
        $partners_count = wp_count_posts('psp_partner');
        $tickets_count = wp_count_posts('psp_ticket');
        $calendar_count = wp_count_posts('psp_calendar_event');
        $service_count = wp_count_posts('psp_service_record');
        
        $total_partners = ($partners_count->publish ?? 0) + ($partners_count->draft ?? 0);
        $total_tickets = ($tickets_count->publish ?? 0) + ($tickets_count->draft ?? 0);
        $total_events = ($calendar_count->publish ?? 0);
        $total_services = ($service_count->publish ?? 0);
        
        // Check integration status
        $hubspot_configured = class_exists('PSP_HubSpot') && PSP_HubSpot::is_configured();
        $email_settings = class_exists('PSP_Email') ? PSP_Email::get_settings() : [];
        $email_configured = !empty($email_settings['smtp_enabled']);
        ?>
        <div class="wrap">
            <h1><?php echo esc_html__('Pool Safe Portal', 'psp'); ?></h1>
            <p class="description"><?php echo esc_html__('Welcome to the Pool Safe Partner & Support Portal plugin.', 'psp'); ?></p>
            
            <!-- Stats Grid -->
            <div class="psp-stats-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin:30px 0;">
                <div class="psp-stat-card" style="background:#fff;border:1px solid #ccd0d4;border-radius:4px;padding:20px;box-shadow:0 1px 1px rgba(0,0,0,0.04);">
                    <div style="font-size:14px;color:#666;margin-bottom:8px;">📍 <?php echo esc_html__('Partners', 'psp'); ?></div>
                    <div style="font-size:32px;font-weight:600;color:#0073aa;"><?php echo esc_html($total_partners); ?></div>
                    <a href="<?php echo esc_url(admin_url('edit.php?post_type=psp_partner')); ?>" class="button button-small" style="margin-top:12px;"><?php echo esc_html__('View All', 'psp'); ?></a>
                </div>
                
                <div class="psp-stat-card" style="background:#fff;border:1px solid #ccd0d4;border-radius:4px;padding:20px;box-shadow:0 1px 1px rgba(0,0,0,0.04);">
                    <div style="font-size:14px;color:#666;margin-bottom:8px;">🎫 <?php echo esc_html__('Tickets', 'psp'); ?></div>
                    <div style="font-size:32px;font-weight:600;color:#00a32a;"><?php echo esc_html($total_tickets); ?></div>
                    <a href="<?php echo esc_url(admin_url('edit.php?post_type=psp_ticket')); ?>" class="button button-small" style="margin-top:12px;"><?php echo esc_html__('View All', 'psp'); ?></a>
                </div>
                
                <div class="psp-stat-card" style="background:#fff;border:1px solid #ccd0d4;border-radius:4px;padding:20px;box-shadow:0 1px 1px rgba(0,0,0,0.04);">
                    <div style="font-size:14px;color:#666;margin-bottom:8px;">📅 <?php echo esc_html__('Calendar Events', 'psp'); ?></div>
                    <div style="font-size:32px;font-weight:600;color:#f0b849;"><?php echo esc_html($total_events); ?></div>
                    <a href="<?php echo esc_url(admin_url('edit.php?post_type=psp_calendar_event')); ?>" class="button button-small" style="margin-top:12px;"><?php echo esc_html__('View All', 'psp'); ?></a>
                </div>
                
                <div class="psp-stat-card" style="background:#fff;border:1px solid #ccd0d4;border-radius:4px;padding:20px;box-shadow:0 1px 1px rgba(0,0,0,0.04);">
                    <div style="font-size:14px;color:#666;margin-bottom:8px;">🚗 <?php echo esc_html__('Service Records', 'psp'); ?></div>
                    <div style="font-size:32px;font-weight:600;color:#d63638;"><?php echo esc_html($total_services); ?></div>
                    <a href="<?php echo esc_url(admin_url('edit.php?post_type=psp_service_record')); ?>" class="button button-small" style="margin-top:12px;"><?php echo esc_html__('View All', 'psp'); ?></a>
                </div>
            </div>
            
            <!-- Integration Status -->
            <div style="background:#fff;border:1px solid #ccd0d4;border-radius:4px;padding:20px;margin:20px 0;box-shadow:0 1px 1px rgba(0,0,0,0.04);">
                <h2 style="margin-top:0;"><?php echo esc_html__('Integration Status', 'psp'); ?></h2>
                <table class="wp-list-table widefat fixed striped">
                    <thead>
                        <tr>
                            <th><?php echo esc_html__('Integration', 'psp'); ?></th>
                            <th><?php echo esc_html__('Status', 'psp'); ?></th>
                            <th><?php echo esc_html__('Action', 'psp'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>📧 <?php echo esc_html__('Email / SMTP', 'psp'); ?></td>
                            <td>
                                <?php if ($email_configured): ?>
                                    <span style="color:#00a32a;font-weight:600;">✓ <?php echo esc_html__('Configured', 'psp'); ?></span>
                                <?php else: ?>
                                    <span style="color:#dba617;font-weight:600;">○ <?php echo esc_html__('Not Configured', 'psp'); ?></span>
                                <?php endif; ?>
                            </td>
                            <td><a href="<?php echo esc_url(admin_url('admin.php?page=psp-email')); ?>" class="button button-small"><?php echo esc_html__('Configure', 'psp'); ?></a></td>
                        </tr>
                        <tr>
                            <td>🔗 <?php echo esc_html__('HubSpot CRM', 'psp'); ?></td>
                            <td>
                                <?php if ($hubspot_configured): ?>
                                    <span style="color:#00a32a;font-weight:600;">✓ <?php echo esc_html__('Connected', 'psp'); ?></span>
                                <?php else: ?>
                                    <span style="color:#dba617;font-weight:600;">○ <?php echo esc_html__('Not Connected', 'psp'); ?></span>
                                <?php endif; ?>
                            </td>
                            <td><a href="<?php echo esc_url(admin_url('admin.php?page=psp-hubspot')); ?>" class="button button-small"><?php echo esc_html__('Configure', 'psp'); ?></a></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <!-- Quick Links -->
            <div style="background:#fff;border:1px solid #ccd0d4;border-radius:4px;padding:20px;box-shadow:0 1px 1px rgba(0,0,0,0.04);">
                <h2 style="margin-top:0;"><?php echo esc_html__('Quick Actions', 'psp'); ?></h2>
                <ul style="list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:15px;">
                    <li>
                        <a href="<?php echo esc_url(admin_url('edit.php?post_type=psp_ticket')); ?>" class="button button-primary button-large" style="width:100%;">
                            🎫 <?php echo esc_html__('Manage Tickets', 'psp'); ?>
                        </a>
                    </li>
                    <li>
                        <a href="<?php echo esc_url(admin_url('edit.php?post_type=psp_partner')); ?>" class="button button-primary button-large" style="width:100%;">
                            📍 <?php echo esc_html__('Manage Partners', 'psp'); ?>
                        </a>
                    </li>
                    <li>
                        <a href="<?php echo esc_url(admin_url('admin.php?page=psp-import')); ?>" class="button button-secondary button-large" style="width:100%;">
                            📥 <?php echo esc_html__('Import Partners (CSV)', 'psp'); ?>
                        </a>
                    </li>
                    <li>
                        <a href="<?php echo esc_url(admin_url('admin.php?page=psp-settings')); ?>" class="button button-secondary button-large" style="width:100%;">
                            ⚙️ <?php echo esc_html__('Settings', 'psp'); ?>
                        </a>
                    </li>
                </ul>
            </div>
            
            <!-- Getting Started -->
            <div style="background:#e5f5fa;border:1px solid #0073aa;border-radius:4px;padding:20px;margin:20px 0;">
                <h2 style="margin-top:0;color:#0073aa;">🚀 <?php echo esc_html__('Getting Started', 'psp'); ?></h2>
                <ol style="line-height:2;">
                    <li><?php echo esc_html__('Configure settings (Map, Email, HubSpot)', 'psp'); ?></li>
                    <li><?php echo esc_html__('Import partners via CSV or add manually', 'psp'); ?></li>
                    <li><?php echo sprintf(
                        /* translators: %s: shortcode */
                        esc_html__('Add %s shortcode to a page', 'psp'),
                        '<code>[poolsafe_portal]</code>'
                    ); ?></li>
                    <li><?php echo esc_html__('Create WordPress user accounts for partners', 'psp'); ?></li>
                </ol>
                <a href="<?php echo esc_url(plugin_dir_url(PSP_PLUGIN_FILE) . 'QUICK-START.md'); ?>" class="button button-primary" target="_blank">
                    📖 <?php echo esc_html__('View Quick Start Guide', 'psp'); ?>
                </a>
            </div>
        </div>
    <?php }

    public static function render_settings() : void { ?>
        <div class="wrap">
            <h1><?php echo esc_html__('Pool Safe Settings', 'psp'); ?></h1>
            <form method="post" action="options.php">
                <?php
                settings_fields('psp_settings_group');
                do_settings_sections('psp-settings');
                submit_button();
                ?>
            </form>
        </div>
    <?php }

    public static function render_email() : void { ?>
        <div class="wrap">
            <h1><?php echo esc_html__('Email & SMTP Settings', 'psp'); ?></h1>
            <form method="post" action="options.php">
                <?php
                settings_fields('psp_email_group');
                do_settings_sections('psp-email');
                submit_button();
                ?>
            </form>
        </div>
    <?php }

    public static function render_hubspot() : void { ?>
        <div class="wrap">
            <h1><?php echo esc_html__('HubSpot CRM Integration', 'psp'); ?></h1>
            <form method="post" action="options.php">
                <?php
                settings_fields('psp_hubspot_group');
                do_settings_sections('psp-hubspot');
                submit_button();
                ?>
            </form>
        </div>
    <?php }

    // Partner meta boxes and admin UI
    public static function add_partner_meta_boxes() : void {
        add_meta_box('psp_company_info', 'Company Information', [ __CLASS__, 'render_company_info' ], 'psp_partner', 'normal', 'high');
        add_meta_box('psp_installation_operation', 'Installation & Operation', [ __CLASS__, 'render_installation_operation' ], 'psp_partner', 'normal', 'high');
        add_meta_box('psp_address_info', 'Address & Location', [ __CLASS__, 'render_address_info' ], 'psp_partner', 'normal', 'high');
        add_meta_box('psp_amenities', 'Amenities', [ __CLASS__, 'render_amenities' ], 'psp_partner', 'side', 'default');
        add_meta_box('psp_lock_info', 'Lock Information (Admin Only)', [ __CLASS__, 'render_lock_info' ], 'psp_partner', 'normal', 'default');
        add_meta_box('psp_user_actions', 'User Account', [ __CLASS__, 'render_user_actions' ], 'psp_partner', 'side', 'default');
    }

    // Ticket meta boxes
    public static function add_ticket_meta_boxes() : void {
        add_meta_box('psp_ticket_details', 'Ticket Details', [ __CLASS__, 'render_ticket_details' ], 'psp_ticket', 'normal', 'high');
        add_meta_box('psp_ticket_contact', 'Contact Information', [ __CLASS__, 'render_ticket_contact' ], 'psp_ticket', 'normal', 'high');
        add_meta_box('psp_ticket_status', 'Status & Priority', [ __CLASS__, 'render_ticket_status' ], 'psp_ticket', 'side', 'high');
        add_meta_box('psp_ticket_activity', 'Activity Log', [ __CLASS__, 'render_ticket_activity' ], 'psp_ticket', 'normal', 'default');
    }

    public static function render_ticket_details($post) : void {
        wp_nonce_field('psp_save_ticket', 'psp_ticket_nonce');
        $category = get_post_meta($post->ID, 'psp_category', true);
        $severity = get_post_meta($post->ID, 'psp_severity', true);
        $units_affected = get_post_meta($post->ID, 'psp_units_affected', true);
        $video_link = get_post_meta($post->ID, 'psp_video_link', true);
        $resort_name = get_post_meta($post->ID, 'psp_resort_name', true);
        $partner_id = get_post_meta($post->ID, 'psp_partner_id', true);
        ?>
        <table class="form-table">
            <tr>
                <th><label for="psp_partner_id">Partner</label></th>
                <td>
                    <select id="psp_partner_id" name="psp_partner_id" class="regular-text">
                        <option value="">Select Partner...</option>
                        <?php
                        $partners = get_posts(['post_type' => 'psp_partner', 'posts_per_page' => -1, 'orderby' => 'title', 'order' => 'ASC']);
                        foreach ($partners as $partner) {
                            $selected = ($partner->ID == $partner_id) ? 'selected' : '';
                            echo '<option value="' . esc_attr($partner->ID) . '" ' . $selected . '>' . esc_html(get_the_title($partner)) . '</option>';
                        }
                        ?>
                    </select>
                </td>
            </tr>
            <tr>
                <th><label for="psp_category">Category</label></th>
                <td>
                    <select id="psp_category" name="psp_category">
                        <option value="">Select...</option>
                        <option value="maintenance" <?php selected($category, 'maintenance'); ?>>Maintenance</option>
                        <option value="repair" <?php selected($category, 'repair'); ?>>Repair</option>
                        <option value="installation" <?php selected($category, 'installation'); ?>>Installation</option>
                        <option value="inspection" <?php selected($category, 'inspection'); ?>>Inspection</option>
                        <option value="support" <?php selected($category, 'support'); ?>>Support</option>
                        <option value="other" <?php selected($category, 'other'); ?>>Other</option>
                    </select>
                </td>
            </tr>
            <tr>
                <th><label for="psp_severity">Severity</label></th>
                <td>
                    <select id="psp_severity" name="psp_severity">
                        <option value="">Select...</option>
                        <option value="low" <?php selected($severity, 'low'); ?>>Low</option>
                        <option value="medium" <?php selected($severity, 'medium'); ?>>Medium</option>
                        <option value="high" <?php selected($severity, 'high'); ?>>High</option>
                        <option value="critical" <?php selected($severity, 'critical'); ?>>Critical</option>
                    </select>
                </td>
            </tr>
            <tr>
                <th><label for="psp_units_affected">Units Affected</label></th>
                <td><input type="text" id="psp_units_affected" name="psp_units_affected" value="<?php echo esc_attr($units_affected); ?>" class="regular-text" placeholder="e.g., 5 units" /></td>
            </tr>
            <tr>
                <th><label for="psp_resort_name">Resort Name</label></th>
                <td><input type="text" id="psp_resort_name" name="psp_resort_name" value="<?php echo esc_attr($resort_name); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="psp_video_link">Video Link</label></th>
                <td><input type="url" id="psp_video_link" name="psp_video_link" value="<?php echo esc_attr($video_link); ?>" class="regular-text" placeholder="https://..." /></td>
            </tr>
        </table>
        <?php
    }

    public static function render_ticket_contact($post) : void {
        $first_name = get_post_meta($post->ID, 'psp_first_name', true);
        $last_name = get_post_meta($post->ID, 'psp_last_name', true);
        $position = get_post_meta($post->ID, 'psp_position', true);
        $contact_email = get_post_meta($post->ID, 'psp_contact_email', true);
        $contact_number = get_post_meta($post->ID, 'psp_contact_number', true);
        ?>
        <table class="form-table">
            <tr>
                <th><label for="psp_first_name">First Name</label></th>
                <td><input type="text" id="psp_first_name" name="psp_first_name" value="<?php echo esc_attr($first_name); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="psp_last_name">Last Name</label></th>
                <td><input type="text" id="psp_last_name" name="psp_last_name" value="<?php echo esc_attr($last_name); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="psp_position">Position</label></th>
                <td><input type="text" id="psp_position" name="psp_position" value="<?php echo esc_attr($position); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="psp_contact_email">Contact Email</label></th>
                <td><input type="email" id="psp_contact_email" name="psp_contact_email" value="<?php echo esc_attr($contact_email); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="psp_contact_number">Contact Number</label></th>
                <td><input type="tel" id="psp_contact_number" name="psp_contact_number" value="<?php echo esc_attr($contact_number); ?>" class="regular-text" /></td>
            </tr>
        </table>
        <?php
    }

    public static function render_ticket_status($post) : void {
        $status = get_post_meta($post->ID, 'psp_status', true);
        $priority = get_post_meta($post->ID, 'psp_priority', true);
        $assigned_to = get_post_meta($post->ID, 'psp_assigned_to', true);
        if (empty($status)) $status = 'open';
        if (empty($priority)) $priority = 'medium';
        
        // Get support users and admins
        $support_users = get_users([
            'role__in' => ['psp_support', 'administrator'],
            'orderby' => 'display_name',
            'order' => 'ASC'
        ]);
        ?>
        <p>
            <label for="psp_status"><strong>Status</strong></label><br/>
            <select id="psp_status" name="psp_status" style="width:100%;">
                <option value="open" <?php selected($status, 'open'); ?>>Open</option>
                <option value="in_progress" <?php selected($status, 'in_progress'); ?>>In Progress</option>
                <option value="pending" <?php selected($status, 'pending'); ?>>Pending</option>
                <option value="resolved" <?php selected($status, 'resolved'); ?>>Resolved</option>
                <option value="closed" <?php selected($status, 'closed'); ?>>Closed</option>
            </select>
        </p>
        <p>
            <label for="psp_priority"><strong>Priority</strong></label><br/>
            <select id="psp_priority" name="psp_priority" style="width:100%;">
                <option value="low" <?php selected($priority, 'low'); ?>>Low</option>
                <option value="medium" <?php selected($priority, 'medium'); ?>>Medium</option>
                <option value="high" <?php selected($priority, 'high'); ?>>High</option>
                <option value="urgent" <?php selected($priority, 'urgent'); ?>>Urgent</option>
            </select>
        </p>
        <p>
            <label for="psp_assigned_to"><strong>Assigned To</strong></label><br/>
            <select id="psp_assigned_to" name="psp_assigned_to" style="width:100%;">
                <option value="">— Unassigned —</option>
                <?php foreach ($support_users as $user): ?>
                    <option value="<?php echo esc_attr($user->ID); ?>" <?php selected($assigned_to, $user->ID); ?>>
                        <?php echo esc_html($user->display_name); ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </p>
        <p class="description">Use comments below to add internal notes and communicate with the partner.</p>
        <?php
    }

    public static function render_ticket_activity($post) : void {
        $activities = self::get_activity_log($post->ID, 50);
        ?>
        <style>
            .psp-activity-log { margin: 0; padding: 0; }
            .psp-activity-filters { margin-bottom: 15px; }
            .psp-activity-item { 
                padding: 12px; 
                border-left: 3px solid #ddd; 
                margin-bottom: 10px;
                background: #f9f9f9;
                position: relative;
            }
            .psp-activity-item.action-status_change { border-left-color: #3b82f6; }
            .psp-activity-item.action-priority_change { border-left-color: #f59e0b; }
            .psp-activity-item.action-assignment { border-left-color: #10b981; }
            .psp-activity-item.action-comment { border-left-color: #6366f1; }
            .psp-activity-item.action-created { border-left-color: #8b5cf6; }
            .psp-activity-header { 
                display: flex; 
                justify-content: space-between; 
                align-items: center;
                margin-bottom: 5px;
            }
            .psp-activity-user { font-weight: 600; color: #1e293b; }
            .psp-activity-time { font-size: 12px; color: #64748b; }
            .psp-activity-action { color: #334155; margin-bottom: 5px; }
            .psp-activity-meta { 
                font-size: 12px; 
                color: #94a3b8; 
                margin-top: 5px;
                display: flex;
                gap: 15px;
            }
            .psp-no-activity { 
                text-align: center; 
                padding: 30px; 
                color: #94a3b8; 
            }
        </style>
        
        <div class="psp-activity-log">
            <div class="psp-activity-filters">
                <label>
                    Filter by action: 
                    <select id="psp-activity-filter" style="margin-left: 10px;">
                        <option value="">All Activities</option>
                        <option value="created">Created</option>
                        <option value="status_change">Status Changes</option>
                        <option value="priority_change">Priority Changes</option>
                        <option value="assignment">Assignments</option>
                        <option value="comment">Comments</option>
                    </select>
                </label>
            </div>
            
            <?php if (empty($activities)) : ?>
                <div class="psp-no-activity">No activity recorded yet.</div>
            <?php else : ?>
                <div id="psp-activity-list">
                    <?php foreach ($activities as $activity) : 
                        $user = get_userdata($activity->user_id);
                        $user_name = $user ? $user->display_name : 'System';
                        $metadata = maybe_unserialize($activity->metadata);
                        $action_class = 'action-' . esc_attr($activity->action);
                    ?>
                        <div class="psp-activity-item <?php echo $action_class; ?>" data-action="<?php echo esc_attr($activity->action); ?>">
                            <div class="psp-activity-header">
                                <span class="psp-activity-user"><?php echo esc_html($user_name); ?></span>
                                <span class="psp-activity-time"><?php echo esc_html(human_time_diff(strtotime($activity->created_at), current_time('timestamp')) . ' ago'); ?></span>
                            </div>
                            <div class="psp-activity-action">
                                <?php 
                                switch ($activity->action) {
                                    case 'created':
                                        echo 'Created this ticket';
                                        break;
                                    case 'status_change':
                                        echo 'Changed status';
                                        if (!empty($metadata['old_value']) && !empty($metadata['new_value'])) {
                                            echo ' from <strong>' . esc_html($metadata['old_value']) . '</strong> to <strong>' . esc_html($metadata['new_value']) . '</strong>';
                                        }
                                        break;
                                    case 'priority_change':
                                        echo 'Changed priority';
                                        if (!empty($metadata['old_value']) && !empty($metadata['new_value'])) {
                                            echo ' from <strong>' . esc_html($metadata['old_value']) . '</strong> to <strong>' . esc_html($metadata['new_value']) . '</strong>';
                                        }
                                        break;
                                    case 'assignment':
                                        if (!empty($metadata['assigned_to'])) {
                                            $assigned_user = get_userdata($metadata['assigned_to']);
                                            echo 'Assigned to <strong>' . esc_html($assigned_user ? $assigned_user->display_name : 'Unknown') . '</strong>';
                                        }
                                        break;
                                    case 'comment':
                                        echo 'Added a comment';
                                        break;
                                    default:
                                        echo esc_html(ucfirst(str_replace('_', ' ', $activity->action)));
                                }
                                ?>
                            </div>
                            <div class="psp-activity-meta">
                                <?php if (!empty($activity->ip_address)) : ?>
                                    <span>IP: <?php echo esc_html($activity->ip_address); ?></span>
                                <?php endif; ?>
                                <?php if (!empty($activity->user_agent)) : ?>
                                    <span title="<?php echo esc_attr($activity->user_agent); ?>">
                                        <?php 
                                        // Extract browser name
                                        if (strpos($activity->user_agent, 'Chrome') !== false) echo 'Chrome';
                                        elseif (strpos($activity->user_agent, 'Firefox') !== false) echo 'Firefox';
                                        elseif (strpos($activity->user_agent, 'Safari') !== false) echo 'Safari';
                                        elseif (strpos($activity->user_agent, 'Edge') !== false) echo 'Edge';
                                        else echo 'Browser';
                                        ?>
                                    </span>
                                <?php endif; ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
                
                <script>
                document.addEventListener('DOMContentLoaded', function() {
                    const filter = document.getElementById('psp-activity-filter');
                    const items = document.querySelectorAll('.psp-activity-item');
                    
                    if (filter) {
                        filter.addEventListener('change', function() {
                            const selectedAction = this.value;
                            
                            items.forEach(function(item) {
                                if (selectedAction === '' || item.dataset.action === selectedAction) {
                                    item.style.display = 'block';
                                } else {
                                    item.style.display = 'none';
                                }
                            });
                        });
                    }
                });
                </script>
            <?php endif; ?>
        </div>
        <?php
    }

    public static function save_ticket_meta($post_id, $post) : void {
        if (!isset($_POST['psp_ticket_nonce']) || !wp_verify_nonce($_POST['psp_ticket_nonce'], 'psp_save_ticket')) return;
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
        if (!current_user_can('edit_psp_ticket', $post_id)) return;

        $fields = [
            'psp_status', 'psp_priority', 'psp_partner_id', 'psp_category', 'psp_severity',
            'psp_units_affected', 'psp_resort_name', 'psp_video_link',
            'psp_first_name', 'psp_last_name', 'psp_position', 'psp_contact_email', 'psp_contact_number'
        ];
        
        foreach ($fields as $field) {
            if (isset($_POST[$field])) {
                $value = sanitize_text_field($_POST[$field]);
                if ($field === 'psp_video_link') {
                    $value = esc_url_raw($_POST[$field]);
                } elseif ($field === 'psp_contact_email') {
                    $value = sanitize_email($_POST[$field]);
                } elseif ($field === 'psp_partner_id') {
                    $value = intval($_POST[$field]);
                }
                update_post_meta($post_id, $field, $value);
            }
        }
        
        // Handle assignment
        $old_assignee = get_post_meta($post_id, 'psp_assigned_to', true);
        $new_assignee = isset($_POST['psp_assigned_to']) ? intval($_POST['psp_assigned_to']) : 0;
        
        if ($new_assignee !== $old_assignee) {
            update_post_meta($post_id, 'psp_assigned_to', $new_assignee);
            
            // Send email notification to newly assigned user
            if ($new_assignee > 0 && class_exists('PSP_Email')) {
                $assignee = get_userdata($new_assignee);
                if ($assignee) {
                    $ticket_title = get_the_title($post_id);
                    $ticket_url = admin_url('post.php?post=' . $post_id . '&action=edit');
                    $partner_id = get_post_meta($post_id, 'psp_partner_id', true);
                    $partner_name = $partner_id ? get_the_title($partner_id) : 'Unknown';
                    
                    $subject = "Ticket Assigned: {$ticket_title}";
                    $message = "Hello {$assignee->display_name},\n\n";
                    $message .= "A support ticket has been assigned to you:\n\n";
                    $message .= "Ticket: {$ticket_title}\n";
                    $message .= "Partner: {$partner_name}\n";
                    $message .= "Priority: " . get_post_meta($post_id, 'psp_priority', true) . "\n";
                    $message .= "Status: " . get_post_meta($post_id, 'psp_status', true) . "\n\n";
                    $message .= "View ticket: {$ticket_url}\n\n";
                    $message .= "Please review and take action as needed.";
                    
                    PSP_Email::send($assignee->user_email, $subject, $message);
                    
                    // Log activity
                    self::log_activity($post_id, 'ticket_assigned', [
                        'assignee_id' => $new_assignee,
                        'assignee_name' => $assignee->display_name,
                        'assigned_by' => get_current_user_id()
                    ]);
                }
            }
        }
        
        // Track status change for email notifications
        $current_status = get_post_meta($post_id, 'psp_status', true);
        update_post_meta($post_id, '_psp_previous_status', $current_status);
    }


    public static function render_company_info($post) : void {
        wp_nonce_field('psp_save_partner', 'psp_partner_nonce');
        $company_name = get_post_meta($post->ID, 'psp_company_name', true);
        $management_company = get_post_meta($post->ID, 'psp_management_company', true);
        $units = get_post_meta($post->ID, 'psp_units', true);
        if ($units === '' || $units === null) {
            $units = get_post_meta($post->ID, 'psp_number_of_lounge_units', true);
        }
        $top_colour = get_post_meta($post->ID, 'psp_top_colour', true);
        $company_email = get_post_meta($post->ID, 'psp_company_email', true);
        $phone_number = get_post_meta($post->ID, 'psp_phone_number', true);
        ?>
        <table class="form-table">
            <tr>
                <th><label for="psp_company_name">Company Name</label></th>
                <td><input type="text" id="psp_company_name" name="psp_company_name" value="<?php echo esc_attr($company_name); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="psp_management_company">Management Company</label></th>
                <td><input type="text" id="psp_management_company" name="psp_management_company" value="<?php echo esc_attr($management_company); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="psp_units">Units</label></th>
                <td><input type="number" id="psp_units" name="psp_units" value="<?php echo esc_attr($units); ?>" class="small-text" /></td>
            </tr>
            <tr>
                <th><label for="psp_top_colour">Top Colour</label></th>
                <td>
                    <select id="psp_top_colour" name="psp_top_colour">
                        <option value="">Select...</option>
                        <option value="Ducati Red" <?php selected($top_colour, 'Ducati Red'); ?>>Ducati Red</option>
                        <option value="Classic Blue" <?php selected($top_colour, 'Classic Blue'); ?>>Classic Blue</option>
                        <option value="Ice Blue" <?php selected($top_colour, 'Ice Blue'); ?>>Ice Blue</option>
                        <option value="Yellow" <?php selected($top_colour, 'Yellow'); ?>>Yellow</option>
                        <option value="Custom" <?php selected($top_colour, 'Custom'); ?>>Custom</option>
                    </select>
                </td>
            </tr>
            <tr>
                <th><label for="psp_company_email">Company Email</label></th>
                <td><input type="email" id="psp_company_email" name="psp_company_email" value="<?php echo esc_attr($company_email); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="psp_phone_number">Phone Number</label></th>
                <td><input type="text" id="psp_phone_number" name="psp_phone_number" value="<?php echo esc_attr($phone_number); ?>" class="regular-text" /></td>
            </tr>
        </table>
        <?php
    }

    public static function render_installation_operation($post) : void {
        $installation_date = get_post_meta($post->ID, 'psp_installation_date', true);
        $operation_type = get_post_meta($post->ID, 'psp_operation_type', true);
        $seasonal_open = get_post_meta($post->ID, 'psp_seasonal_open_date', true);
        $seasonal_close = get_post_meta($post->ID, 'psp_seasonal_close_date', true);
        $is_active = get_post_meta($post->ID, 'psp_is_active', true);
        
        // Default to year_round if not set
        if (empty($operation_type)) {
            $operation_type = 'year_round';
        }
        ?>
        <style>
            .seasonal-dates { margin-top: 10px; }
            .seasonal-dates.hidden { display: none; }
        </style>
        
        <table class="form-table">
            <tr>
                <th><label for="psp_installation_date">Installation Date</label></th>
                <td>
                    <input type="date" id="psp_installation_date" name="psp_installation_date" value="<?php echo esc_attr($installation_date); ?>" class="regular-text" />
                    <p class="description">Date when Pool Safe lounges were installed at this location.</p>
                </td>
            </tr>
            <tr>
                <th><label for="psp_operation_type">Operation Type</label></th>
                <td>
                    <select id="psp_operation_type" name="psp_operation_type" onchange="toggleSeasonalDates(this.value)">
                        <option value="year_round" <?php selected($operation_type, 'year_round'); ?>>Year Round</option>
                        <option value="seasonal" <?php selected($operation_type, 'seasonal'); ?>>Seasonal</option>
                    </select>
                    <p class="description">Is this partner open year-round or only seasonally?</p>
                </td>
            </tr>
        </table>
        
        <div id="seasonal-dates-section" class="seasonal-dates <?php echo ($operation_type !== 'seasonal') ? 'hidden' : ''; ?>">
            <table class="form-table">
                <tr>
                    <th><label for="psp_seasonal_open_date">Season Open Date</label></th>
                    <td>
                        <input type="text" id="psp_seasonal_open_date" name="psp_seasonal_open_date" value="<?php echo esc_attr($seasonal_open); ?>" class="regular-text" placeholder="e.g., April 1 or 04-01" />
                        <p class="description">When does the season typically start? (Month-Day format)</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="psp_seasonal_close_date">Season Close Date</label></th>
                    <td>
                        <input type="text" id="psp_seasonal_close_date" name="psp_seasonal_close_date" value="<?php echo esc_attr($seasonal_close); ?>" class="regular-text" placeholder="e.g., October 31 or 10-31" />
                        <p class="description">When does the season typically end? (Month-Day format)</p>
                    </td>
                </tr>
            </table>
        </div>
        
        <table class="form-table">
            <tr>
                <th><label for="psp_is_active">Currently Active</label></th>
                <td>
                    <label>
                        <input type="checkbox" id="psp_is_active" name="psp_is_active" value="1" <?php checked($is_active, '1'); ?> />
                        Partner is currently operational
                    </label>
                    <p class="description">Uncheck if temporarily closed, out of service, or contract ended.</p>
                </td>
            </tr>
        </table>
        
        <script>
        function toggleSeasonalDates(operationType) {
            const seasonalSection = document.getElementById('seasonal-dates-section');
            if (operationType === 'seasonal') {
                seasonalSection.classList.remove('hidden');
            } else {
                seasonalSection.classList.add('hidden');
            }
        }
        
        // Initialize on page load
        document.addEventListener('DOMContentLoaded', function() {
            const operationType = document.getElementById('psp_operation_type').value;
            toggleSeasonalDates(operationType);
        });
        </script>
        <?php
    }

    public static function render_address_info($post) : void {
        $street = get_post_meta($post->ID, 'psp_street_address', true);
        $city = get_post_meta($post->ID, 'psp_city', true);
        $state = get_post_meta($post->ID, 'psp_state', true);
        $zip = get_post_meta($post->ID, 'psp_zip', true);
        $country = get_post_meta($post->ID, 'psp_country', true);
        $lat = get_post_meta($post->ID, 'psp_latitude', true);
        $lng = get_post_meta($post->ID, 'psp_longitude', true);
        ?>
        <table class="form-table">
            <tr>
                <th><label for="psp_street_address">Street Address</label></th>
                <td><input type="text" id="psp_street_address" name="psp_street_address" value="<?php echo esc_attr($street); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="psp_city">City</label></th>
                <td><input type="text" id="psp_city" name="psp_city" value="<?php echo esc_attr($city); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="psp_state">State</label></th>
                <td><input type="text" id="psp_state" name="psp_state" value="<?php echo esc_attr($state); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="psp_zip">Zip/Postal Code</label></th>
                <td><input type="text" id="psp_zip" name="psp_zip" value="<?php echo esc_attr($zip); ?>" class="small-text" /></td>
            </tr>
            <tr>
                <th><label for="psp_country">Country</label></th>
                <td><input type="text" id="psp_country" name="psp_country" value="<?php echo esc_attr($country); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="psp_latitude">Latitude</label></th>
                <td>
                    <input type="text" id="psp_latitude" name="psp_latitude" value="<?php echo esc_attr($lat); ?>" class="regular-text" />
                    <p class="description">Leave blank to auto-geocode from address on save.</p>
                </td>
            </tr>
            <tr>
                <th><label for="psp_longitude">Longitude</label></th>
                <td>
                    <input type="text" id="psp_longitude" name="psp_longitude" value="<?php echo esc_attr($lng); ?>" class="regular-text" />
                    <p class="description">Leave blank to auto-geocode from address on save.</p>
                </td>
            </tr>
        </table>
        <?php
    }

    public static function render_amenities($post) : void {
        $fb = (bool) get_post_meta($post->ID, 'psp_has_fb_call_button', true);
        $usb = (bool) get_post_meta($post->ID, 'psp_has_usb_charging', true);
        $lock = (bool) get_post_meta($post->ID, 'psp_has_safe_lock', true);
        ?>
        <p><label><input type="checkbox" name="psp_has_fb_call_button" value="1" <?php checked($fb); ?> /> F&B Call Button</label></p>
        <p><label><input type="checkbox" name="psp_has_usb_charging" value="1" <?php checked($usb); ?> /> USB Charging</label></p>
        <p><label><input type="checkbox" name="psp_has_safe_lock" value="1" <?php checked($lock); ?> /> Safe Lock</label></p>
        <?php
    }

    public static function render_lock_info($post) : void {
        $lock_make = get_post_meta($post->ID, 'psp_lock_make', true);
        $master = get_post_meta($post->ID, 'psp_master_code', true);
        $sub_master = get_post_meta($post->ID, 'psp_sub_master_code', true);
        $part = get_post_meta($post->ID, 'psp_lock_part', true);
        $key = get_post_meta($post->ID, 'psp_key', true);
        ?>
        <table class="form-table">
            <tr>
                <th><label for="psp_lock_make">Lock Make</label></th>
                <td><input type="text" id="psp_lock_make" name="psp_lock_make" value="<?php echo esc_attr($lock_make); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="psp_master_code">Master Code</label></th>
                <td><input type="text" id="psp_master_code" name="psp_master_code" value="<?php echo esc_attr($master); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="psp_sub_master_code">Sub-Master Code</label></th>
                <td><input type="text" id="psp_sub_master_code" name="psp_sub_master_code" value="<?php echo esc_attr($sub_master); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="psp_lock_part">Lock Part</label></th>
                <td><input type="text" id="psp_lock_part" name="psp_lock_part" value="<?php echo esc_attr($part); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="psp_key">Key</label></th>
                <td><input type="text" id="psp_key" name="psp_key" value="<?php echo esc_attr($key); ?>" class="regular-text" /></td>
            </tr>
        </table>
        <?php
    }

    public static function render_user_actions($post) : void {
        $email = get_post_meta($post->ID, 'psp_company_email', true);
        $existing_user = $email ? get_user_by('email', $email) : false;
        ?>
        <?php if ($existing_user) : ?>
            <p><strong>Linked User:</strong> <?php echo esc_html($existing_user->user_login); ?> (<?php echo esc_html($existing_user->user_email); ?>)</p>
            <p>
                <a href="<?php echo esc_url(admin_url('user-edit.php?user_id=' . $existing_user->ID)); ?>" class="button">Edit User</a>
            </p>
            
            <hr style="margin: 15px 0;" />
            
            <h4 style="margin-top: 0;">Reset Password</h4>
            <p class="description" style="margin-bottom: 10px;">For security, company users cannot reset their own passwords. Only administrators can reset passwords.</p>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" onsubmit="return confirm('Are you sure you want to reset the password for this user? A new password will be generated and emailed to them.');">
                <?php wp_nonce_field('psp_reset_partner_password', 'psp_reset_nonce'); ?>
                <input type="hidden" name="action" value="psp_reset_partner_password" />
                <input type="hidden" name="post_id" value="<?php echo esc_attr($post->ID); ?>" />
                <button type="submit" class="button button-secondary">Reset Password & Email User</button>
            </form>
        <?php elseif ($post->ID && $email) : ?>
            <p>No user account linked yet.</p>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <?php wp_nonce_field('psp_create_user', 'psp_create_user_nonce'); ?>
                <input type="hidden" name="action" value="psp_create_user" />
                <input type="hidden" name="partner_id" value="<?php echo esc_attr($post->ID); ?>" />
                <button type="submit" class="button button-primary">Create User Account</button>
            </form>
            <p class="description">Creates a WordPress user with role psp_partner. Temporary password will be emailed to <?php echo esc_html($email); ?>.</p>
        <?php else : ?>
            <p class="description">Save this partner with a company email first, then you can create a user account.</p>
        <?php endif; ?>
        <?php
    }

    public static function save_partner_meta(int $post_id, $post) : void {
        if (!isset($_POST['psp_partner_nonce']) || !wp_verify_nonce($_POST['psp_partner_nonce'], 'psp_save_partner')) return;
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
        if (!current_user_can('edit_post', $post_id)) return;

        $fields = [
            'psp_company_name', 'psp_management_company', 'psp_units', 'psp_top_colour',
            'psp_company_email', 'psp_phone_number',
            'psp_street_address', 'psp_city', 'psp_state', 'psp_zip', 'psp_country',
            'psp_latitude', 'psp_longitude',
            'psp_lock_make', 'psp_master_code', 'psp_sub_master_code', 'psp_lock_part', 'psp_key',
            'psp_installation_date', 'psp_operation_type', 'psp_seasonal_open_date', 'psp_seasonal_close_date',
        ];
        foreach ($fields as $field) {
            if (isset($_POST[$field])) {
                update_post_meta($post_id, $field, sanitize_text_field($_POST[$field]));
            }
        }

        // Checkboxes
        update_post_meta($post_id, 'psp_has_fb_call_button', isset($_POST['psp_has_fb_call_button']) ? 1 : 0);
        update_post_meta($post_id, 'psp_has_usb_charging', isset($_POST['psp_has_usb_charging']) ? 1 : 0);
        update_post_meta($post_id, 'psp_has_safe_lock', isset($_POST['psp_has_safe_lock']) ? 1 : 0);
        update_post_meta($post_id, 'psp_is_active', isset($_POST['psp_is_active']) ? '1' : '0');

        // Sync legacy field for backward compatibility
        if (isset($_POST['psp_units'])) {
            update_post_meta($post_id, 'psp_number_of_lounge_units', intval($_POST['psp_units']));
        }
    }

    public static function handle_create_user() : void {
        if (!isset($_POST['psp_create_user_nonce']) || !wp_verify_nonce($_POST['psp_create_user_nonce'], 'psp_create_user')) {
            wp_die('Security check failed.');
        }
        if (!current_user_can('create_users')) {
            wp_die('You do not have permission to create users.');
        }

        $partner_id = intval($_POST['partner_id']);
        $email = get_post_meta($partner_id, 'psp_company_email', true);
        $company_name = get_post_meta($partner_id, 'psp_company_name', true) ?: get_the_title($partner_id);

        if (!$email) {
            wp_die('Partner must have a company email to create a user.');
        }

        $username = sanitize_user(str_replace(' ', '', strtolower($company_name)));
        if (username_exists($username)) {
            $username = $username . '_' . $partner_id;
        }

        $password = wp_generate_password(12, true);
        $user_id = wp_create_user($username, $password, $email);

        if (is_wp_error($user_id)) {
            wp_die('Failed to create user: ' . $user_id->get_error_message());
        }

        $user = new WP_User($user_id);
        $user->set_role('psp_partner');
        update_user_meta($user_id, 'psp_partner_id', $partner_id);
        
        // Store user_id on partner record for password reset
        update_post_meta($partner_id, 'psp_user_id', $user_id);

        wp_new_user_notification($user_id, null, 'both');

        wp_redirect(admin_url('post.php?post=' . $partner_id . '&action=edit&user_created=1'));
        exit;
    }

    public static function handle_csv_import() : void {
        if (!isset($_POST['psp_import_csv_nonce']) || !wp_verify_nonce($_POST['psp_import_csv_nonce'], 'psp_import_csv')) {
            wp_die('Security check failed.');
        }
        if (!current_user_can('manage_options')) {
            wp_die('You do not have permission to import partners.');
        }

        if (empty($_FILES['psp_csv_file']['tmp_name'])) {
            wp_die('No file uploaded.');
        }

        $file = $_FILES['psp_csv_file']['tmp_name'];
        $handle = fopen($file, 'r');
        if (!$handle) {
            wp_die('Failed to read CSV file.');
        }

        $headers = fgetcsv($handle);
        $count = 0;

        while (($row = fgetcsv($handle)) !== false) {
            if (count($row) !== count($headers)) continue;
            $data = array_combine($headers, $row);

            $post_id = wp_insert_post([
                'post_type' => 'psp_partner',
                'post_title' => sanitize_text_field($data['company_name'] ?? 'Partner'),
                'post_status' => 'publish',
            ]);

            if (is_wp_error($post_id)) continue;

            $meta_map = [
                'company_name' => 'psp_company_name',
                'management_company' => 'psp_management_company',
                'street_address' => 'psp_street_address',
                'city' => 'psp_city',
                'state' => 'psp_state',
                'zip' => 'psp_zip',
                'country' => 'psp_country',
                'units' => 'psp_units',
                'top_colour' => 'psp_top_colour',
                'lock_make' => 'psp_lock_make',
                'master_code' => 'psp_master_code',
                'sub_master_code' => 'psp_sub_master_code',
                'lock_part' => 'psp_lock_part',
                'key' => 'psp_key',
                'company_email' => 'psp_company_email',
                'phone_number' => 'psp_phone_number',
            ];

            foreach ($meta_map as $csv_key => $meta_key) {
                if (isset($data[$csv_key]) && $data[$csv_key] !== '') {
                    update_post_meta($post_id, $meta_key, sanitize_text_field($data[$csv_key]));
                }
            }

            // Amenities
            update_post_meta($post_id, 'psp_has_fb_call_button', isset($data['has_fb_call_button']) && in_array($data['has_fb_call_button'], ['1', 'true', 'yes']) ? 1 : 0);
            update_post_meta($post_id, 'psp_has_usb_charging', isset($data['has_usb_charging']) && in_array($data['has_usb_charging'], ['1', 'true', 'yes']) ? 1 : 0);
            update_post_meta($post_id, 'psp_has_safe_lock', isset($data['has_safe_lock']) && in_array($data['has_safe_lock'], ['1', 'true', 'yes']) ? 1 : 0);

            // Sync legacy field
            if (isset($data['units'])) {
                update_post_meta($post_id, 'psp_number_of_lounge_units', intval($data['units']));
            }

            $count++;
        }

        fclose($handle);
        wp_redirect(admin_url('edit.php?post_type=psp_partner&page=psp-import-partners&imported=' . $count));
        exit;
    }

    public static function admin_notices() : void {
        if (isset($_GET['user_created']) && $_GET['user_created'] == '1') {
            echo '<div class="notice notice-success is-dismissible"><p>User account created successfully! Password emailed to the user.</p></div>';
        }
        if (isset($_GET['psp_success']) && $_GET['psp_success'] == 'password_reset') {
            echo '<div class="notice notice-success is-dismissible"><p><strong>Password Reset:</strong> New password generated and emailed to the user.</p></div>';
        }
        if (isset($_GET['psp_error']) && $_GET['psp_error'] == 'no_user') {
            echo '<div class="notice notice-error is-dismissible"><p><strong>Error:</strong> No user account is linked to this partner. Create a user account first.</p></div>';
        }
    }

    public static function render_import_page() : void {
        ?>
        <div class="wrap">
            <h1>Import Partners from CSV</h1>
            <?php if (isset($_GET['imported'])) : ?>
                <div class="notice notice-success"><p>Successfully imported <?php echo intval($_GET['imported']); ?> partners!</p></div>
            <?php endif; ?>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" enctype="multipart/form-data">
                <?php wp_nonce_field('psp_import_csv', 'psp_import_csv_nonce'); ?>
                <input type="hidden" name="action" value="psp_import_csv" />
                <table class="form-table">
                    <tr>
                        <th><label for="psp_csv_file">CSV File</label></th>
                        <td>
                            <input type="file" id="psp_csv_file" name="psp_csv_file" accept=".csv" required />
                            <p class="description">Upload a CSV with headers: company_name, management_company, street_address, city, state, zip, country, units, top_colour, has_fb_call_button, has_usb_charging, has_safe_lock, lock_make, master_code, sub_master_code, lock_part, key, company_email, phone_number</p>
                        </td>
                    </tr>
                </table>
                <p><button type="submit" class="button button-primary">Import Partners</button></p>
            </form>
        </div>
        <?php
    }

    /**
     * Hide password fields for partner users (they cannot change their own password)
     */
    public static function hide_password_fields_for_partners(bool $show, WP_User $user) : bool {
        if (in_array('psp_partner', $user->roles)) {
            return false; // Hide password fields
        }
        return $show;
    }

    /**
     * Add notice to partner profile page explaining password policy
     */
    public static function add_password_reset_notice(WP_User $user) : void {
        if (in_array('psp_partner', $user->roles)) {
            echo '<div class="notice notice-info inline"><p><strong>Password Management:</strong> For security reasons, passwords for company accounts can only be reset by administrators. Please contact support if you need assistance.</p></div>';
        }
    }

    /**
     * Handle admin password reset for partner users
     */
    public static function handle_reset_partner_password() : void {
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }

        check_admin_referer('psp_reset_partner_password', 'psp_reset_nonce');

        $post_id = isset($_POST['post_id']) ? intval($_POST['post_id']) : 0;
        if (!$post_id) {
            wp_die('Invalid partner');
        }

        $user_id = get_post_meta($post_id, 'psp_user_id', true);
        if (!$user_id) {
            wp_redirect(admin_url("post.php?post={$post_id}&action=edit&psp_error=no_user"));
            exit;
        }

        // Generate new password
        $new_password = wp_generate_password(12, true, true);
        wp_set_password($new_password, $user_id);

        // Send email notification
        $user = get_userdata($user_id);
        $company_name = get_post_meta($post_id, 'psp_company_name', true);
        
        $subject = 'Your Pool Safe Portal Password Has Been Reset';
        $message = sprintf(
            "Your password for the Pool Safe Portal has been reset by an administrator.\n\n" .
            "Company: %s\n" .
            "Username: %s\n" .
            "New Password: %s\n\n" .
            "Please log in at: %s\n\n" .
            "For security reasons, we recommend changing this password after logging in.",
            $company_name,
            $user->user_login,
            $new_password,
            home_url('/login')
        );

        wp_mail($user->user_email, $subject, $message);

        wp_redirect(admin_url("post.php?post={$post_id}&action=edit&psp_success=password_reset"));
        exit;
    }

    /**
     * Add Pool Safe dashboard widget
     */
    public static function add_dashboard_widget() : void {
        if (!current_user_can('edit_psp_tickets') && !current_user_can('manage_options')) {
            return;
        }

        wp_add_dashboard_widget(
            'psp_dashboard_widget',
            '🏊 Pool Safe Portal Overview',
            [ __CLASS__, 'render_dashboard_widget' ]
        );
    }

    /**
     * Render dashboard widget content
     */
    public static function render_dashboard_widget() : void {
        $tickets = wp_count_posts('psp_ticket');
        $partners = wp_count_posts('psp_partner');

        // Get recent tickets
        $recent_tickets = get_posts([
            'post_type' => 'psp_ticket',
            'posts_per_page' => 5,
            'post_status' => 'publish',
            'orderby' => 'date',
            'order' => 'DESC'
        ]);

        // Get open tickets count
        $open_tickets = new WP_Query([
            'post_type' => 'psp_ticket',
            'meta_query' => [
                'relation' => 'OR',
                [
                    'key' => 'psp_status',
                    'value' => 'open',
                    'compare' => '='
                ],
                [
                    'key' => 'psp_status',
                    'value' => 'in_progress',
                    'compare' => '='
                ],
                [
                    'key' => 'psp_status',
                    'compare' => 'NOT EXISTS'
                ]
            ]
        ]);
        ?>
        <div class="psp-dashboard-widget">
            <style>
                .psp-dashboard-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
                .psp-stat-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px;text-align:center}
                .psp-stat-number{font-size:28px;font-weight:700;color:#111827;margin:0}
                .psp-stat-label{font-size:13px;color:#6b7280;margin-top:4px}
                .psp-recent-list{list-style:none;margin:0;padding:0}
                .psp-recent-item{padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px}
                .psp-recent-item:last-child{border-bottom:none}
                .psp-recent-title{font-weight:600;color:#111827;display:block;margin-bottom:2px}
                .psp-recent-meta{color:#9ca3af;font-size:12px}
                .psp-widget-actions{margin-top:16px;display:flex;gap:8px}
                .psp-widget-actions .button{font-size:13px}
            </style>

            <div class="psp-dashboard-stats">
                <div class="psp-stat-box">
                    <div class="psp-stat-number"><?php echo esc_html($open_tickets->found_posts); ?></div>
                    <div class="psp-stat-label">Open Tickets</div>
                </div>
                <div class="psp-stat-box">
                    <div class="psp-stat-number"><?php echo esc_html($partners->publish); ?></div>
                    <div class="psp-stat-label">Partners</div>
                </div>
                <div class="psp-stat-box">
                    <div class="psp-stat-number"><?php echo esc_html($tickets->publish); ?></div>
                    <div class="psp-stat-label">Total Tickets</div>
                </div>
            </div>

            <h4 style="margin-top:0;margin-bottom:12px;font-size:14px;color:#374151;">Recent Tickets</h4>
            <?php if (!empty($recent_tickets)): ?>
                <ul class="psp-recent-list">
                    <?php foreach ($recent_tickets as $ticket): 
                        $status = get_post_meta($ticket->ID, 'psp_status', true) ?: 'open';
                        $priority = get_post_meta($ticket->ID, 'psp_priority', true) ?: 'normal';
                        ?>
                        <li class="psp-recent-item">
                            <span class="psp-recent-title">
                                <a href="<?php echo esc_url(admin_url("post.php?post={$ticket->ID}&action=edit")); ?>">
                                    #<?php echo esc_html($ticket->ID); ?>: <?php echo esc_html($ticket->post_title); ?>
                                </a>
                            </span>
                            <span class="psp-recent-meta">
                                <?php echo esc_html(ucfirst($status)); ?> • 
                                <?php echo esc_html(ucfirst($priority)); ?> • 
                                <?php echo esc_html(human_time_diff(strtotime($ticket->post_date), current_time('timestamp'))); ?> ago
                            </span>
                        </li>
                    <?php endforeach; ?>
                </ul>
            <?php else: ?>
                <p style="color:#9ca3af;font-style:italic;font-size:13px;">No tickets yet.</p>
            <?php endif; ?>

            <div class="psp-widget-actions">
                <a href="<?php echo esc_url(admin_url('edit.php?post_type=psp_ticket')); ?>" class="button button-primary">
                    View All Tickets
                </a>
                <a href="<?php echo esc_url(admin_url('edit.php?post_type=psp_partner')); ?>" class="button">
                    Manage Partners
                </a>
            </div>
        </div>
        <?php
    }

    /**
     * Add service record meta boxes
     */
    public static function add_service_record_meta_boxes() : void {
        add_meta_box(
            'psp_service_record_details',
            __('Service Record Details', 'psp'),
            [ __CLASS__, 'render_service_record_meta_box' ],
            'psp_service_record',
            'normal',
            'high'
        );
    }

    /**
     * Render service record meta box
     */
    public static function render_service_record_meta_box($post) : void {
        wp_nonce_field('psp_save_service_record_meta', 'psp_service_record_nonce');
        
        $partner_id = get_post_meta($post->ID, 'psp_partner_id', true);
        $service_date = get_post_meta($post->ID, 'psp_service_date', true);
        $service_type = get_post_meta($post->ID, 'psp_service_type', true);
        $contact_method = get_post_meta($post->ID, 'psp_contact_method', true);
        $duration_minutes = get_post_meta($post->ID, 'psp_duration_minutes', true);
        $onsite_type = get_post_meta($post->ID, 'psp_onsite_type', true);
        $technician = get_post_meta($post->ID, 'psp_technician', true);
        $issue_resolved = get_post_meta($post->ID, 'psp_issue_resolved', true);
        $followup_required = get_post_meta($post->ID, 'psp_followup_required', true);
        $followup_date = get_post_meta($post->ID, 'psp_followup_date', true);
        $related_ticket_id = get_post_meta($post->ID, 'psp_related_ticket_id', true);
        
        // Get partners for dropdown
        $partners = get_posts([
            'post_type' => 'psp_partner',
            'posts_per_page' => -1,
            'orderby' => 'title',
            'order' => 'ASC'
        ]);
        ?>
        <style>
            .psp-meta-box { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
            .psp-meta-field { margin-bottom: 16px; }
            .psp-meta-field label { display: block; font-weight: 600; margin-bottom: 4px; }
            .psp-meta-field input[type="text"],
            .psp-meta-field input[type="number"],
            .psp-meta-field input[type="date"],
            .psp-meta-field select { width: 100%; }
            .psp-meta-section { grid-column: 1 / -1; border-top: 1px solid #ddd; padding-top: 16px; margin-top: 8px; }
            .psp-meta-section h4 { margin: 0 0 12px; color: #1d2327; }
            .psp-meta-checkbox { display: flex; align-items: center; gap: 8px; }
            .psp-meta-checkbox input { width: auto; margin: 0; }
        </style>
        
        <div class="psp-meta-box">
            <!-- Partner -->
            <div class="psp-meta-field">
                <label for="psp_partner_id"><?php echo esc_html__('Partner *', 'psp'); ?></label>
                <select name="psp_partner_id" id="psp_partner_id" required>
                    <option value=""><?php echo esc_html__('Select Partner', 'psp'); ?></option>
                    <?php foreach ($partners as $partner): ?>
                        <option value="<?php echo esc_attr($partner->ID); ?>" <?php selected($partner_id, $partner->ID); ?>>
                            <?php echo esc_html($partner->post_title); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            
            <!-- Service Date -->
            <div class="psp-meta-field">
                <label for="psp_service_date"><?php echo esc_html__('Service Date *', 'psp'); ?></label>
                <input type="date" name="psp_service_date" id="psp_service_date" 
                       value="<?php echo esc_attr($service_date); ?>" required />
            </div>
            
            <!-- Service Type -->
            <div class="psp-meta-field">
                <label for="psp_service_type"><?php echo esc_html__('Service Type *', 'psp'); ?></label>
                <select name="psp_service_type" id="psp_service_type" required onchange="toggleServiceFields(this.value)">
                    <option value=""><?php echo esc_html__('Select Type', 'psp'); ?></option>
                    <optgroup label="<?php echo esc_attr__('Support Interactions', 'psp'); ?>">
                        <option value="phone" <?php selected($service_type, 'phone'); ?>><?php echo esc_html__('Phone Support', 'psp'); ?></option>
                        <option value="email" <?php selected($service_type, 'email'); ?>><?php echo esc_html__('Email Support', 'psp'); ?></option>
                        <option value="remote" <?php selected($service_type, 'remote'); ?>><?php echo esc_html__('Remote Support', 'psp'); ?></option>
                    </optgroup>
                    <optgroup label="<?php echo esc_attr__('On-site Services', 'psp'); ?>">
                        <option value="onsite_maintenance" <?php selected($service_type, 'onsite_maintenance'); ?>><?php echo esc_html__('Maintenance Visit', 'psp'); ?></option>
                        <option value="onsite_installation" <?php selected($service_type, 'onsite_installation'); ?>><?php echo esc_html__('Installation Visit', 'psp'); ?></option>
                        <option value="onsite_repair" <?php selected($service_type, 'onsite_repair'); ?>><?php echo esc_html__('Repair Visit', 'psp'); ?></option>
                        <option value="onsite_inspection" <?php selected($service_type, 'onsite_inspection'); ?>><?php echo esc_html__('Inspection Visit', 'psp'); ?></option>
                    </optgroup>
                </select>
            </div>
            
            <!-- Related Ticket -->
            <div class="psp-meta-field">
                <label for="psp_related_ticket_id"><?php echo esc_html__('Related Ticket ID (optional)', 'psp'); ?></label>
                <input type="number" name="psp_related_ticket_id" id="psp_related_ticket_id" 
                       value="<?php echo esc_attr($related_ticket_id); ?>" min="1" />
            </div>
            
            <!-- Support Interaction Fields -->
            <div class="psp-meta-section support-fields">
                <h4><?php echo esc_html__('Support Interaction Details', 'psp'); ?></h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                    <div class="psp-meta-field">
                        <label for="psp_contact_method"><?php echo esc_html__('Contact Method', 'psp'); ?></label>
                        <select name="psp_contact_method" id="psp_contact_method">
                            <option value=""><?php echo esc_html__('Select Method', 'psp'); ?></option>
                            <option value="phone" <?php selected($contact_method, 'phone'); ?>><?php echo esc_html__('Phone', 'psp'); ?></option>
                            <option value="email" <?php selected($contact_method, 'email'); ?>><?php echo esc_html__('Email', 'psp'); ?></option>
                            <option value="chat" <?php selected($contact_method, 'chat'); ?>><?php echo esc_html__('Chat', 'psp'); ?></option>
                            <option value="remote_desktop" <?php selected($contact_method, 'remote_desktop'); ?>><?php echo esc_html__('Remote Desktop', 'psp'); ?></option>
                        </select>
                    </div>
                    
                    <div class="psp-meta-field">
                        <label for="psp_duration_minutes"><?php echo esc_html__('Duration (minutes)', 'psp'); ?></label>
                        <input type="number" name="psp_duration_minutes" id="psp_duration_minutes" 
                               value="<?php echo esc_attr($duration_minutes); ?>" min="0" />
                    </div>
                </div>
            </div>
            
            <!-- On-site Service Fields -->
            <div class="psp-meta-section onsite-fields">
                <h4><?php echo esc_html__('On-site Service Details', 'psp'); ?></h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                    <div class="psp-meta-field">
                        <label for="psp_technician"><?php echo esc_html__('Technician Name', 'psp'); ?></label>
                        <input type="text" name="psp_technician" id="psp_technician" 
                               value="<?php echo esc_attr($technician); ?>" />
                    </div>
                </div>
            </div>
            
            <!-- Resolution Tracking -->
            <div class="psp-meta-section">
                <h4><?php echo esc_html__('Resolution Tracking', 'psp'); ?></h4>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
                    <div class="psp-meta-field">
                        <label class="psp-meta-checkbox">
                            <input type="checkbox" name="psp_issue_resolved" id="psp_issue_resolved" 
                                   value="1" <?php checked($issue_resolved, '1'); ?> />
                            <?php echo esc_html__('Issue Resolved', 'psp'); ?>
                        </label>
                    </div>
                    
                    <div class="psp-meta-field">
                        <label class="psp-meta-checkbox">
                            <input type="checkbox" name="psp_followup_required" id="psp_followup_required" 
                                   value="1" <?php checked($followup_required, '1'); ?> />
                            <?php echo esc_html__('Follow-up Required', 'psp'); ?>
                        </label>
                    </div>
                    
                    <div class="psp-meta-field">
                        <label for="psp_followup_date"><?php echo esc_html__('Follow-up Date', 'psp'); ?></label>
                        <input type="date" name="psp_followup_date" id="psp_followup_date" 
                               value="<?php echo esc_attr($followup_date); ?>" />
                    </div>
                </div>
            </div>
        </div>
        
        <script>
        function toggleServiceFields(serviceType) {
            const supportFields = document.querySelector('.support-fields');
            const onsiteFields = document.querySelector('.onsite-fields');
            
            if (serviceType && serviceType.startsWith('onsite_')) {
                supportFields.style.display = 'none';
                onsiteFields.style.display = 'block';
            } else if (['phone', 'email', 'remote'].includes(serviceType)) {
                supportFields.style.display = 'block';
                onsiteFields.style.display = 'none';
            } else {
                supportFields.style.display = 'block';
                onsiteFields.style.display = 'block';
            }
        }
        
        // Initialize on load
        document.addEventListener('DOMContentLoaded', function() {
            const serviceType = document.getElementById('psp_service_type').value;
            toggleServiceFields(serviceType);
        });
        </script>
        <?php
    }

    /**
     * Save service record meta
     */
    public static function save_service_record_meta(int $post_id, WP_Post $post) : void {
        if (!isset($_POST['psp_service_record_nonce']) || 
            !wp_verify_nonce($_POST['psp_service_record_nonce'], 'psp_save_service_record_meta')) {
            return;
        }
        
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
        if (!current_user_can('edit_post', $post_id)) return;
        
        // Save all fields
        $fields = [
            'psp_partner_id' => 'intval',
            'psp_service_date' => 'sanitize_text_field',
            'psp_service_type' => 'sanitize_text_field',
            'psp_contact_method' => 'sanitize_text_field',
            'psp_duration_minutes' => 'intval',
            'psp_onsite_type' => 'sanitize_text_field',
            'psp_technician' => 'sanitize_text_field',
            'psp_followup_date' => 'sanitize_text_field',
            'psp_related_ticket_id' => 'intval',
        ];
        
        foreach ($fields as $field => $sanitize) {
            if (isset($_POST[$field])) {
                update_post_meta($post_id, $field, $sanitize($_POST[$field]));
            }
        }
        
        // Handle checkboxes
        update_post_meta($post_id, 'psp_issue_resolved', isset($_POST['psp_issue_resolved']) ? '1' : '0');
        update_post_meta($post_id, 'psp_followup_required', isset($_POST['psp_followup_required']) ? '1' : '0');
    }
    
    /**
     * Activity Log System
     */
    public static function log_activity($object_id, $action, $metadata = []) : void {
        global $wpdb;
        $table_name = $wpdb->prefix . 'psp_activity_log';
        
        $user_id = get_current_user_id();
        $user = $user_id ? get_userdata($user_id) : null;
        
        $wpdb->insert($table_name, [
            'user_id' => $user_id,
            'user_name' => $user ? $user->display_name : 'System',
            'user_role' => $user && !empty($user->roles) ? $user->roles[0] : 'system',
            'object_id' => $object_id,
            'object_type' => get_post_type($object_id),
            'action' => $action,
            'metadata' => json_encode($metadata),
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? '',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
            'created_at' => current_time('mysql')
        ]);
    }
    
    public static function get_activity_log($object_id = null, $limit = 50) : array {
        global $wpdb;
        $table_name = $wpdb->prefix . 'psp_activity_log';
        
        if ($object_id) {
            $results = $wpdb->get_results($wpdb->prepare(
                "SELECT * FROM $table_name WHERE object_id = %d ORDER BY created_at DESC LIMIT %d",
                $object_id,
                $limit
            ), ARRAY_A);
        } else {
            $results = $wpdb->get_results($wpdb->prepare(
                "SELECT * FROM $table_name ORDER BY created_at DESC LIMIT %d",
                $limit
            ), ARRAY_A);
        }
        
        return $results ?: [];
    }
    
    public static function create_activity_log_table() : void {
        global $wpdb;
        $table_name = $wpdb->prefix . 'psp_activity_log';
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE IF NOT EXISTS $table_name (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) NOT NULL,
            user_name varchar(255) NOT NULL,
            user_role varchar(50) NOT NULL,
            object_id bigint(20) NOT NULL,
            object_type varchar(50) NOT NULL,
            action varchar(100) NOT NULL,
            metadata text,
            ip_address varchar(45),
            user_agent text,
            created_at datetime NOT NULL,
            PRIMARY KEY (id),
            KEY user_id (user_id),
            KEY object_id (object_id),
            KEY action (action),
            KEY created_at (created_at)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
}
