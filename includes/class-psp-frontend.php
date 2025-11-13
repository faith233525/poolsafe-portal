<?php
/**
 * Shortcodes & frontend assets
 */
if (!defined('ABSPATH')) { exit; }

class PSP_Frontend {
    public static function register_shortcodes() : void {
        add_shortcode('poolsafe_portal', [ __CLASS__, 'render_portal' ]);
        add_shortcode('poolsafe_map', [ __CLASS__, 'render_map' ]);
        add_shortcode('poolsafe_tickets', [ __CLASS__, 'render_tickets' ]);
        add_shortcode('poolsafe_partners', [ __CLASS__, 'render_partners' ]);
        add_shortcode('poolsafe_notifications', [ __CLASS__, 'render_notifications' ]);
        add_shortcode('poolsafe_calendar', [ __CLASS__, 'render_calendar' ]);
        add_shortcode('poolsafe_login', [ __CLASS__, 'render_login' ]);
        add_shortcode('poolsafe_kb', [ __CLASS__, 'render_knowledge_base' ]);
        add_shortcode('poolsafe_service_records', [ __CLASS__, 'render_service_records' ]);
        add_shortcode('poolsafe_dashboard', [ __CLASS__, 'render_dashboard' ]);
        add_shortcode('poolsafe_support_tools', [ __CLASS__, 'render_support_tools' ]);
        add_shortcode('poolsafe_user_management', [ __CLASS__, 'render_user_management' ]);
        // Aliases for user convenience / mis-typed variants
        add_shortcode('poolsafe_tools', [ __CLASS__, 'render_support_tools' ]);
        add_shortcode('poolsafe_users', [ __CLASS__, 'render_user_management' ]);
        add_shortcode('psp_support_tools', [ __CLASS__, 'render_support_tools' ]);
        add_shortcode('psp_user_management', [ __CLASS__, 'render_user_management' ]);
    }

