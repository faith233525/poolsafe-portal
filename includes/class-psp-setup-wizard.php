<?php
/**
 * Setup Wizard - Post-Activation Configuration
 * Guides admin through HubSpot, Azure AD, and Email setup
 */
if (!defined('ABSPATH')) { exit; }

class PSP_Setup_Wizard {
    
    public static function init() : void {
        add_action('admin_menu', [ __CLASS__, 'register_menu' ]);
        add_action('admin_init', [ __CLASS__, 'check_activation_redirect' ]);
        add_action('admin_enqueue_scripts', [ __CLASS__, 'enqueue_assets' ]);
        
        // AJAX handlers for testing connections
        add_action('wp_ajax_psp_test_hubspot', [ __CLASS__, 'ajax_test_hubspot' ]);
        add_action('wp_ajax_psp_test_azure', [ __CLASS__, 'ajax_test_azure' ]);
        add_action('wp_ajax_psp_generate_token', [ __CLASS__, 'ajax_generate_token' ]);
        add_action('wp_ajax_psp_save_settings', [ __CLASS__, 'ajax_save_settings' ]);
    }
    
    /**
     * Redirect to setup wizard on first activation
     */
    public static function check_activation_redirect() : void {
        if (get_transient('psp_activation_redirect')) {
            delete_transient('psp_activation_redirect');
            
            // Check if already configured
            $configured = get_option('psp_setup_completed', false);
            if (!$configured && !isset($_GET['activate-multi'])) {
                wp_safe_redirect(admin_url('admin.php?page=psp-setup-wizard'));
                exit;
            }
        }
    }
    
    /**
     * Register admin menu
     */
    public static function register_menu() : void {
        add_menu_page(
            'PoolSafe Setup',
            'PoolSafe Setup',
            'manage_options',
            'psp-setup-wizard',
            [ __CLASS__, 'render_page' ],
            'dashicons-admin-tools',
            3
        );
    }
    
