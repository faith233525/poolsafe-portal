<?php
/**
 * Auto-Configuration Helper
 * Pre-populates setup wizard with provided credentials
 * This file will auto-import settings on first setup wizard load
 */
if (!defined('ABSPATH')) { exit; }

class PSP_Auto_Config {
    
    public static function init() : void {
        // Run auto-config on admin_init if not already configured
        add_action('admin_init', [ __CLASS__, 'maybe_auto_configure' ]);
    }
    
    /**
     * Auto-configure with provided credentials (one-time only)
     * 
     * Credentials should be defined in wp-config.php as constants:
     * define('PSP_AZURE_CLIENT_ID', 'your-client-id');
     * define('PSP_AZURE_CLIENT_SECRET', 'your-client-secret');
     * define('PSP_AZURE_TENANT_ID', 'your-tenant-id');
     * define('PSP_HUBSPOT_API_KEY', 'your-api-key');
     * define('PSP_HUBSPOT_PORTAL_ID', 'your-portal-id');
     */
    public static function maybe_auto_configure() : void {
        // Check if already auto-configured
        if (get_option('psp_auto_configured', false)) {
            return;
        }
        
        // Check if setup wizard class exists
        if (!class_exists('PSP_Setup_Wizard')) {
            return;
        }
        
        // Check if constants are defined (from wp-config.php)
        $has_azure = defined('PSP_AZURE_CLIENT_ID') && defined('PSP_AZURE_CLIENT_SECRET') && defined('PSP_AZURE_TENANT_ID');
        $has_hubspot = defined('PSP_HUBSPOT_API_KEY') && defined('PSP_HUBSPOT_PORTAL_ID');
        
        // Skip if no credentials provided
        if (!$has_azure && !$has_hubspot) {
            return;
        }
        
        // Auto-populate settings with provided credentials
        $settings = [];
        
        // Azure AD/Outlook SSO
        if ($has_azure) {
            $settings['azure_client_id'] = PSP_AZURE_CLIENT_ID;
            $settings['azure_client_secret'] = PSP_AZURE_CLIENT_SECRET;
            $settings['azure_tenant_id'] = PSP_AZURE_TENANT_ID;
        }
        
        // HubSpot CRM
        if ($has_hubspot) {
            $settings['hubspot_api_key'] = PSP_HUBSPOT_API_KEY;
            $settings['hubspot_portal_id'] = PSP_HUBSPOT_PORTAL_ID;
            $settings['hubspot_sync_enabled'] = '1';
            $settings['hubspot_sync_frequency'] = 'realtime';
        }
        
        // Generate secure email webhook token
        if (!PSP_Setup_Wizard::get_setting('email_token')) {
            $settings['email_token'] = bin2hex(random_bytes(32));
        }
        
        // Save all settings (will be encrypted automatically)
        foreach ($settings as $key => $value) {
            PSP_Setup_Wizard::save_setting($key, $value);
        }
        
        // Mark as auto-configured
        update_option('psp_auto_configured', true);
        
        // Add admin notice
        add_action('admin_notices', function() use ($has_azure, $has_hubspot) {
            ?>
            <div class="notice notice-success is-dismissible">
                <p><strong>✅ PoolSafe Portal Auto-Configured!</strong></p>
                <?php if ($has_azure): ?>
                <p>✓ Azure AD SSO configured</p>
                <?php endif; ?>
                <?php if ($has_hubspot): ?>
                <p>✓ HubSpot CRM configured</p>
                <?php endif; ?>
                <p>✓ Email webhook token generated</p>
                <p><a href="<?php echo admin_url('admin.php?page=psp-setup-wizard'); ?>" class="button button-primary">Go to Setup Wizard →</a></p>
            </div>
            <?php
        });
    }
    
    /**
     * Get Microsoft Outlook email configuration instructions
     */
    public static function get_outlook_config() : array {
        $webhook_token = PSP_Setup_Wizard::get_setting('email_token');
        
        return [
            'provider' => 'Microsoft Outlook (Microsoft 365 / Exchange)',
            'method' => 'Power Automate Flow',
            'instructions' => [
                'step1' => [
                    'title' => 'Create Power Automate Flow',
                    'url' => 'https://make.powerautomate.com',
                    'actions' => [
                        '1. Sign in with your Microsoft 365 account',
                        '2. Click "Create" → "Automated cloud flow"',
                        '3. Name: "PoolSafe Email to Ticket"',
                        '4. Trigger: "When a new email arrives (V3)"',
                    ],
                ],
                'step2' => [
                    'title' => 'Configure Email Trigger',
                    'settings' => [
                        'Folder: Inbox (or create dedicated "Support" folder)',
                        'To: support@yourcompany.com (or specific support email)',
                        'Include Attachments: Yes',
                        'Only with Attachments: No',
                    ],
                ],
                'step3' => [
                    'title' => 'Add HTTP Action (Email-to-Ticket)',
                    'action' => 'HTTP - POST',
                    'config' => [
                        'Method' => 'POST',
                        'URI' => rest_url('poolsafe/v1/email-to-ticket?token=' . $webhook_token),
                        'Headers' => [
                            'Content-Type' => 'application/json',
                        ],
                        'Body' => json_encode([
                            'from' => '@{triggerOutputs()?[\'body/from\']}',
                            'from_name' => '@{triggerOutputs()?[\'body/fromName\']}',
                            'to' => '@{triggerOutputs()?[\'body/to\']}',
                            'subject' => '@{triggerOutputs()?[\'body/subject\']}',
                            'text' => '@{triggerOutputs()?[\'body/bodyPreview\']}',
                            'html' => '@{triggerOutputs()?[\'body/body\']}',
                        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
                    ],
                ],
                'step4' => [
                    'title' => 'Add HTTP Action (Response Tracking)',
                    'note' => 'Only add this if email is a reply to existing ticket',
                    'condition' => 'Subject contains "[Ticket #"',
                    'action' => 'HTTP - POST',
                    'config' => [
                        'Method' => 'POST',
                        'URI' => rest_url('poolsafe/v1/email-response?token=' . $webhook_token),
                        'Headers' => [
                            'Content-Type' => 'application/json',
                        ],
                        'Body' => json_encode([
                            'from' => '@{triggerOutputs()?[\'body/from\']}',
                            'from_name' => '@{triggerOutputs()?[\'body/fromName\']}',
                            'subject' => '@{triggerOutputs()?[\'body/subject\']}',
                            'text' => '@{triggerOutputs()?[\'body/bodyPreview\']}',
                            'html' => '@{triggerOutputs()?[\'body/body\']}',
                            'in_reply_to' => '@{triggerOutputs()?[\'body/conversationId\']}',
                        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
                    ],
                ],
                'step5' => [
                    'title' => 'Save and Test',
                    'actions' => [
                        '1. Click "Save" in Power Automate',
                        '2. Send test email to support address',
                        '3. Check Flow run history for success',
                        '4. Verify ticket created in WordPress',
                    ],
                ],
            ],
            'alternative' => [
                'name' => 'Microsoft Graph API (Advanced)',
                'description' => 'Use the same Azure AD app credentials to access Microsoft Graph API for direct email polling',
                'documentation' => 'https://learn.microsoft.com/en-us/graph/api/user-list-messages',
            ],
        ];
    }
}

// Initialize auto-config
PSP_Auto_Config::init();