    public static function enqueue_assets() : void {
        // CSS: Plugin + Leaflet
        wp_enqueue_style('psp-portal', PSP_PLUGIN_URL . 'assets/css/portal.css', [], PSP_VERSION);
        wp_enqueue_style('leaflet', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', [], '1.9.4');

        // JS: Leaflet + Portal
        wp_enqueue_script('leaflet', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', [], '1.9.4', true);
        wp_enqueue_script('psp-portal', PSP_PLUGIN_URL . 'assets/js/portal.js', [ 'wp-api', 'leaflet' ], PSP_VERSION, true);

        $can_create = current_user_can('publish_psp_tickets');
        $is_support = current_user_can('psp_support') || current_user_can('administrator');
        $settings = class_exists('PSP_Settings') ? PSP_Settings::get_settings() : [];
        
        // Always use WordPress theme colors from Customizer (no plugin override)
        $primary = get_theme_mod('primary_color', '#3AA6B9');
        $primary_hover = get_theme_mod('primary_hover_color', '#25D0EE');
        
        // Apply CSS variables and inline styles
        $lock_bg = isset($settings['lock_highlight_bg']) ? $settings['lock_highlight_bg'] : '#f0f7fa';
        $lock_border = isset($settings['lock_highlight_border']) ? $settings['lock_highlight_border'] : $primary;
        $inline_css = ":root{--psp-primary:{$primary};--psp-primary-hover:{$primary_hover}}.psp-button-primary{background:var(--psp-primary)!important;color:#fff}.psp-button-primary:hover{background:var(--psp-primary-hover)!important}.psp-login-footer a{color:var(--psp-primary)}.psp-kb-article-title{color:var(--psp-primary)}.psp-lock-section{background:{$lock_bg};border-color:{$lock_border}}.psp-lock-info code{background:{$lock_bg};border-color:{$lock_border}}";
        wp_add_inline_style('psp-portal', $inline_css);
        $sla = class_exists('PSP_Settings') ? PSP_Settings::get_sla_thresholds() : [
            'urgent' => 4,
            'high' => 24,
            'medium' => 72,
            'low' => 168,
        ];
        wp_localize_script('psp-portal', 'PSP_PORTAL', [
            'rest' => [
                'base' => esc_url_raw( rest_url('poolsafe/v1') ),
                'nonce' => wp_create_nonce('wp_rest'),
            ],
            // Alias used by existing JS (api == rest)
            'api' => [
                'base' => esc_url_raw( rest_url('poolsafe/v1') ),
                'nonce' => wp_create_nonce('wp_rest'),
            ],
            'ui' => [
                'canCreateTickets' => (bool) $can_create,
                'isSupport' => (bool) $is_support,
            ],
            'user' => [
                'id' => get_current_user_id(),
            ],
            'sla' => $sla,
            'map' => [
                'tileUrl' => isset($settings['map_tile_url']) ? $settings['map_tile_url'] : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'attribution' => isset($settings['map_attribution']) ? $settings['map_attribution'] : '',
            ],
            'branding' => [
                'primary' => $primary,
                'primaryHover' => $primary_hover,
                'lockBg' => isset($settings['lock_highlight_bg']) ? $settings['lock_highlight_bg'] : '#fef3c7',
                'lockBorder' => isset($settings['lock_highlight_border']) ? $settings['lock_highlight_border'] : '#fbbf24',
            ],
        ]);
    }

    public static function render_portal($atts = []) : string {
        if (!is_user_logged_in()) {
            return '<div class="psp-portal">' . esc_html__( 'Please sign in to access the Pool Safe Portal.', 'psp' ) . '</div>';
        }

        // Enqueue assets only when shortcode is rendered
        self::enqueue_assets();
        
        $is_support = current_user_can('psp_support') || current_user_can('administrator');
        $current_user_id = get_current_user_id();
        $current_user = wp_get_current_user();
        
        // Get personalized greeting
        $welcome_message = '';
        if ($is_support) {
            $display_name = !empty($current_user->display_name) ? $current_user->display_name : $current_user->user_login;
            $welcome_message = sprintf(esc_html__('Welcome, %s', 'psp'), '<strong>' . esc_html($display_name) . '</strong>');
        } else {
            // Partner user - get company name, management company, and units
            $partner_id = intval(get_user_meta($current_user_id, 'psp_partner_id', true));
            if ($partner_id > 0) {
                $company_name = get_the_title($partner_id);
                $management_company = get_post_meta($partner_id, 'psp_management_company', true);
                $units = get_post_meta($partner_id, 'psp_units', true);
                
                // Build multi-line welcome message
                $welcome_message = '<div style="line-height:1.4;">';
                // Company name - big and bold
                $welcome_message .= '<div style="font-size:32px;font-weight:700;margin-bottom:8px;">' . esc_html($company_name) . '</div>';
                // Management company - medium text below
                if ($management_company) {
                    $welcome_message .= '<div style="font-size:18px;font-weight:400;opacity:0.9;margin-bottom:12px;">' . esc_html($management_company) . '</div>';
                }
                // Units - BIG NUMBERS with small label
                if ($units) {
                    $welcome_message .= '<div style="display:flex;align-items:baseline;gap:8px;margin-top:' . ($management_company ? '4px' : '12px') . ';">';
                    $welcome_message .= '<div style="font-size:64px;font-weight:700;line-height:1;color:#fff;">' . esc_html($units) . '</div>';
                    $welcome_message .= '<div style="font-size:20px;font-weight:500;opacity:0.95;">' . esc_html__('units', 'psp') . '</div>';
                    $welcome_message .= '</div>';
                }
                $welcome_message .= '</div>';
            } else {
                $display_name = !empty($current_user->display_name) ? $current_user->display_name : $current_user->user_login;
                $welcome_message = sprintf(esc_html__('Welcome, %s', 'psp'), '<strong>' . esc_html($display_name) . '</strong>');
            }
        }
        
        ob_start();
        ?>
        <div id="psp-portal-root" class="psp-portal">
            <?php if ($welcome_message) : ?>
                <div class="psp-welcome-banner" style="background:linear-gradient(135deg, #3AA6B9 0%, #25D0EE 100%);color:#fff;padding:24px 28px;border-radius:8px;margin-bottom:20px;box-shadow:0 2px 8px rgba(58,166,185,0.15);">
                    <?php echo $welcome_message; ?>
                </div>
            <?php endif; ?>
            <h2><?php echo esc_html__( 'Pool Safe Portal', 'psp' ); ?></h2>
            <?php if ( $is_support ) : ?>
                <div class="psp-support-welcome" style="background:#e8f5f8;border-left:4px solid #3AA6B9;padding:16px;border-radius:8px;margin-bottom:20px;">
                    <h3 style="margin-top:0;color:#000080;font-size:16px;">👋 Support Quick Guide</h3>
                    <ul style="margin:8px 0;padding-left:20px;font-size:14px;line-height:1.6;">
                        <li><strong>Add Users:</strong> Scroll to "User Management" section below to create partner accounts</li>
                        <li><strong>Update Partner Info:</strong> Use "Support Tools" to edit lock details and top colours</li>
                        <li><strong>View Partner Details:</strong> Click any partner card to see tickets and service records</li>
                        <li><strong>Change Portal Colors:</strong> "Support Tools" → Branding & Colors section</li>
                    </ul>
                </div>
            <?php endif; ?>
            <div id="psp-portal-status"><?php echo esc_html__( 'Loading...', 'psp' ); ?></div>

            <!-- Partners Section (listed first) -->
            <section class="psp-section">
                <h3><?php echo esc_html__( 'Partners', 'psp' ); ?></h3>
                <?php if ( current_user_can('psp_support') || current_user_can('administrator') ) : ?>
                    <p class="psp-section-help" style="color:#6b7280;font-size:13px;margin-top:-8px;margin-bottom:12px;">📍 Click any partner to view their tickets and service records</p>
                <?php endif; ?>
                <ul id="psp-partner-list" class="psp-list" aria-live="polite"></ul>
                <div id="psp-partner-hint" class="psp-hint"></div>
                <div id="psp-partner-profile" class="psp-partner-profile" style="display:none;">
                    <button type="button" id="psp-close-profile" class="psp-button psp-button-secondary" style="float:right;margin-top:-4px;">&times; <?php echo esc_html__('Close', 'psp'); ?></button>
                    <h4 id="psp-profile-title" style="margin-top:0;"></h4>
                    <div id="psp-profile-meta" class="psp-profile-meta"></div>
                    <div class="psp-profile-columns">
                        <div class="psp-profile-column">
                            <h5><?php echo esc_html__('All Tickets', 'psp'); ?> 📋</h5>
                            <ul id="psp-profile-tickets" class="psp-mini-list"></ul>
                        </div>
                        <div class="psp-profile-column">
                            <h5><?php echo esc_html__('All Service Records', 'psp'); ?> 🔧</h5>
                            <ul id="psp-profile-services" class="psp-mini-list"></ul>
                        </div>
                    </div>
                    <?php if ( current_user_can('psp_support') || current_user_can('administrator') ) : ?>
                    <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb;">
                        <h5 style="margin:0 0 8px;"><?php echo esc_html__('Authorized Contacts (Internal Reference)', 'psp'); ?></h5>
                        <p style="color:#6b7280;font-size:12px;margin:0 0 12px;"><?php echo esc_html__('Track authorized users per company. Not tied to portal login accounts - for reference only.', 'psp'); ?></p>
                        <ul id="psp-profile-contacts" class="psp-mini-list"></ul>
                        
                        <div class="psp-ticket-create" style="margin-top:12px;padding:14px;">
                            <h6 style="margin:0 0 10px;font-size:13px;color:#374151;"><?php echo esc_html__('Add Contact', 'psp'); ?></h6>
                            <input type="hidden" id="psp-contact-partner-id" />
                            <div class="psp-form-row">
                                <div class="psp-form-field">
                                    <label for="psp-contact-name" style="font-size:12px;"><?php echo esc_html__('Name *', 'psp'); ?></label>
                                    <input type="text" id="psp-contact-name" required style="font-size:13px;padding:6px 10px;" />
                                </div>
                                <div class="psp-form-field">
                                    <label for="psp-contact-role" style="font-size:12px;"><?php echo esc_html__('Role', 'psp'); ?></label>
                                    <input type="text" id="psp-contact-role" placeholder="GM, Ops, IT, etc." style="font-size:13px;padding:6px 10px;" />
                                </div>
                            </div>
                            <div class="psp-form-row">
                                <div class="psp-form-field">
                                    <label for="psp-contact-email" style="font-size:12px;"><?php echo esc_html__('Email *', 'psp'); ?></label>
                                    <input type="email" id="psp-contact-email" required style="font-size:13px;padding:6px 10px;" />
                                </div>
                                <div class="psp-form-field">
                                    <label for="psp-contact-phone" style="font-size:12px;"><?php echo esc_html__('Phone', 'psp'); ?></label>
                                    <input type="tel" id="psp-contact-phone" style="font-size:13px;padding:6px 10px;" />
                                </div>
                            </div>
                            <div class="psp-form-row">
                                <div class="psp-form-field">
                                    <label style="font-size:12px;display:flex;align-items:center;gap:6px;">
                                        <input type="checkbox" id="psp-contact-is-primary" />
                                        <?php echo esc_html__('Set as Primary Contact', 'psp'); ?>
                                    </label>
                                </div>
                            </div>
                            <button type="button" id="psp-contact-add" class="psp-button psp-button-primary" style="font-size:13px;padding:8px 16px;"><?php echo esc_html__('Add Contact', 'psp'); ?></button>
                            <div id="psp-contact-status" class="psp-hint"></div>
                        </div>
                    </div>
                    <?php endif; ?>
                    <div id="psp-profile-status" class="psp-hint" style="margin-top:12px;"></div>
                    <?php if ( current_user_can('psp_support') || current_user_can('administrator') ) : ?>
                    <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e5e7eb;">
                        <h5 style="margin:0 0 8px;display:flex;align-items:center;gap:6px;">👥 <?php echo esc_html__('Authorized Accounts (Login Users)', 'psp'); ?></h5>
                        <p style="color:#6b7280;font-size:12px;margin:0 0 12px;max-width:740px;">
                            <?php echo esc_html__('Manage portal login users linked to this company. Each user controls their own notification preferences. If no user subscribes to a category, notifications fall back to the Primary user (or support queue).', 'psp'); ?>
                        </p>
                        <div id="psp-company-users-status" class="psp-hint" style="margin-bottom:10px;"></div>
                        <div id="psp-profile-company-users" class="psp-company-users" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;background:#fff;"></div>
                        <div style="margin-top:14px;display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;">
                            <div style="display:flex;flex-direction:column;gap:4px;">
                                <label for="psp-link-user-id" style="font-size:12px;color:#374151;">User ID to Link</label>
                                <input type="number" id="psp-link-user-id" style="padding:6px 10px;font-size:13px;width:140px;" placeholder="ID" />
                            </div>
                            <button type="button" id="psp-link-user-btn" class="psp-button psp-button-secondary" style="font-size:12px;height:32px;">Link User</button>
                            <div style="font-size:11px;color:#6b7280;">Go to <strong>User Management</strong> below to create new accounts first.</div>
                        </div>
                    </div>
                    <?php endif; ?>
                </div>
            </section>

            <!-- Tickets Section -->
            <section class="psp-section">
                <h3><?php echo esc_html__( 'Tickets', 'psp' ); ?></h3>
                <p class="psp-section-help" style="color:#6b7280;font-size:13px;margin-top:-8px;margin-bottom:12px;">🎫 View and manage support tickets. Partners can create tickets; Support can manage all.</p>
                <div id="psp-ticket-create" class="psp-ticket-create" hidden>
                    <h4><?php echo esc_html__( 'Create New Ticket', 'psp' ); ?></h4>
                    
                    <div class="psp-form-row">
                        <div class="psp-form-field">
                            <label for="psp-ticket-first-name"><?php echo esc_html__( 'First Name *', 'psp' ); ?></label>
                            <input type="text" id="psp-ticket-first-name" required />
                        </div>
                        <div class="psp-form-field">
                            <label for="psp-ticket-last-name"><?php echo esc_html__( 'Last Name *', 'psp' ); ?></label>
                            <input type="text" id="psp-ticket-last-name" required />
                        </div>
                    </div>

                    <div class="psp-form-row">
                        <div class="psp-form-field">
                            <label for="psp-ticket-position"><?php echo esc_html__( 'Position', 'psp' ); ?></label>
                            <input type="text" id="psp-ticket-position" />
                        </div>
                    </div>

                    <div class="psp-form-row">
                        <div class="psp-form-field">
                            <label for="psp-ticket-email"><?php echo esc_html__( 'Email *', 'psp' ); ?></label>
                            <input type="email" id="psp-ticket-email" required />
                        </div>
                        <div class="psp-form-field">
                            <label for="psp-ticket-number"><?php echo esc_html__( 'Phone Number *', 'psp' ); ?></label>
                            <input type="tel" id="psp-ticket-number" required />
                        </div>
                    </div>

                    <div class="psp-form-row">
                        <div class="psp-form-field">
                            <label for="psp-ticket-units-affected"><?php echo esc_html__( 'Units Affected', 'psp' ); ?></label>
                            <input type="text" id="psp-ticket-units-affected" placeholder="<?php echo esc_attr__( 'e.g., 5 units', 'psp' ); ?>" />
                        </div>
                    </div>

                    <div class="psp-form-row">
                        <div class="psp-form-field">
                            <label for="psp-ticket-title"><?php echo esc_html__( 'Subject *', 'psp' ); ?></label>
                            <input type="text" id="psp-ticket-title" required />
                        </div>
                    </div>

                    <div class="psp-form-row">
                        <div class="psp-form-field">
                            <label for="psp-ticket-content"><?php echo esc_html__( 'Description', 'psp' ); ?></label>
                            <textarea id="psp-ticket-content" rows="6" placeholder="<?php echo esc_attr__( 'Describe the issue in detail...', 'psp' ); ?>"></textarea>
                        </div>
                    </div>

                    <div class="psp-form-row">
                        <div class="psp-form-field">
                            <label for="psp-ticket-files"><?php echo esc_html__( 'Attachments (images, documents)', 'psp' ); ?></label>
                            <input type="file" id="psp-ticket-files" multiple accept="image/*,.pdf,.doc,.docx,.txt" />
                            <div id="psp-ticket-files-preview" class="psp-files-preview"></div>
                        </div>
                    </div>

                    <button id="psp-ticket-submit" type="button" class="psp-button psp-button-primary">
                        <?php echo esc_html__( 'Submit Ticket', 'psp' ); ?>
                    </button>
                    <div id="psp-ticket-create-status" class="psp-hint"></div>
                </div>
                <ul id="psp-ticket-list" class="psp-list" aria-live="polite"></ul>
            </section>

            <?php if ( current_user_can('psp_support') || current_user_can('administrator') ) : ?>
                <!-- Map Section (Support/Admin only - NOT visible to partners) -->
                <section class="psp-section">
                    <h3><?php echo esc_html__( 'Partner Map', 'psp' ); ?></h3>
                    <p class="psp-section-help" style="color:#6b7280;font-size:13px;margin-top:-8px;margin-bottom:12px;">🗺️ Interactive map showing all partner locations across the country.</p>
                    <div id="psp-portal-map" class="psp-map" aria-label="<?php echo esc_attr__( 'Partner locations map', 'psp' ); ?>"></div>
                </section>

                <!-- Support Tools (Support/Admin only) -->
                <section class="psp-section" id="psp-support-tools">
                    <h3><?php echo esc_html__( 'Support Tools', 'psp' ); ?></h3>
                    <p class="psp-section-help" style="color:#6b7280;font-size:13px;margin-top:-8px;margin-bottom:12px;">🔧 Update portal branding, partner lock information, and top colours without accessing WordPress admin.</p>
                    <div class="psp-ticket-create">
                        <h4><?php echo esc_html__('Branding & Colors', 'psp'); ?></h4>
                        <div class="psp-form-row">
                            <div class="psp-form-field">
                                <label for="psp-color-primary"><?php echo esc_html__('Primary Color', 'psp'); ?></label>
                                <input type="color" id="psp-color-primary" value="<?php echo esc_attr($settings['primary_color'] ?? '#3b82f6'); ?>" />
                            </div>
                            <div class="psp-form-field">
                                <label for="psp-color-primary-hover"><?php echo esc_html__('Primary Hover', 'psp'); ?></label>
                                <input type="color" id="psp-color-primary-hover" value="<?php echo esc_attr($settings['primary_hover_color'] ?? '#2563eb'); ?>" />
                            </div>
                        </div>
                        <div class="psp-form-row">
                            <div class="psp-form-field">
                                <label for="psp-color-lock-bg"><?php echo esc_html__('Lock Highlight Background', 'psp'); ?></label>
                                <input type="color" id="psp-color-lock-bg" value="<?php echo esc_attr($settings['lock_highlight_bg'] ?? '#fef3c7'); ?>" />
                            </div>
                            <div class="psp-form-field">
                                <label for="psp-color-lock-border"><?php echo esc_html__('Lock Highlight Border', 'psp'); ?></label>
                                <input type="color" id="psp-color-lock-border" value="<?php echo esc_attr($settings['lock_highlight_border'] ?? '#fbbf24'); ?>" />
                            </div>
                        </div>
                        <button type="button" id="psp-save-branding" class="psp-button psp-button-primary"><?php echo esc_html__('Save Colors', 'psp'); ?></button>
                        <div id="psp-branding-status" class="psp-hint"></div>
                    </div>

                    <div class="psp-ticket-create">
                        <h4><?php echo esc_html__('Edit Partner Info (Lock & Top Colour)', 'psp'); ?></h4>
                        <div class="psp-form-row">
                            <div class="psp-form-field">
                                <label for="psp-partner-select"><?php echo esc_html__('Partner', 'psp'); ?></label>
                                <select id="psp-partner-select"></select>
                            </div>
                            <div class="psp-form-field">
                                <label for="psp-partner-top-colour-select"><?php echo esc_html__('Top Colour', 'psp'); ?></label>
                                <select id="psp-partner-top-colour-select">
                                    <option value=""><?php echo esc_html__('Select Colour', 'psp'); ?></option>
                                    <option value="Ice Blue">Ice Blue</option>
                                    <option value="Classic Blue">Classic Blue</option>
                                    <option value="Ducati Red">Ducati Red</option>
                                    <option value="Yellow">Yellow</option>
                                    <option value="custom"><?php echo esc_html__('Custom…', 'psp'); ?></option>
                                </select>
                                <input type="text" id="psp-partner-top-colour" placeholder="<?php echo esc_attr__('Enter custom colour name or hex', 'psp'); ?>" style="display:none;margin-top:6px;" />
                            </div>
                        </div>
                        <div class="psp-form-row">
                            <div class="psp-form-field">
                                <label for="psp-lock-make"><?php echo esc_html__('Lock Make/Brand', 'psp'); ?></label>
                                <input type="text" id="psp-lock-make" />
                            </div>
                            <div class="psp-form-field">
                                <label for="psp-lock-part"><?php echo esc_html__('Lock Part #', 'psp'); ?></label>
                                <input type="text" id="psp-lock-part" />
                            </div>
                        </div>
                        <div class="psp-form-row">
                            <div class="psp-form-field">
                                <label for="psp-master-code"><?php echo esc_html__('Master Code', 'psp'); ?></label>
                                <input type="text" id="psp-master-code" />
                            </div>
                            <div class="psp-form-field">
                                <label for="psp-sub-master-code"><?php echo esc_html__('Sub-Master Code', 'psp'); ?></label>
                                <input type="text" id="psp-sub-master-code" />
                            </div>
                        </div>
                        <div class="psp-form-row">
                            <div class="psp-form-field">
                                <label for="psp-lock-key"><?php echo esc_html__('Key', 'psp'); ?></label>
                                <input type="text" id="psp-lock-key" />
                            </div>
                        </div>
                        <div class="psp-form-row">
                            <button type="button" id="psp-save-partner-lock" class="psp-button psp-button-primary"><?php echo esc_html__('Save Lock Info', 'psp'); ?></button>
                            <button type="button" id="psp-save-partner-topcolour" class="psp-button psp-button-secondary"><?php echo esc_html__('Save Top Colour', 'psp'); ?></button>
                        </div>
                        <div id="psp-partner-edit-status" class="psp-hint"></div>
                    </div>

                    <div class="psp-ticket-create" style="margin-top:24px;">
                        <h4><?php echo esc_html__('📤 Bulk Import Partners (CSV or Excel)', 'psp'); ?></h4>
                        <p style="color:#6b7280;font-size:13px;margin-bottom:12px;">Upload a <strong>CSV (.csv)</strong> or <strong>Excel (.xlsx)</strong> file to import multiple partners at once. Required: <code>company_name</code>. Optional: Include <code>user_login</code> and <code>user_pass</code> to create login accounts automatically.</p>
                        <div class="psp-form-row">
                            <div class="psp-form-field">
                                <label for="psp-csv-upload"><?php echo esc_html__('Select CSV or Excel File', 'psp'); ?></label>
                                <input type="file" id="psp-csv-upload" accept=".csv,.xlsx" />
                            </div>
                        </div>
                        <button type="button" id="psp-csv-import-btn" class="psp-button psp-button-primary"><?php echo esc_html__('Import File', 'psp'); ?></button>
                        <div id="psp-csv-status" class="psp-hint"></div>
                        <details style="margin-top:16px;">
                            <summary style="cursor:pointer;color:#3b82f6;font-size:13px;">📋 View CSV Template Format (All 18 Fields)</summary>
                            <pre style="background:#f9fafb;border:1px solid #e5e7eb;padding:12px;border-radius:6px;font-size:11px;margin-top:8px;overflow-x:auto;">user_login,user_pass,number,display_name,top_colour,company_name,management_company,units,street_address,city,state,zip,country,lock,master_code,sub_master_code,lock_part,key,phone
poolsafe_la,SecurePass123,001,Pool Safe LA,Ice Blue,Pool Safe LA,ABC Management,50,123 Main St,Los Angeles,CA,90001,USA,Schlage,1234,5678,P-100,K-200,310-555-0100
poolsafe_nyc,SecurePass456,002,Pool Safe NYC,Classic Blue,Pool Safe NYC,XYZ Corp,75,456 Broadway,New York,NY,10001,USA,Yale,9876,5432,P-200,K-300,212-555-0200</pre>
                            <p style="color:#6b7280;font-size:12px;margin-top:8px;"><strong>Notes:</strong> All fields except <code>company_name</code> are optional. If <code>user_login</code> and <code>user_pass</code> are provided, a WordPress user account will be created automatically and linked to the company.</p>
                        </details>
                    </div>
                </section>
            <?php endif; ?>
            <?php if ( current_user_can('psp_support') || current_user_can('administrator') ) : ?>
                <!-- User Management (Support/Admin only) -->
                <section class="psp-section" id="psp-user-management">
                    <h3><?php echo esc_html__('User Management', 'psp'); ?></h3>
                    <p class="psp-section-help" style="color:#6b7280;font-size:13px;margin-top:-8px;margin-bottom:12px;">👥 <strong>Create partner accounts here</strong> – no WordPress admin access needed! Users receive automatic welcome emails with login credentials.</p>
                    
                    <!-- New Unified Company + User Creation Form -->
                    <div class="psp-ticket-create" style="background:#f0f9ff;border-left:4px solid #3b82f6;padding:20px;border-radius:8px;margin-bottom:24px;">
                        <h4 style="margin-top:0;color:#1e40af;">🚀 <?php echo esc_html__('Quick Start: Create Company + Login Account', 'psp'); ?></h4>
                        <p style="color:#6b7280;font-size:13px;margin-bottom:16px;">Create a new partner company and WordPress login account in one step. Perfect for onboarding new partners!</p>
                        
                        <div class="psp-form-row">
                            <div class="psp-form-field">
                                <label for="psp-quick-company-name"><?php echo esc_html__('Company Name *', 'psp'); ?></label>
                                <input type="text" id="psp-quick-company-name" required placeholder="e.g., Pool Safe LA" />
                            </div>
                            <div class="psp-form-field">
                                <label for="psp-quick-management-company"><?php echo esc_html__('Management Company', 'psp'); ?></label>
                                <input type="text" id="psp-quick-management-company" placeholder="e.g., ABC Management" />
                            </div>
                        </div>
                        
                        <div class="psp-form-row">
                            <div class="psp-form-field">
                                <label for="psp-quick-username"><?php echo esc_html__('Username *', 'psp'); ?></label>
                                <input type="text" id="psp-quick-username" required placeholder="e.g., poolsafe_la" />
                            </div>
                            <div class="psp-form-field">
                                <label for="psp-quick-password"><?php echo esc_html__('Password *', 'psp'); ?></label>
                                <input type="password" id="psp-quick-password" required placeholder="Min 8 characters" />
                            </div>
                        </div>
                        
                        <div class="psp-form-row">
                            <div class="psp-form-field">
                                <label for="psp-quick-units"><?php echo esc_html__('Units', 'psp'); ?></label>
                                <input type="number" id="psp-quick-units" placeholder="e.g., 50" min="0" />
                            </div>
                            <div class="psp-form-field">
                                <label for="psp-quick-phone"><?php echo esc_html__('Phone', 'psp'); ?></label>
                                <input type="tel" id="psp-quick-phone" placeholder="e.g., 310-555-0100" />
                            </div>
                        </div>
                        
                        <button type="button" id="psp-quick-create" class="psp-button psp-button-primary" style="background:#3b82f6;">✨ <?php echo esc_html__('Create Company + Account', 'psp'); ?></button>
                        <div id="psp-quick-create-status" class="psp-hint"></div>
                    </div>
                    
                    <div class="psp-ticket-create">
                        <h4><?php echo esc_html__('Create Partner User', 'psp'); ?></h4>
                        <p style="color:#6b7280;font-size:13px;margin-bottom:12px;">Create a user account and link to an existing partner company.</p>
                        <div class="psp-form-row">
                            <div class="psp-form-field">
                                <label for="psp-user-email"><?php echo esc_html__('Email *', 'psp'); ?></label>
                                <input type="email" id="psp-user-email" required />
                            </div>
                            <div class="psp-form-field">
                                <label for="psp-user-partner"><?php echo esc_html__('Partner (optional)', 'psp'); ?></label>
                                <select id="psp-user-partner">
                                    <option value=""><?php echo esc_html__('None', 'psp'); ?></option>
                                </select>
                            </div>
                        </div>
                        <div class="psp-form-row">
                            <div class="psp-form-field">
                                <label for="psp-user-first-name"><?php echo esc_html__('First Name', 'psp'); ?></label>
                                <input type="text" id="psp-user-first-name" />
                            </div>
                            <div class="psp-form-field">
                                <label for="psp-user-last-name"><?php echo esc_html__('Last Name', 'psp'); ?></label>
                                <input type="text" id="psp-user-last-name" />
                            </div>
                        </div>
                        <div class="psp-form-row">
                            <div class="psp-form-field">
                                <label for="psp-user-role"><?php echo esc_html__('Role', 'psp'); ?></label>
                                <select id="psp-user-role">
                                    <option value="psp_partner"><?php echo esc_html__('Partner User', 'psp'); ?></option>
                                    <option value="psp_support"><?php echo esc_html__('Support User', 'psp'); ?></option>
                                </select>
                            </div>
                        </div>
                        <button type="button" id="psp-user-create" class="psp-button psp-button-primary"><?php echo esc_html__('Create User', 'psp'); ?></button>
                        <div id="psp-user-create-status" class="psp-hint"></div>
                    </div>
                    <div class="psp-ticket-create" style="margin-top:24px;">
                        <h4><?php echo esc_html__('Existing Users', 'psp'); ?></h4>
                        <ul id="psp-user-list" class="psp-list" aria-live="polite"></ul>
                        <div id="psp-user-list-hint" class="psp-hint"></div>
                    </div>
                </section>
            <?php endif; ?>
        </div>
        <?php
        return (string) ob_get_clean();
    }

    public static function render_map($atts = []) : string {
        if (!is_user_logged_in()) {
            return '<div class="psp-notice psp-notice--login">' . esc_html__('Please log in to view the partner map.', 'psp') . '</div>';
        }
        // Map is visible to Support/Admin only
        if (!(current_user_can('psp_support') || current_user_can('administrator'))) {
            return '<div class="psp-notice psp-notice--restricted">' . esc_html__('Access restricted to support team.', 'psp') . '</div>';
        }
        self::enqueue_assets();
        ob_start();
        ?>
        <div class="psp-block psp-block--map" data-psp-view="map">
            <h3><?php echo esc_html__('Partner Locations Map', 'psp'); ?></h3>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:12px 0;">
                <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">🗺️ Interactive map showing all partner locations. Click markers for details.</p>
            </div>
            <div id="psp-portal-map" class="psp-map" style="min-height:400px;"></div>
        </div>
        <?php
        return (string) ob_get_clean();
    }

    public static function render_tickets($atts = []) : string {
        if (!is_user_logged_in()) {
            return '<div class="psp-notice psp-notice--login">' . esc_html__('Please log in to view tickets.', 'psp') . '</div>';
        }
        self::enqueue_assets();
        // Support per-page rendering via shortcode attribute: [poolsafe_tickets view="create|list|both"]
        $atts = shortcode_atts([
            'view' => 'both', // both | create | list
        ], $atts, 'poolsafe_tickets');
        $view = is_string($atts['view']) ? strtolower($atts['view']) : 'both';
        ob_start();
        ?>
        <div class="psp-block psp-block--tickets" data-psp-view="tickets">
            <?php if ($view === 'both' || $view === 'create') : ?>
                <div id="psp-ticket-create" class="psp-ticket-create" hidden>
                    <input type="text" id="psp-ticket-title" placeholder="<?php echo esc_attr__( 'Subject', 'psp' ); ?>" />
                    <textarea id="psp-ticket-content" placeholder="<?php echo esc_attr__( 'Describe the issue (optional)', 'psp' ); ?>"></textarea>
                    
                    <div class="psp-attachment-section">
                        <label for="psp-ticket-attachments" class="psp-attachment-label">
                            📎 <?php echo esc_html__('Attach Files (images, videos, documents)', 'psp'); ?>
                        </label>
                        <input type="file" id="psp-ticket-attachments" class="psp-file-input" multiple accept="image/*,video/*,.pdf,.doc,.docx" />
                        <div id="psp-attachment-previews" class="psp-attachment-previews"></div>
                    </div>
                    
                    <button id="psp-ticket-submit" type="button"><?php echo esc_html__( 'Create Ticket', 'psp' ); ?></button>
                    <div id="psp-ticket-create-status" class="psp-hint"></div>
                </div>
            <?php endif; ?>

            <?php if ($view === 'both' || $view === 'list') : ?>
                <!-- Search & Filters -->
                <div class="psp-ticket-filters">
                    <div class="psp-filter-row">
                        <input type="text" id="psp-ticket-search" class="psp-search-input" placeholder="🔍 Search tickets..." />
                        <select id="psp-filter-status" class="psp-filter-select">
                            <option value="">All Statuses</option>
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="pending">Pending</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                        </select>
                        <select id="psp-filter-priority" class="psp-filter-select">
                            <option value="">All Priorities</option>
                            <option value="urgent">Urgent</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                        <button id="psp-clear-filters" class="psp-button psp-button-secondary">Clear</button>
                    </div>
                </div>
                <ul id="psp-ticket-list" class="psp-list" aria-live="polite"></ul>
            <?php endif; ?>
        </div>
        <?php
        return (string) ob_get_clean();
    }

    public static function render_partners($atts = []) : string {
        if (!is_user_logged_in()) {
            return '<div class="psp-notice psp-notice--login">' . esc_html__('Please log in to view partners.', 'psp') . '</div>';
        }
        self::enqueue_assets();
        ob_start();
        ?>
        <div class="psp-block psp-block--partners" data-psp-view="partners">
            <h3><?php echo esc_html__('Partner Companies', 'psp'); ?></h3>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:12px 0;">
                <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">📊 Partner companies will appear below once data is loaded.</p>
            </div>
            <ul id="psp-partner-list" class="psp-list" style="min-height:100px;"></ul>
        </div>
        <?php
        return (string) ob_get_clean();
    }

    public static function render_notifications($atts = []) : string {
        if (!is_user_logged_in()) {
            return '<div class="psp-notice psp-notice--login">' . esc_html__('Please log in to view notifications.', 'psp') . '</div>';
        }
        self::enqueue_assets();
        ob_start();
        ?>
        <div class="psp-block psp-block--notifications" data-psp-view="notifications">
            <h3><?php echo esc_html__('Notifications', 'psp'); ?></h3>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:12px 0;">
                <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">🔔 System notifications and updates will appear here.</p>
            </div>
            <ul id="psp-notification-list" class="psp-list" style="min-height:100px;"></ul>
        </div>
        <?php
        return (string) ob_get_clean();
    }

    public static function render_calendar($atts = []) : string {
        if (!is_user_logged_in()) {
            return '<div class="psp-notice psp-notice--login">' . esc_html__('Please log in to view the calendar.', 'psp') . '</div>';
        }
        self::enqueue_assets();
        ob_start();
        ?>
        <div class="psp-block psp-block--calendar" data-psp-view="calendar">
            <h3><?php echo esc_html__('Events Calendar', 'psp'); ?></h3>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:12px 0;">
                <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">📅 Scheduled events and appointments will display here.</p>
            </div>
            <div id="psp-calendar" style="min-height:300px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:20px;"></div>
        </div>
        <?php
        return (string) ob_get_clean();
    }

    public static function render_login($atts = []) : string {
        // If already logged in, show dashboard link
        if (is_user_logged_in()) {
            $current_user = wp_get_current_user();
            $portal_url = home_url('/portal'); // Adjust to your portal page slug
            ob_start();
            ?>
            <div class="psp-login-wrapper psp-logged-in">
                <div class="psp-login-box">
                    <h2><?php echo esc_html__('Welcome back!', 'psp'); ?></h2>
                    <p><?php echo sprintf(esc_html__('Logged in as %s', 'psp'), '<strong>' . esc_html($current_user->display_name) . '</strong>'); ?></p>
                    <p>
                        <a href="<?php echo esc_url($portal_url); ?>" class="button button-primary"><?php echo esc_html__('Go to Portal', 'psp'); ?></a>
                        <a href="<?php echo esc_url(wp_logout_url(get_permalink())); ?>" class="button"><?php echo esc_html__('Logout', 'psp'); ?></a>
                    </p>
                </div>
            </div>
            <?php
            return (string) ob_get_clean();
        }

        // Handle login form submission
        $login_error = '';
        if (isset($_POST['psp_login_submit'])) {
            if (!isset($_POST['psp_login_nonce']) || !wp_verify_nonce($_POST['psp_login_nonce'], 'psp_login_action')) {
                $login_error = __('Security check failed. Please try again.', 'psp');
            } else {
                $username = sanitize_text_field($_POST['psp_username']);
                $password = $_POST['psp_password'];
                $remember = isset($_POST['psp_remember']);

                $creds = [
                    'user_login' => $username,
                    'user_password' => $password,
                    'remember' => $remember,
                ];

                $user = wp_signon($creds, is_ssl());

                if (is_wp_error($user)) {
                    $login_error = $user->get_error_message();
                } else {
                    // Successful login - redirect based on role
                    $redirect_url = home_url('/portal'); // Default
                    if (current_user_can('psp_support') || current_user_can('administrator')) {
                        $redirect_url = admin_url();
                    }
                    wp_safe_redirect($redirect_url);
                    exit;
                }
            }
        }

        // Check if Azure AD SSO is configured (via Setup Wizard)
        $azure_configured = false;
        if (class_exists('PSP_Setup_Wizard')) {
            $azure_client_id = PSP_Setup_Wizard::get_setting('azure_client_id');
            $azure_tenant_id = PSP_Setup_Wizard::get_setting('azure_tenant_id');
            $azure_configured = !empty($azure_client_id) && !empty($azure_tenant_id);
        }

        // Render login form
        ob_start();
        ?>
        <div class="psp-login-wrapper">
            <div class="psp-login-box">
                <div class="psp-login-header">
                    <h2><?php echo esc_html__('Pool Safe Portal', 'psp'); ?></h2>
                    <p class="psp-login-subtitle"><?php echo esc_html__('Sign in to your account', 'psp'); ?></p>
                </div>

                <?php if ($login_error) : ?>
                    <div class="psp-login-error" role="alert">
                        <strong><?php echo esc_html__('Error:', 'psp'); ?></strong> <?php echo esc_html($login_error); ?>
                    </div>
                <?php endif; ?>

                <div class="psp-login-columns">
                    <?php if ($azure_configured) : ?>
                        <div class="psp-login-section psp-login-support">
                            <h3 class="psp-login-section-title">
                                <span class="psp-icon">👨‍💼</span> <?php echo esc_html__('Support Staff', 'psp'); ?>
                            </h3>
                            <p class="psp-login-description" style="margin-top:-4px;">
                                <?php echo esc_html__('Use your Microsoft work account (secure redirect).', 'psp'); ?>
                            </p>
                            <?php $oauth_url = wp_nonce_url(admin_url('admin-ajax.php?action=psp_azure_oauth_start'), 'psp_azure_start'); ?>
                            <a id="psp-ms-login" href="<?php echo esc_url($oauth_url); ?>" class="psp-button psp-button-microsoft psp-button-full" aria-label="<?php echo esc_attr__('Sign in with Microsoft', 'psp'); ?>">
                                <svg class="psp-microsoft-icon" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                                    <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                                    <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                                    <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                                </svg>
                                <span><?php echo esc_html__('Sign in with Microsoft', 'psp'); ?></span>
                            </a>
                            <div style="margin-top:12px;font-size:11px;color:#6b7280;line-height:1.5;">
                                <?php echo esc_html__('You will be redirected to Microsoft and back automatically.', 'psp'); ?>
                            </div>
                        </div>
                    <?php endif; ?>

                    <div class="psp-login-section psp-login-partner<?php echo $azure_configured ? '' : ' psp-login-full-width'; ?>">
                        <h3 class="psp-login-section-title">
                            <span class="psp-icon">🏢</span> <?php echo esc_html__('Partner Accounts', 'psp'); ?>
                        </h3>
                        <p class="psp-login-description" style="margin-top:-4px;">
                            <?php echo esc_html__('Sign in with the username & password provided by Pool Safe Support.', 'psp'); ?>
                        </p>
                        <form method="post" action="" class="psp-login-form" novalidate>
                            <?php wp_nonce_field('psp_login_action', 'psp_login_nonce'); ?>
                        
                        <div class="psp-form-field">
                            <label for="psp_username"><?php echo esc_html__('Username or Email', 'psp'); ?></label>
                            <input type="text" id="psp_username" name="psp_username" required autocomplete="username" placeholder="<?php echo esc_attr__('Enter your username', 'psp'); ?>" />
                        </div>

                        <div class="psp-form-field">
                            <label for="psp_password"><?php echo esc_html__('Password', 'psp'); ?></label>
                            <input type="password" id="psp_password" name="psp_password" required autocomplete="current-password" placeholder="<?php echo esc_attr__('Enter your password', 'psp'); ?>" />
                        </div>

                        <div class="psp-form-field psp-form-checkbox">
                            <label>
                                <input type="checkbox" name="psp_remember" value="1" />
                                <?php echo esc_html__('Remember me', 'psp'); ?>
                            </label>
                        </div>

                            <button type="submit" name="psp_login_submit" class="psp-button psp-button-primary psp-button-full" aria-label="<?php echo esc_attr__('Sign In', 'psp'); ?>">
                                <?php echo esc_html__('Sign In', 'psp'); ?>
                            </button>
                            <p class="psp-login-help" style="margin-top:12px;">
                                <?php echo esc_html__('Need access? Contact support to have an account created.', 'psp'); ?>
                            </p>
                        </form>
                    </div>
                </div><!-- /.psp-login-columns -->

                <div class="psp-login-footer">
                    <p class="psp-login-help">
                        <?php echo esc_html__('Issues signing in? Email', 'psp'); ?>
                        <a href="mailto:support@poolsafeinc.com">support@poolsafeinc.com</a>
                    </p>
                </div>
            </div>
        </div>
        <?php
        return (string) ob_get_clean();
    }

    /**
     * Render knowledge base shortcode
     *
     * @return string
     */
    public static function render_knowledge_base(): string {
        if (!is_user_logged_in()) {
            return '<div class="psp-kb">' . esc_html__( 'Please sign in to access the knowledge base.', 'psp' ) . '</div>';
        }

        self::enqueue_assets();
        ob_start();
        ?>
        <div class="psp-kb">
            <h3><?php echo esc_html__('Knowledge Base', 'psp'); ?></h3>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:12px 0;">
                <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">📚 Browse helpful articles and guides. Search or filter by category.</p>
            </div>
            
            <div class="psp-kb-search" style="margin:16px 0;">
                <input type="text" id="psp-kb-search-input" placeholder="<?php echo esc_attr__('Search knowledge base...', 'psp'); ?>" style="width:calc(100% - 120px);padding:10px;border:1px solid #d1d5db;border-radius:6px;" />
                <button type="button" id="psp-kb-search-btn" class="psp-button psp-button-primary" style="width:100px;margin-left:8px;"><?php echo esc_html__('Search', 'psp'); ?></button>
            </div>

            <div class="psp-kb-categories" style="margin:24px 0;">
                <h4><?php echo esc_html__('Browse by Category', 'psp'); ?></h4>
                <div id="psp-kb-categories-list" style="min-height:60px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px;"></div>
            </div>

            <div class="psp-kb-articles" style="margin:24px 0;">
                <h4><?php echo esc_html__('Articles', 'psp'); ?></h4>
                <div id="psp-kb-articles-list" style="min-height:100px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px;"></div>
            </div>

            <div id="psp-kb-article-view" class="psp-kb-article-view" style="display:none;">
                <button type="button" id="psp-kb-back-btn" class="psp-button"><?php echo esc_html__('← Back to Articles', 'psp'); ?></button>
                <div id="psp-kb-article-content"></div>
            </div>
        </div>
        <?php
        return (string) ob_get_clean();
    }

    public static function render_service_records($atts) : string {
        if (!is_user_logged_in()) {
            return '<div class="psp-notice psp-notice--error">' . esc_html__('Please log in to view service records.', 'psp') . '</div>';
        }

        $atts = shortcode_atts([
            'partner_id' => null,
        ], $atts, 'poolsafe_service_records');

        $is_support = current_user_can('psp_support') || current_user_can('administrator');
        
        // Partner users can only see their own service records
        $current_user_id = get_current_user_id();
        $partner_filter_id = null;
        if (!$is_support) {
            $partner_filter_id = intval(get_user_meta($current_user_id, 'psp_partner_id', true));
            if ($partner_filter_id > 0) {
                $atts['partner_id'] = $partner_filter_id;
            }
        }

        ob_start();
        ?>
        <div class="psp-service-records">
            <?php if (!$is_support && $partner_filter_id > 0) : ?>
                <div style="background:#e8f5f8;border-left:4px solid #3AA6B9;padding:12px 16px;border-radius:6px;margin-bottom:16px;">
                    <p style="margin:0;color:#374151;font-size:13px;">📋 Showing service records for <strong><?php echo esc_html(get_the_title($partner_filter_id)); ?></strong></p>
                </div>
            <?php endif; ?>
            <div class="psp-service-header">
                <h2><?php echo esc_html__('Service Records', 'psp'); ?></h2>
                <?php if ($is_support) : ?>
                    <button type="button" id="psp-add-service-btn" class="psp-button psp-button-primary">
                        + <?php echo esc_html__('Add Service Record', 'psp'); ?>
                    </button>
                <?php endif; ?>
            </div>

            <?php if ($is_support) : ?>
                <div id="psp-service-form" class="psp-service-form" style="display:none;">
                    <h3><?php echo esc_html__('New Service Record', 'psp'); ?></h3>
                    <form id="psp-service-record-form">
                        <div class="psp-form-row">
                            <div class="psp-form-group">
                                <label for="psp-service-partner"><?php echo esc_html__('Partner *', 'psp'); ?></label>
                                <select id="psp-service-partner" name="partner_id" required>
                                    <option value=""><?php echo esc_html__('Select Partner', 'psp'); ?></option>
                                    <?php
                                    $partners = get_posts([
                                        'post_type' => 'psp_partner',
                                        'posts_per_page' => -1,
                                        'orderby' => 'title',
                                        'order' => 'ASC'
                                    ]);
                                    foreach ($partners as $partner) {
                                        echo '<option value="' . esc_attr($partner->ID) . '">' . esc_html(get_the_title($partner)) . '</option>';
                                    }
                                    ?>
                                </select>
                            </div>

                            <div class="psp-form-group">
                                <label for="psp-service-date"><?php echo esc_html__('Service Date *', 'psp'); ?></label>
                                <input type="date" id="psp-service-date" name="service_date" required>
                            </div>

                            <div class="psp-form-group">
                                <label for="psp-service-type"><?php echo esc_html__('Service Type *', 'psp'); ?></label>
                                <select id="psp-service-type" name="service_type" required>
                                    <option value="phone"><?php echo esc_html__('Phone Support', 'psp'); ?></option>
                                    <option value="email"><?php echo esc_html__('Email Support', 'psp'); ?></option>
                                    <option value="remote"><?php echo esc_html__('Remote Support', 'psp'); ?></option>
                                    <option value="onsite_maintenance"><?php echo esc_html__('On-Site Maintenance', 'psp'); ?></option>
                                    <option value="onsite_installation"><?php echo esc_html__('On-Site Installation', 'psp'); ?></option>
                                    <option value="onsite_repair"><?php echo esc_html__('On-Site Repair', 'psp'); ?></option>
                                    <option value="onsite_inspection"><?php echo esc_html__('On-Site Inspection', 'psp'); ?></option>
                                </select>
                            </div>
                        </div>

                        <div class="psp-form-row">
                            <div class="psp-form-group">
                                <label for="psp-service-technician"><?php echo esc_html__('Technician', 'psp'); ?></label>
                                <input type="text" id="psp-service-technician" name="technician">
                            </div>

                            <div class="psp-form-group">
                                <label for="psp-service-duration"><?php echo esc_html__('Duration (minutes)', 'psp'); ?></label>
                                <input type="number" id="psp-service-duration" name="duration_minutes" min="1">
                            </div>
                        </div>

                        <div class="psp-form-group">
                            <label for="psp-service-notes"><?php echo esc_html__('Notes', 'psp'); ?></label>
                            <textarea id="psp-service-notes" name="notes" rows="4"></textarea>
                        </div>

                        <div class="psp-form-row">
                            <div class="psp-form-group">
                                <label>
                                    <input type="checkbox" id="psp-service-resolved" name="issue_resolved">
                                    <?php echo esc_html__('Issue Resolved', 'psp'); ?>
                                </label>
                            </div>

                            <div class="psp-form-group">
                                <label>
                                    <input type="checkbox" id="psp-service-followup" name="followup_required">
                                    <?php echo esc_html__('Follow-up Required', 'psp'); ?>
                                </label>
                            </div>
                        </div>

                        <div class="psp-form-actions">
                            <button type="submit" class="psp-button psp-button-primary"><?php echo esc_html__('Create Record', 'psp'); ?></button>
                            <button type="button" id="psp-cancel-service-btn" class="psp-button"><?php echo esc_html__('Cancel', 'psp'); ?></button>
                        </div>
                    </form>
                </div>
            <?php endif; ?>

            <div class="psp-service-filters">
                <label>
                    <?php echo esc_html__('Filter by type:', 'psp'); ?>
                    <select id="psp-service-filter-type">
                        <option value=""><?php echo esc_html__('All Types', 'psp'); ?></option>
                        <option value="phone"><?php echo esc_html__('Phone Support', 'psp'); ?></option>
                        <option value="email"><?php echo esc_html__('Email Support', 'psp'); ?></option>
                        <option value="remote"><?php echo esc_html__('Remote Support', 'psp'); ?></option>
                        <option value="onsite_maintenance"><?php echo esc_html__('On-Site Maintenance', 'psp'); ?></option>
                        <option value="onsite_installation"><?php echo esc_html__('On-Site Installation', 'psp'); ?></option>
                        <option value="onsite_repair"><?php echo esc_html__('On-Site Repair', 'psp'); ?></option>
                        <option value="onsite_inspection"><?php echo esc_html__('On-Site Inspection', 'psp'); ?></option>
                    </select>
                </label>
            </div>

            <div id="psp-service-timeline" class="psp-service-timeline" data-partner-id="<?php echo esc_attr($atts['partner_id']); ?>" data-per-page="25">
                <div class="psp-loading"><?php echo esc_html__('Loading service records...', 'psp'); ?></div>
            </div>
            <div class="psp-service-actions" style="margin-top:12px;">
                <button type="button" id="psp-service-load-more" class="psp-button" aria-label="<?php echo esc_attr__('Load more service records', 'psp'); ?>" style="display:none;">
                    <?php echo esc_html__('Load more', 'psp'); ?>
                </button>
            </div>
        </div>
        <?php
        return (string) ob_get_clean();
    }

    public static function render_support_tools($atts = []) : string {
        if (!is_user_logged_in()) {
            return '<div class="psp-notice psp-notice--error">' . esc_html__('Please log in to access support tools.', 'psp') . '</div>';
        }
        if (!(current_user_can('psp_support') || current_user_can('administrator'))) {
            return '<div class="psp-notice psp-notice--restricted">' . esc_html__('Access restricted to support team.', 'psp') . '</div>';
        }

        self::enqueue_assets();
        $settings = class_exists('PSP_Settings') ? PSP_Settings::get_settings() : [];
        
        ob_start();
        ?>
        <div class="psp-portal">
            <section class="psp-section" id="psp-support-tools">
                <h2><?php echo esc_html__( 'Support Tools', 'psp' ); ?></h2>
                <p class="psp-section-help" style="color:#6b7280;font-size:13px;margin-top:-8px;margin-bottom:12px;">🔧 Update portal branding, partner lock information, and top colours without accessing WordPress admin.</p>
                <div class="psp-ticket-create">
                    <h4><?php echo esc_html__('Branding & Colors', 'psp'); ?></h4>
                    <div class="psp-form-row">
                        <div class="psp-form-field">
                            <label for="psp-color-primary"><?php echo esc_html__('Primary Color', 'psp'); ?></label>
                            <input type="color" id="psp-color-primary" value="<?php echo esc_attr($settings['primary_color'] ?? '#3AA6B9'); ?>" />
                        </div>
                        <div class="psp-form-field">
                            <label for="psp-color-primary-hover"><?php echo esc_html__('Primary Hover', 'psp'); ?></label>
                            <input type="color" id="psp-color-primary-hover" value="<?php echo esc_attr($settings['primary_hover_color'] ?? '#25D0EE'); ?>" />
                        </div>
                    </div>
                    <div class="psp-form-row">
                        <div class="psp-form-field">
                            <label for="psp-color-lock-bg"><?php echo esc_html__('Lock Highlight Background', 'psp'); ?></label>
                            <input type="color" id="psp-color-lock-bg" value="<?php echo esc_attr($settings['lock_highlight_bg'] ?? '#f0f7fa'); ?>" />
                        </div>
                        <div class="psp-form-field">
                            <label for="psp-color-lock-border"><?php echo esc_html__('Lock Highlight Border', 'psp'); ?></label>
                            <input type="color" id="psp-color-lock-border" value="<?php echo esc_attr($settings['lock_highlight_border'] ?? '#3AA6B9'); ?>" />
                        </div>
                    </div>
                    <button type="button" id="psp-save-branding" class="psp-button psp-button-primary"><?php echo esc_html__('Save Colors', 'psp'); ?></button>
                    <div id="psp-branding-status" class="psp-hint"></div>
                </div>

                <div class="psp-ticket-create">
                    <h4><?php echo esc_html__('Edit Partner Info (Lock & Top Colour)', 'psp'); ?></h4>
                    <div class="psp-form-row">
                        <div class="psp-form-field">
                            <label for="psp-partner-select"><?php echo esc_html__('Partner', 'psp'); ?></label>
                            <select id="psp-partner-select"></select>
                        </div>
                        <div class="psp-form-field">
                            <label for="psp-partner-top-colour-select"><?php echo esc_html__('Top Colour', 'psp'); ?></label>
                            <select id="psp-partner-top-colour-select">
                                <option value=""><?php echo esc_html__('Select Colour', 'psp'); ?></option>
                                <option value="Ice Blue">Ice Blue</option>
                                <option value="Classic Blue">Classic Blue</option>
                                <option value="Ducati Red">Ducati Red</option>
                                <option value="Yellow">Yellow</option>
                                <option value="custom"><?php echo esc_html__('Custom…', 'psp'); ?></option>
                            </select>
                            <input type="text" id="psp-partner-top-colour" placeholder="<?php echo esc_attr__('Enter custom colour name or hex', 'psp'); ?>" style="display:none;margin-top:6px;" />
                        </div>
                    </div>
                    <div class="psp-form-row">
                        <div class="psp-form-field">
                            <label for="psp-lock-make"><?php echo esc_html__('Lock Make/Brand', 'psp'); ?></label>
                            <input type="text" id="psp-lock-make" />
                        </div>
                        <div class="psp-form-field">
                            <label for="psp-lock-part"><?php echo esc_html__('Lock Part #', 'psp'); ?></label>
                            <input type="text" id="psp-lock-part" />
                        </div>
                    </div>
                    <div class="psp-form-row">
                        <div class="psp-form-field">
                            <label for="psp-master-code"><?php echo esc_html__('Master Code', 'psp'); ?></label>
                            <input type="text" id="psp-master-code" />
                        </div>
                        <div class="psp-form-field">
                            <label for="psp-sub-master-code"><?php echo esc_html__('Sub-Master Code', 'psp'); ?></label>
                            <input type="text" id="psp-sub-master-code" />
                        </div>
                    </div>
                    <div class="psp-form-row">
                        <div class="psp-form-field">
                            <label for="psp-lock-key"><?php echo esc_html__('Key', 'psp'); ?></label>
                            <input type="text" id="psp-lock-key" />
                        </div>
                    </div>
                    <div class="psp-form-row">
                        <button type="button" id="psp-save-partner-lock" class="psp-button psp-button-primary"><?php echo esc_html__('Save Lock Info', 'psp'); ?></button>
                        <button type="button" id="psp-save-partner-topcolour" class="psp-button psp-button-secondary"><?php echo esc_html__('Save Top Colour', 'psp'); ?></button>
                    </div>
                    <div id="psp-partner-edit-status" class="psp-hint"></div>
                </div>

                <div class="psp-ticket-create" style="margin-top:24px;">
                    <h4><?php echo esc_html__('📤 Bulk Import Partners (CSV)', 'psp'); ?></h4>
                    <p style="color:#6b7280;font-size:13px;margin-bottom:12px;">Upload a CSV file to import multiple partners at once. Required column: <code>company_name</code>. After import, add authorized contacts via Company Profile.</p>
                    <div class="psp-form-row">
                        <div class="psp-form-field">
                            <label for="psp-csv-upload"><?php echo esc_html__('Select CSV File', 'psp'); ?></label>
                            <input type="file" id="psp-csv-upload" accept=".csv" />
                        </div>
                    </div>
                    <button type="button" id="psp-csv-import-btn" class="psp-button psp-button-primary"><?php echo esc_html__('Import CSV', 'psp'); ?></button>
                    <div id="psp-csv-status" class="psp-hint"></div>
                    <details style="margin-top:16px;">
                        <summary style="cursor:pointer;color:#3b82f6;font-size:13px;">📋 View CSV Template Format</summary>
                        <pre style="background:#f9fafb;border:1px solid #e5e7eb;padding:12px;border-radius:6px;font-size:12px;margin-top:8px;overflow-x:auto;">company_name,street_address,city,state,zip,country,units,top_colour
Pool Safe LA,123 Main St,Los Angeles,CA,90001,USA,50,#3AA6B9
Pool Safe NYC,456 Broadway,New York,NY,10001,USA,75,Calm Blue</pre>
                    </details>
                </div>
            </section>
        </div>
        <?php
        return (string) ob_get_clean();
    }

    public static function render_user_management($atts = []) : string {
        if (!is_user_logged_in()) {
            return '<div class="psp-notice psp-notice--error">' . esc_html__('Please log in to access user management.', 'psp') . '</div>';
        }
        if (!(current_user_can('psp_support') || current_user_can('administrator'))) {
            return '<div class="psp-notice psp-notice--restricted">' . esc_html__('Access restricted to support team.', 'psp') . '</div>';
        }

        self::enqueue_assets();
        
        ob_start();
        ?>
        <div class="psp-portal">
            <section class="psp-section" id="psp-user-management">
                <h2><?php echo esc_html__('User Management', 'psp'); ?></h2>
                <p class="psp-section-help" style="color:#6b7280;font-size:13px;margin-top:-8px;margin-bottom:12px;">👥 <strong>Create partner accounts here</strong> – no WordPress admin access needed! Users receive automatic welcome emails with login credentials.</p>
                <div class="psp-ticket-create">
                    <h4><?php echo esc_html__('Create Partner User', 'psp'); ?></h4>
                    <div class="psp-form-row">
                        <div class="psp-form-field">
                            <label for="psp-user-email"><?php echo esc_html__('Email *', 'psp'); ?></label>
                            <input type="email" id="psp-user-email" required />
                        </div>
                        <div class="psp-form-field">
                            <label for="psp-user-partner"><?php echo esc_html__('Partner (optional)', 'psp'); ?></label>
                            <select id="psp-user-partner">
                                <option value=""><?php echo esc_html__('None', 'psp'); ?></option>
                            </select>
                        </div>
                    </div>
                    <div class="psp-form-row">
                        <div class="psp-form-field">
                            <label for="psp-user-first-name"><?php echo esc_html__('First Name', 'psp'); ?></label>
                            <input type="text" id="psp-user-first-name" />
                        </div>
                        <div class="psp-form-field">
                            <label for="psp-user-last-name"><?php echo esc_html__('Last Name', 'psp'); ?></label>
                            <input type="text" id="psp-user-last-name" />
                        </div>
                    </div>
                    <div class="psp-form-row">
                        <div class="psp-form-field">
                            <label for="psp-user-role"><?php echo esc_html__('Role', 'psp'); ?></label>
                            <select id="psp-user-role">
                                <option value="psp_partner"><?php echo esc_html__('Partner User', 'psp'); ?></option>
                                <option value="psp_support"><?php echo esc_html__('Support User', 'psp'); ?></option>
                            </select>
                        </div>
                    </div>
                    <button type="button" id="psp-user-create" class="psp-button psp-button-primary"><?php echo esc_html__('Create User', 'psp'); ?></button>
                    <div id="psp-user-create-status" class="psp-hint"></div>
                </div>
                <div class="psp-ticket-create" style="margin-top:24px;">
                    <h4><?php echo esc_html__('Existing Users', 'psp'); ?></h4>
                    <ul id="psp-user-list" class="psp-list" aria-live="polite"></ul>
                    <div id="psp-user-list-hint" class="psp-hint"></div>
                </div>
            </section>
        </div>
        <?php
        return (string) ob_get_clean();
    }

    public static function render_dashboard($atts = []) : string {
        if (!is_user_logged_in()) {
            return '<div class="psp-notice psp-notice--error">' . esc_html__('Please log in to view the dashboard.', 'psp') . '</div>';
        }

        self::enqueue_assets();

        $is_support = current_user_can('psp_support') || current_user_can('administrator');
        $current_user_id = get_current_user_id();
        $current_user = wp_get_current_user();
        
        // Get personalized greeting
        $welcome_message = '';
        if ($is_support) {
            $display_name = !empty($current_user->display_name) ? $current_user->display_name : $current_user->user_login;
            $welcome_message = sprintf(esc_html__('Welcome back, %s', 'psp'), '<strong>' . esc_html($display_name) . '</strong>');
        } else {
            // Partner user - get company name, management company, and units
            $partner_id = intval(get_user_meta($current_user_id, 'psp_partner_id', true));
            if ($partner_id > 0) {
                $company_name = get_the_title($partner_id);
                $management_company = get_post_meta($partner_id, 'psp_management_company', true);
                $units = get_post_meta($partner_id, 'psp_units', true);
                
                // Build multi-line welcome message
                $welcome_message = '<div style="line-height:1.4;">';
                $welcome_message .= '<div style="font-size:28px;font-weight:700;margin-bottom:' . ($management_company ? '6px' : '0') . ';">' . esc_html($company_name) . '</div>';
                if ($management_company) {
                    $welcome_message .= '<div style="font-size:16px;font-weight:400;opacity:0.9;margin-bottom:4px;">' . esc_html($management_company) . '</div>';
                }
                if ($units) {
                    $welcome_message .= '<div style="font-size:14px;font-weight:500;opacity:0.85;">' . esc_html($units) . ' ' . esc_html__('units', 'psp') . '</div>';
                }
                $welcome_message .= '</div>';
            } else {
                $display_name = !empty($current_user->display_name) ? $current_user->display_name : $current_user->user_login;
                $welcome_message = sprintf(esc_html__('Welcome, %s', 'psp'), '<strong>' . esc_html($display_name) . '</strong>');
            }
        }

        ob_start();
        ?>
        <div class="psp-dashboard">
            <?php if ($welcome_message) : ?>
                <div class="psp-welcome-banner" style="background:linear-gradient(135deg, #3AA6B9 0%, #25D0EE 100%);color:#fff;padding:24px 28px;border-radius:8px;margin-bottom:24px;box-shadow:0 2px 8px rgba(58,166,185,0.15);">
                    <?php echo $welcome_message; ?>
                    <?php if ($is_support) : ?>
                        <p style="margin:12px 0 0;font-size:14px;opacity:0.95;color:#fff;"><?php echo esc_html__('Support Dashboard - Manage partners and tickets', 'psp'); ?></p>
                    <?php else : ?>
                        <p style="margin:8px 0 0;font-size:14px;opacity:0.85;color:#fff;"><?php echo esc_html__('Your partner dashboard overview', 'psp'); ?></p>
                    <?php endif; ?>
                </div>
            <?php endif; ?>
            <div class="psp-dashboard-header">
                <h2><?php echo esc_html__('Dashboard', 'psp'); ?></h2>
                <div class="psp-quick-actions">
                    <button type="button" class="psp-button psp-button-primary" onclick="location.href='<?php echo esc_url(home_url('/portal#create-ticket')); ?>'">
                        + <?php echo esc_html__('New Ticket', 'psp'); ?>
                    </button>
                </div>
            </div>

            <div class="psp-stats-grid">
                <div class="psp-stat-card psp-stat-open">
                    <div class="psp-stat-icon">📋</div>
                    <div class="psp-stat-content">
                        <div class="psp-stat-value" id="psp-stat-open-tickets">-</div>
                        <div class="psp-stat-label"><?php echo esc_html__('Open Tickets', 'psp'); ?></div>
                    </div>
                </div>

                <div class="psp-stat-card psp-stat-assigned">
                    <div class="psp-stat-icon">👤</div>
                    <div class="psp-stat-content">
                        <div class="psp-stat-value" id="psp-stat-assigned-tickets">-</div>
                        <div class="psp-stat-label"><?php echo esc_html__('Assigned to Me', 'psp'); ?></div>
                    </div>
                </div>

                <div class="psp-stat-card psp-stat-urgent">
                    <div class="psp-stat-icon">🔥</div>
                    <div class="psp-stat-content">
                        <div class="psp-stat-value" id="psp-stat-urgent-tickets">-</div>
                        <div class="psp-stat-label"><?php echo esc_html__('Urgent', 'psp'); ?></div>
                    </div>
                </div>

                <div class="psp-stat-card psp-stat-partners">
                    <div class="psp-stat-icon">🏢</div>
                    <div class="psp-stat-content">
                        <div class="psp-stat-value" id="psp-stat-total-partners">-</div>
                        <div class="psp-stat-label"><?php echo esc_html__('Active Partners', 'psp'); ?></div>
                    </div>
                </div>
            </div>

            <?php if ($is_support) : ?>
                <div class="psp-recent-activity">
                    <h3><?php echo esc_html__('Recent Tickets', 'psp'); ?></h3>
                    <div id="psp-dashboard-tickets" class="psp-dashboard-tickets"></div>
                </div>
            <?php endif; ?>
        </div>
        <?php
        return (string) ob_get_clean();
    }
}
