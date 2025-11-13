<?php
/**
 * Azure AD OAuth Integration
 * Handles Microsoft SSO login for support staff
 */
if (!defined('ABSPATH')) { exit; }

class PSP_Azure_AD {
    
    public static function init() : void {
        // Handle OAuth start (redirect to Microsoft)
        add_action('admin_init', [ __CLASS__, 'handle_oauth_start' ]);
        
        // Handle OAuth callback (return from Microsoft)
        add_action('wp_ajax_nopriv_psp_azure_callback', [ __CLASS__, 'handle_oauth_callback' ]);
        add_action('wp_ajax_psp_azure_callback', [ __CLASS__, 'handle_oauth_callback' ]);
    }
    
    /**
     * Start OAuth flow - Redirect to Microsoft login
     */
    public static function handle_oauth_start() : void {
        if (!isset($_GET['action']) || $_GET['action'] !== 'psp_azure_oauth_start') {
            return;
        }
        
        // Verify nonce
        if (!isset($_GET['_wpnonce']) || !wp_verify_nonce($_GET['_wpnonce'], 'psp_azure_start')) {
            wp_die(__('Security check failed.', 'psp'));
        }
        
        // Get Azure AD settings from Setup Wizard
        if (!class_exists('PSP_Setup_Wizard')) {
            wp_die(__('Setup Wizard not available. Please configure Azure AD first.', 'psp'));
        }
        
        $client_id = PSP_Setup_Wizard::get_setting('azure_client_id');
        $tenant_id = PSP_Setup_Wizard::get_setting('azure_tenant_id');
        $redirect_uri = admin_url('admin-ajax.php?action=psp_azure_callback');
        
        if (empty($client_id) || empty($tenant_id)) {
            wp_die(__('Azure AD not configured. Please complete Setup Wizard.', 'psp'));
        }
        
        // Generate and store state parameter (CSRF protection)
        $state = bin2hex(random_bytes(16));
        set_transient('psp_azure_oauth_state_' . $state, time(), 600); // 10 min expiry
        
        // Build Microsoft authorization URL
        $auth_url = sprintf(
            'https://login.microsoftonline.com/%s/oauth2/v2.0/authorize?%s',
            urlencode($tenant_id),
            http_build_query([
                'client_id' => $client_id,
                'response_type' => 'code',
                'redirect_uri' => $redirect_uri,
                'response_mode' => 'query',
                'scope' => 'openid email profile User.Read',
                'state' => $state,
            ])
        );
        
        // Redirect to Microsoft
        wp_redirect($auth_url);
        exit;
    }
    
    /**
     * Handle OAuth callback - Exchange code for token and create/login user
     */
    public static function handle_oauth_callback() : void {
        // Check for errors from Microsoft
        if (isset($_GET['error'])) {
            $error_desc = isset($_GET['error_description']) ? $_GET['error_description'] : $_GET['error'];
            wp_die(sprintf(__('Microsoft login failed: %s', 'psp'), esc_html($error_desc)));
        }
        
        // Verify state parameter (CSRF protection)
        if (!isset($_GET['state']) || !get_transient('psp_azure_oauth_state_' . $_GET['state'])) {
            wp_die(__('Invalid state parameter. Please try logging in again.', 'psp'));
        }
        
        // Delete used state
        delete_transient('psp_azure_oauth_state_' . $_GET['state']);
        
        // Get authorization code
        if (!isset($_GET['code'])) {
            wp_die(__('No authorization code received from Microsoft.', 'psp'));
        }
        
        $code = sanitize_text_field($_GET['code']);
        
        // Get Azure AD settings
        $client_id = PSP_Setup_Wizard::get_setting('azure_client_id');
        $client_secret = PSP_Setup_Wizard::get_setting('azure_client_secret');
        $tenant_id = PSP_Setup_Wizard::get_setting('azure_tenant_id');
        $redirect_uri = admin_url('admin-ajax.php?action=psp_azure_callback');
        
        // Exchange code for access token
        $token_url = sprintf(
            'https://login.microsoftonline.com/%s/oauth2/v2.0/token',
            urlencode($tenant_id)
        );
        
        $token_response = wp_remote_post($token_url, [
            'body' => [
                'client_id' => $client_id,
                'client_secret' => $client_secret,
                'code' => $code,
                'redirect_uri' => $redirect_uri,
                'grant_type' => 'authorization_code',
                'scope' => 'openid email profile User.Read',
            ],
        ]);
        
        if (is_wp_error($token_response)) {
            wp_die(sprintf(__('Token exchange failed: %s', 'psp'), $token_response->get_error_message()));
        }
        
        $token_data = json_decode(wp_remote_retrieve_body($token_response), true);
        
        if (!isset($token_data['access_token'])) {
            $error = isset($token_data['error_description']) ? $token_data['error_description'] : 'Unknown error';
            wp_die(sprintf(__('Token exchange failed: %s', 'psp'), esc_html($error)));
        }
        
        $access_token = $token_data['access_token'];
        
        // Get user info from Microsoft Graph
        $graph_response = wp_remote_get('https://graph.microsoft.com/v1.0/me', [
            'headers' => [
                'Authorization' => 'Bearer ' . $access_token,
            ],
        ]);
        
        if (is_wp_error($graph_response)) {
            wp_die(sprintf(__('Failed to get user info: %s', 'psp'), $graph_response->get_error_message()));
        }
        
        $user_data = json_decode(wp_remote_retrieve_body($graph_response), true);
        
        if (!isset($user_data['mail']) && !isset($user_data['userPrincipalName'])) {
            wp_die(__('Could not retrieve email from Microsoft account.', 'psp'));
        }
        
        // Get email (prefer mail, fallback to userPrincipalName)
        $email = isset($user_data['mail']) ? $user_data['mail'] : $user_data['userPrincipalName'];
        $display_name = isset($user_data['displayName']) ? $user_data['displayName'] : '';
        $given_name = isset($user_data['givenName']) ? $user_data['givenName'] : '';
        $surname = isset($user_data['surname']) ? $user_data['surname'] : '';
        
        // Find or create WordPress user
        $user = get_user_by('email', $email);
        
        if (!$user) {
            // Create new user (support staff)
            $username = sanitize_user(str_replace('@', '_', $email));
            $password = wp_generate_password(24, true, true);
            
            $user_id = wp_create_user($username, $password, $email);
            
            if (is_wp_error($user_id)) {
                wp_die(sprintf(__('Failed to create user: %s', 'psp'), $user_id->get_error_message()));
            }
            
            // Update user meta
            wp_update_user([
                'ID' => $user_id,
                'display_name' => $display_name,
                'first_name' => $given_name,
                'last_name' => $surname,
            ]);
            
            // Assign support role
            $user = new WP_User($user_id);
            $user->add_role('psp_support');
            
            // Mark as Azure AD user
            update_user_meta($user_id, 'psp_azure_ad_user', true);
        } else {
            // Existing user - verify they have support role
            if (!$user->has_cap('psp_support') && !$user->has_cap('administrator')) {
                wp_die(__('This account is not authorized for support access.', 'psp'));
            }
        }
        
        // Log the user in
        wp_set_current_user($user->ID);
        wp_set_auth_cookie($user->ID, true);
        do_action('wp_login', $user->user_login, $user);
        
        // Redirect to portal or admin
        $redirect_url = home_url('/portal');
        if (current_user_can('administrator')) {
            $redirect_url = admin_url();
        }
        
        wp_safe_redirect($redirect_url);
        exit;
    }
}

// Initialize
PSP_Azure_AD::init();