    /**
     * Enqueue CSS and JS
     */
    public static function enqueue_assets($hook) : void {
        if ($hook !== 'toplevel_page_psp-setup-wizard') return;
        
        wp_enqueue_style('psp-setup-wizard', plugins_url('../assets/css/setup-wizard.css', __FILE__), [], PSP_VERSION);
        wp_enqueue_script('psp-setup-wizard', plugins_url('../assets/js/setup-wizard.js', __FILE__), ['jquery'], PSP_VERSION, true);
        
        wp_localize_script('psp-setup-wizard', 'pspSetup', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('psp_setup'),
            'siteUrl' => home_url(),
            'webhookUrl' => rest_url('poolsafe/v1/email-to-ticket'),
            'responseUrl' => rest_url('poolsafe/v1/email-response'),
            'redirectUri' => admin_url('admin-ajax.php?action=psp_azure_callback'),
        ]);
    }
    
    /**
     * Render setup wizard page
     */
    public static function render_page() : void {
        $settings = self::get_all_settings();
        $setup_completed = get_option('psp_setup_completed', false);
        
        ?>
        <div class="wrap psp-setup-wizard">
            <h1>🚀 PoolSafe Portal Setup Wizard</h1>
            <p class="description">Configure your integration settings below. All credentials are stored securely and encrypted.</p>
            
            <?php if ($setup_completed): ?>
                <div class="notice notice-success">
                    <p><strong>✓ Setup Completed!</strong> You can update any settings below.</p>
                </div>
            <?php endif; ?>
            
            <div class="psp-wizard-container">
                
                <!-- Tab Navigation -->
                <div class="psp-tabs">
                    <button class="psp-tab active" data-tab="email">📧 Email Configuration</button>
                    <button class="psp-tab" data-tab="azure">🔐 Azure AD / Outlook SSO</button>
                    <button class="psp-tab" data-tab="hubspot">📊 HubSpot CRM</button>
                    <button class="psp-tab" data-tab="summary">✅ Summary</button>
                </div>
                
                <!-- Tab Content -->
                <div class="psp-tab-content">
                    
                    <!-- Email Configuration -->
                    <div id="tab-email" class="psp-panel active">
                        <h2>Email & Webhook Configuration</h2>
                        
                        <div class="psp-section">
                            <h3>Webhook Authentication Token</h3>
                            <p>This token secures your email webhook endpoints.</p>
                            
                            <div class="psp-field-group">
                                <label>Webhook Token:</label>
                                <div class="psp-input-group">
                                    <input type="text" id="email-token" class="regular-text" 
                                           value="<?php echo esc_attr($settings['email_token'] ?? ''); ?>" 
                                           readonly>
                                    <button type="button" class="button" id="generate-token">
                                        🔄 Generate New Token
                                    </button>
                                    <button type="button" class="button" id="copy-token">
                                        📋 Copy
                                    </button>
                                </div>
                                <p class="description">Keep this token secret. It will be used in webhook URLs below.</p>
                            </div>
                        </div>
                        
                        <div class="psp-section">
                            <h3>Webhook URLs</h3>
                            <p>Configure these URLs in your email provider (SendGrid, Mailgun, Postmark):</p>
                            
                            <div class="psp-field-group">
                                <label>Email-to-Ticket Webhook:</label>
                                <div class="psp-input-group">
                                    <input type="text" id="webhook-inbound" class="large-text code" 
                                           value="<?php echo esc_url(rest_url('poolsafe/v1/email-to-ticket?token=' . ($settings['email_token'] ?? 'GENERATE_TOKEN_FIRST'))); ?>" 
                                           readonly>
                                    <button type="button" class="button copy-url" data-target="webhook-inbound">📋 Copy</button>
                                </div>
                                <p class="description">Use this for incoming emails that create new tickets.</p>
                            </div>
                            
                            <div class="psp-field-group">
                                <label>Response Tracking Webhook:</label>
                                <div class="psp-input-group">
                                    <input type="text" id="webhook-response" class="large-text code" 
                                           value="<?php echo esc_url(rest_url('poolsafe/v1/email-response?token=' . ($settings['email_token'] ?? 'GENERATE_TOKEN_FIRST'))); ?>" 
                                           readonly>
                                    <button type="button" class="button copy-url" data-target="webhook-response">📋 Copy</button>
                                </div>
                                <p class="description">Use this for tracking support email replies from Outlook.</p>
                            </div>
                        </div>
                        
                        <div class="psp-section">
                            <h3>Email Provider Setup Guide</h3>
                            <details>
                                <summary><strong>SendGrid Instructions</strong></summary>
                                <ol>
                                    <li>Go to Settings → Inbound Parse</li>
                                    <li>Add both webhook URLs above</li>
                                    <li>Configure DNS MX record: <code>mx.sendgrid.net</code></li>
                                    <li>Test with sample email</li>
                                </ol>
                            </details>
                            <details>
                                <summary><strong>Mailgun Instructions</strong></summary>
                                <ol>
                                    <li>Go to Sending → Routes</li>
                                    <li>Create route with both webhook URLs</li>
                                    <li>Filter: <code>match_recipient("support@yourdomain.com")</code></li>
                                </ol>
                            </details>
                            <details>
                                <summary><strong>Postmark Instructions</strong></summary>
                                <ol>
                                    <li>Go to Servers → Inbound</li>
                                    <li>Add webhook URLs</li>
                                    <li>Configure inbound domain</li>
                                </ol>
                            </details>
                            <p><a href="<?php echo esc_url(plugins_url('../EMAIL-TO-TICKET-SETUP.md', __FILE__)); ?>" target="_blank">📖 Full Email Setup Guide</a></p>
                        </div>
                    </div>
                    
                    <!-- Azure AD Configuration -->
                    <div id="tab-azure" class="psp-panel">
                        <h2>Azure AD / Outlook SSO Configuration</h2>
                        
                        <div class="psp-section">
                            <h3>Application Credentials</h3>
                            <p>Get these from <a href="https://portal.azure.com" target="_blank">Azure Portal</a> → App Registrations</p>
                            
                            <div class="psp-field-group">
                                <label for="azure-client-id">Client ID (Application ID):</label>
                                <input type="text" id="azure-client-id" class="regular-text" 
                                       value="<?php echo esc_attr($settings['azure_client_id'] ?? ''); ?>"
                                       placeholder="abc12345-1234-5678-90ab-cdef12345678">
                                <p class="description">Found in Azure Portal → App registrations → Overview</p>
                            </div>
                            
                            <div class="psp-field-group">
                                <label for="azure-client-secret">Client Secret (Value):</label>
                                <input type="password" id="azure-client-secret" class="regular-text" 
                                       value="<?php echo esc_attr($settings['azure_client_secret'] ?? ''); ?>"
                                       placeholder="abc~XyZ123...">
                                <p class="description">Found in Certificates & secrets → New client secret</p>
                            </div>
                            
                            <div class="psp-field-group">
                                <label for="azure-tenant-id">Tenant ID (Directory ID):</label>
                                <input type="text" id="azure-tenant-id" class="regular-text" 
                                       value="<?php echo esc_attr($settings['azure_tenant_id'] ?? ''); ?>"
                                       placeholder="def67890-5678-1234-56ab-cdef67890123">
                                <p class="description">Found in Azure Portal → Azure Active Directory → Overview</p>
                            </div>
                        </div>
                        
                        <div class="psp-section">
                            <h3>Redirect URI (Add to Azure App)</h3>
                            <div class="psp-field-group">
                                <label>Redirect URI:</label>
                                <div class="psp-input-group">
                                    <input type="text" id="azure-redirect-uri" class="large-text code" 
                                           value="<?php echo esc_url(admin_url('admin-ajax.php?action=psp_azure_callback')); ?>" 
                                           readonly>
                                    <button type="button" class="button copy-url" data-target="azure-redirect-uri">📋 Copy</button>
                                </div>
                                <p class="description">Add this to Azure Portal → Authentication → Redirect URIs (Web platform)</p>
                            </div>
                        </div>
                        
                        <div class="psp-section">
                            <h3>Required API Permissions</h3>
                            <p>Add these in Azure Portal → API permissions:</p>
                            <ul class="psp-checklist">
                                <li>✓ Microsoft Graph → User.Read</li>
                                <li>✓ Microsoft Graph → email</li>
                                <li>✓ Microsoft Graph → profile</li>
                                <li>✓ Microsoft Graph → openid</li>
                            </ul>
                            <p class="description">After adding, click "Grant admin consent"</p>
                        </div>
                        
                        <div class="psp-section">
                            <button type="button" class="button button-primary" id="test-azure">
                                🧪 Test Azure AD Connection
                            </button>
                            <span id="azure-status" class="psp-status"></span>
                        </div>
                        
                        <p><a href="<?php echo esc_url(plugins_url('../AZURE-AD-SETUP.md', __FILE__)); ?>" target="_blank">📖 Full Azure AD Setup Guide</a></p>
                    </div>
                    
                    <!-- HubSpot Configuration -->
                    <div id="tab-hubspot" class="psp-panel">
                        <h2>HubSpot CRM Integration</h2>
                        
                        <div class="psp-section">
                            <h3>Private App Credentials</h3>
                            <p>Get these from <a href="https://app.hubspot.com/integrations" target="_blank">HubSpot</a> → Settings → Integrations → Private Apps</p>
                            
                            <div class="psp-field-group">
                                <label for="hubspot-api-key">Access Token:</label>
                                <input type="password" id="hubspot-api-key" class="regular-text" 
                                       value="<?php echo esc_attr($settings['hubspot_api_key'] ?? ''); ?>"
                                       placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
                                <p class="description">Private app access token (starts with pat-na1-)</p>
                            </div>
                            
                            <div class="psp-field-group">
                                <label for="hubspot-portal-id">Portal ID (Hub ID):</label>
                                <input type="text" id="hubspot-portal-id" class="regular-text" 
                                       value="<?php echo esc_attr($settings['hubspot_portal_id'] ?? ''); ?>"
                                       placeholder="12345678">
                                <p class="description">Found in Settings → Account Setup → Account Defaults</p>
                            </div>
                        </div>
                        
                        <div class="psp-section">
                            <h3>Required Scopes</h3>
                            <p>Ensure your private app has these scopes:</p>
                            <ul class="psp-checklist">
                                <li>✓ crm.objects.companies.read</li>
                                <li>✓ crm.objects.companies.write</li>
                                <li>✓ crm.objects.contacts.read</li>
                                <li>✓ crm.objects.contacts.write</li>
                                <li>✓ crm.objects.deals.read</li>
                                <li>✓ crm.objects.deals.write</li>
                            </ul>
                        </div>
                        
                        <div class="psp-section">
                            <h3>Sync Options</h3>
                            <div class="psp-field-group">
                                <label>
                                    <input type="checkbox" id="hubspot-sync-enabled" 
                                           <?php checked($settings['hubspot_sync_enabled'] ?? false); ?>>
                                    Enable HubSpot Sync
                                </label>
                            </div>
                            <div class="psp-field-group">
                                <label for="hubspot-sync-frequency">Sync Frequency:</label>
                                <select id="hubspot-sync-frequency">
                                    <option value="realtime" <?php selected($settings['hubspot_sync_frequency'] ?? 'realtime', 'realtime'); ?>>Real-time</option>
                                    <option value="hourly" <?php selected($settings['hubspot_sync_frequency'] ?? '', 'hourly'); ?>>Hourly</option>
                                    <option value="daily" <?php selected($settings['hubspot_sync_frequency'] ?? '', 'daily'); ?>>Daily</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="psp-section">
                            <button type="button" class="button button-primary" id="test-hubspot">
                                🧪 Test HubSpot Connection
                            </button>
                            <span id="hubspot-status" class="psp-status"></span>
                        </div>
                        
                        <p><a href="<?php echo esc_url(plugins_url('../HUBSPOT-SETUP.md', __FILE__)); ?>" target="_blank">📖 Full HubSpot Setup Guide</a></p>
                    </div>
                    
                    <!-- Summary -->
                    <div id="tab-summary" class="psp-panel">
                        <h2>Configuration Summary</h2>
                        
                        <div class="psp-status-cards">
                            <div class="psp-status-card" id="status-email">
                                <div class="psp-card-icon">📧</div>
                                <h3>Email Configuration</h3>
                                <p class="psp-card-status">
                                    <?php echo ($settings['email_token'] ?? false) ? '✅ Token Generated' : '⚠️ Token Not Generated'; ?>
                                </p>
                            </div>
                            
                            <div class="psp-status-card" id="status-azure">
                                <div class="psp-card-icon">🔐</div>
                                <h3>Azure AD SSO</h3>
                                <p class="psp-card-status">
                                    <?php echo ($settings['azure_client_id'] ?? false) ? '✅ Configured' : '⚠️ Not Configured'; ?>
                                </p>
                            </div>
                            
                            <div class="psp-status-card" id="status-hubspot">
                                <div class="psp-card-icon">📊</div>
                                <h3>HubSpot CRM</h3>
                                <p class="psp-card-status">
                                    <?php echo ($settings['hubspot_api_key'] ?? false) ? '✅ Configured' : '⚠️ Not Configured'; ?>
                                </p>
                            </div>
                        </div>
                        
                        <div class="psp-section">
                            <h3>Next Steps</h3>
                            <ol class="psp-next-steps">
                                <li>Copy webhook URLs and add to your email provider</li>
                                <li>Add redirect URI to Azure AD app registration</li>
                                <li>Test Azure AD login with support account</li>
                                <li>Test HubSpot connection and run initial sync</li>
                                <li>Import partner companies (CSV/Excel bulk import)</li>
                                <li>Create support user accounts</li>
                                <li>Test ticket creation (portal + email)</li>
                                <li>Verify email response tracking</li>
                            </ol>
                        </div>
                        
                        <div class="psp-section">
                            <button type="button" class="button button-primary button-hero" id="complete-setup">
                                ✅ Mark Setup as Complete
                            </button>
                        </div>
                    </div>
                    
                </div>
                
                <!-- Save Button (Fixed Bottom) -->
                <div class="psp-wizard-footer">
                    <button type="button" class="button button-primary button-large" id="save-settings">
                        💾 Save Settings
                    </button>
                    <span id="save-status" class="psp-save-status"></span>
                </div>
                
            </div>
        </div>
        <?php
    }
    
    /**
     * Get all settings from database
     */
    private static function get_all_settings() : array {
        return [
            'email_token' => self::get_setting('email_token'),
            'azure_client_id' => self::get_setting('azure_client_id'),
            'azure_client_secret' => self::get_setting('azure_client_secret'),
            'azure_tenant_id' => self::get_setting('azure_tenant_id'),
            'hubspot_api_key' => self::get_setting('hubspot_api_key'),
            'hubspot_portal_id' => self::get_setting('hubspot_portal_id'),
            'hubspot_sync_enabled' => self::get_setting('hubspot_sync_enabled'),
            'hubspot_sync_frequency' => self::get_setting('hubspot_sync_frequency', 'realtime'),
        ];
    }
    
    /**
     * Get single setting (with decryption for sensitive data)
     */
    public static function get_setting(string $key, $default = '') {
        $value = get_option('psp_setting_' . $key, $default);
        
        // Decrypt sensitive fields
        $sensitive = ['azure_client_secret', 'hubspot_api_key', 'email_token'];
        if (in_array($key, $sensitive) && !empty($value)) {
            return self::decrypt($value);
        }
        
        return $value;
    }
    
    /**
     * Save setting (with encryption for sensitive data)
     */
    public static function save_setting(string $key, $value) : bool {
        $sensitive = ['azure_client_secret', 'hubspot_api_key', 'email_token'];
        if (in_array($key, $sensitive) && !empty($value)) {
            $value = self::encrypt($value);
        }
        
        return update_option('psp_setting_' . $key, $value);
    }
    
    /**
     * Simple encryption (uses WordPress salts)
     */
    private static function encrypt(string $data) : string {
        if (empty($data)) return '';
        
        $key = wp_salt('auth');
        $iv = openssl_random_pseudo_bytes(16);
        $encrypted = openssl_encrypt($data, 'AES-256-CBC', $key, 0, $iv);
        
        return base64_encode($iv . $encrypted);
    }
    
    /**
     * Simple decryption
     */
    private static function decrypt(string $data) : string {
        if (empty($data)) return '';
        
        $key = wp_salt('auth');
        $decoded = base64_decode($data);
        $iv = substr($decoded, 0, 16);
        $encrypted = substr($decoded, 16);
        
        return openssl_decrypt($encrypted, 'AES-256-CBC', $key, 0, $iv);
    }
    
    /**
     * AJAX: Generate secure token
     */
    public static function ajax_generate_token() : void {
        check_ajax_referer('psp_setup', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Insufficient permissions']);
        }
        
        $token = bin2hex(random_bytes(32));
        self::save_setting('email_token', $token);
        
        wp_send_json_success([
            'token' => $token,
            'webhookInbound' => rest_url('poolsafe/v1/email-to-ticket?token=' . $token),
            'webhookResponse' => rest_url('poolsafe/v1/email-response?token=' . $token),
        ]);
    }
    
    /**
     * AJAX: Save all settings
     */
    public static function ajax_save_settings() : void {
        check_ajax_referer('psp_setup', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Insufficient permissions']);
        }
        
        $settings = $_POST['settings'] ?? [];
        
        foreach ($settings as $key => $value) {
            self::save_setting($key, sanitize_text_field($value));
        }
        
        wp_send_json_success(['message' => 'Settings saved successfully']);
    }
    
    /**
     * AJAX: Test Azure AD connection
     */
    public static function ajax_test_azure() : void {
        check_ajax_referer('psp_setup', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Insufficient permissions']);
        }
        
        $client_id = $_POST['client_id'] ?? '';
        $tenant_id = $_POST['tenant_id'] ?? '';
        
        if (empty($client_id) || empty($tenant_id)) {
            wp_send_json_error(['message' => 'Client ID and Tenant ID required']);
        }
        
        // Test Microsoft Graph metadata endpoint
        $url = "https://login.microsoftonline.com/{$tenant_id}/v2.0/.well-known/openid-configuration";
        $response = wp_remote_get($url);
        
        if (is_wp_error($response)) {
            wp_send_json_error(['message' => 'Failed to connect: ' . $response->get_error_message()]);
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        if ($status_code === 200) {
            wp_send_json_success(['message' => 'Azure AD tenant found! Configuration valid.']);
        } else {
            wp_send_json_error(['message' => 'Invalid Tenant ID or connection failed']);
        }
    }
    
    /**
     * AJAX: Test HubSpot connection
     */
    public static function ajax_test_hubspot() : void {
        check_ajax_referer('psp_setup', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Insufficient permissions']);
        }
        
        $api_key = $_POST['api_key'] ?? '';
        
        if (empty($api_key)) {
            wp_send_json_error(['message' => 'API Key required']);
        }
        
        // Test HubSpot API with account info endpoint
        $url = 'https://api.hubapi.com/account-info/v3/details';
        $response = wp_remote_get($url, [
            'headers' => [
                'Authorization' => 'Bearer ' . $api_key,
            ],
        ]);
        
        if (is_wp_error($response)) {
            wp_send_json_error(['message' => 'Failed to connect: ' . $response->get_error_message()]);
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        if ($status_code === 200) {
            $body = json_decode(wp_remote_retrieve_body($response), true);
            $portal_id = $body['portalId'] ?? 'Unknown';
            wp_send_json_success([
                'message' => 'HubSpot connected successfully!',
                'portalId' => $portal_id,
            ]);
        } else {
            $body = wp_remote_retrieve_body($response);
            wp_send_json_error(['message' => 'Invalid API key or connection failed', 'details' => $body]);
        }
    }
}
