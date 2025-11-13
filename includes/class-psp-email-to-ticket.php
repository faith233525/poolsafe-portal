<?php
/**
 * Email-to-Ticket Converter
 * Processes incoming emails and creates tickets automatically.
 * Matches sender email domain to partner company or allows manual linking.
 */
if (!defined('ABSPATH')) { exit; }

class PSP_Email_To_Ticket {
    
    public static function init() : void {
        // Register REST endpoint for webhook/email pipe
        add_action('rest_api_init', [ __CLASS__, 'register_routes' ]);
        
        // Admin UI for pending/unlinked emails
        add_action('admin_menu', [ __CLASS__, 'register_admin_menu' ]);
        
        // AJAX handler for manual linking
        add_action('wp_ajax_psp_link_email_to_partner', [ __CLASS__, 'ajax_link_email' ]);
    }
    
    public static function register_routes() : void {
        // Webhook endpoint for incoming email (e.g., SendGrid Inbound Parse, Mailgun Routes, Postmark)
        register_rest_route('poolsafe/v1', '/email-to-ticket', [
            'methods' => 'POST',
            'callback' => [ __CLASS__, 'handle_incoming_email' ],
            'permission_callback' => [ __CLASS__, 'verify_webhook_auth' ],
        ]);
        
        // List pending unlinked emails (support only)
        register_rest_route('poolsafe/v1', '/pending-emails', [
            'methods' => 'GET',
            'callback' => [ __CLASS__, 'list_pending_emails' ],
            'permission_callback' => function() {
                return current_user_can('administrator') || current_user_can('psp_support');
            },
        ]);
        
        // Link email to partner (support only)
        register_rest_route('poolsafe/v1', '/pending-emails/(?P<id>\d+)/link', [
            'methods' => 'POST',
            'callback' => [ __CLASS__, 'link_email_to_partner' ],
            'permission_callback' => function() {
                return current_user_can('administrator') || current_user_can('psp_support');
            },
            'args' => [
                'partner_id' => [ 'required' => true, 'type' => 'integer' ],
            ],
        ]);
    }
    
    /**
     * Verify webhook authentication (token or IP whitelist)
     */
    public static function verify_webhook_auth($request) : bool {
        // Get token from setup wizard settings (preferred)
        $webhook_token = '';
        if (class_exists('PSP_Setup_Wizard')) {
            $webhook_token = PSP_Setup_Wizard::get_setting('email_token');
        }
        
        // Fallback to old settings
        if (empty($webhook_token)) {
            $settings = get_option('psp_email_settings', []);
            $webhook_token = $settings['webhook_token'] ?? '';
        }
        
        // Fallback to wp-config.php constant
        if (empty($webhook_token) && defined('PSP_EMAIL_WEBHOOK_TOKEN')) {
            $webhook_token = PSP_EMAIL_WEBHOOK_TOKEN;
        }
        
        // Check for auth token in header or query param
        $provided_token = $request->get_header('X-Webhook-Token') ?? $request->get_param('token');
        
        if (!empty($webhook_token) && $provided_token === $webhook_token) {
            return true;
        }
        
        // Fallback: allow from localhost for testing
        $remote_ip = $_SERVER['REMOTE_ADDR'] ?? '';
        if (in_array($remote_ip, ['127.0.0.1', '::1'])) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Handle incoming email webhook
     */
    public static function handle_incoming_email(WP_REST_Request $req) {
        $data = $req->get_params();
        
        // Parse email fields (adapt to your ESP's webhook format)
        // Common fields: from, to, subject, text, html
        $from_email = sanitize_email($data['from'] ?? $data['sender'] ?? '');
        $from_name = sanitize_text_field($data['from_name'] ?? '');
        $subject = sanitize_text_field($data['subject'] ?? 'No Subject');
        $body_text = sanitize_textarea_field($data['text'] ?? $data['body-plain'] ?? '');
        $body_html = wp_kses_post($data['html'] ?? $data['body-html'] ?? '');
        $to = sanitize_email($data['to'] ?? '');
        
        if (empty($from_email)) {
            return new WP_Error('missing_sender', 'No sender email provided', ['status' => 400]);
        }
        
        // Extract domain from sender email
        $domain = substr(strrchr($from_email, '@'), 1);
        
        // Try to match domain to a partner
        $partner_id = self::find_partner_by_domain($domain);
        
        if ($partner_id) {
            // Create ticket directly
            $ticket_id = self::create_ticket_from_email([
                'partner_id' => $partner_id,
                'from_email' => $from_email,
                'from_name' => $from_name,
                'subject' => $subject,
                'body_text' => $body_text,
                'body_html' => $body_html,
                'to' => $to,
            ]);
            
            return rest_ensure_response([
                'success' => true,
                'ticket_id' => $ticket_id,
                'partner_id' => $partner_id,
                'status' => 'created',
            ]);
        } else {
            // Store as pending for manual linking
            $pending_id = self::store_pending_email([
                'from_email' => $from_email,
                'from_name' => $from_name,
                'domain' => $domain,
                'subject' => $subject,
                'body_text' => $body_text,
                'body_html' => $body_html,
                'to' => $to,
                'received_at' => current_time('mysql'),
            ]);
            
            return rest_ensure_response([
                'success' => true,
                'status' => 'pending',
                'pending_id' => $pending_id,
                'message' => 'Email stored for manual partner linking',
            ]);
        }
    }
    
    /**
     * Find partner by email domain
     */
    private static function find_partner_by_domain(string $domain) : int {
        if (empty($domain)) return 0;
        
        // Search partners with matching domain meta
        $partners = get_posts([
            'post_type' => 'psp_partner',
            'posts_per_page' => 1,
            'meta_query' => [
                [
                    'key' => 'psp_email_domain',
                    'value' => $domain,
                    'compare' => '=',
                ],
            ],
        ]);
        
        if (!empty($partners)) {
            return $partners[0]->ID;
        }
        
        // Fallback: check company_email field for exact match
        $all_partners = get_posts([
            'post_type' => 'psp_partner',
            'posts_per_page' => -1,
        ]);
        
        foreach ($all_partners as $p) {
            $email = get_post_meta($p->ID, 'psp_company_email', true);
            if (!empty($email) && stripos($email, '@' . $domain) !== false) {
                // Auto-save domain for future matching
                update_post_meta($p->ID, 'psp_email_domain', $domain);
                return $p->ID;
            }
        }
        
        return 0;
    }
    
    /**
     * Create ticket from email data
     */
    private static function create_ticket_from_email(array $data) : int {
        $ticket_id = wp_insert_post([
            'post_title' => $data['subject'],
            'post_content' => !empty($data['body_html']) ? $data['body_html'] : nl2br($data['body_text']),
            'post_type' => 'psp_ticket',
            'post_status' => 'publish',
            'post_author' => 0, // System-created
        ]);
        
        if (is_wp_error($ticket_id)) {
            return 0;
        }
        
        // Set ticket meta
        update_post_meta($ticket_id, 'psp_partner_id', $data['partner_id']);
        update_post_meta($ticket_id, 'psp_status', 'open');
        update_post_meta($ticket_id, 'psp_priority', 'medium');
        update_post_meta($ticket_id, 'psp_source', 'email');
        update_post_meta($ticket_id, 'psp_sender_email', $data['from_email']);
        update_post_meta($ticket_id, 'psp_sender_name', $data['from_name']);
        update_post_meta($ticket_id, 'psp_response_count', 0);
        
        // Generate thread ID for email response tracking
        $thread_id = 'ticket-' . $ticket_id . '-' . substr(md5($ticket_id . time()), 0, 8);
        update_post_meta($ticket_id, 'psp_thread_id', $thread_id);
        
        // Trigger notification (if enabled)
        do_action('psp_ticket_created_from_email', $ticket_id, $data);
        
        return $ticket_id;
    }
    
    /**
     * Store pending email for manual linking
     */
    private static function store_pending_email(array $data) : int {
        global $wpdb;
        $table = $wpdb->prefix . 'psp_pending_emails';
        
        // Create table if not exists
        self::maybe_create_pending_table();
        
        $wpdb->insert($table, [
            'from_email' => $data['from_email'],
            'from_name' => $data['from_name'],
            'domain' => $data['domain'],
            'subject' => $data['subject'],
            'body_text' => $data['body_text'],
            'body_html' => $data['body_html'],
            'to_email' => $data['to'],
            'received_at' => $data['received_at'],
            'status' => 'pending',
        ], ['%s','%s','%s','%s','%s','%s','%s','%s','%s']);
        
        return (int) $wpdb->insert_id;
    }
    
    /**
     * Create pending emails table (public for activator)
     */
    public static function maybe_create_pending_table() {
        global $wpdb;
        $table = $wpdb->prefix . 'psp_pending_emails';
        $charset = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE IF NOT EXISTS $table (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            from_email varchar(255) NOT NULL,
            from_name varchar(255) DEFAULT '',
            domain varchar(255) DEFAULT '',
            subject text,
            body_text longtext,
            body_html longtext,
            to_email varchar(255) DEFAULT '',
            received_at datetime NOT NULL,
            status varchar(50) DEFAULT 'pending',
            partner_id bigint(20) DEFAULT NULL,
            ticket_id bigint(20) DEFAULT NULL,
            linked_at datetime DEFAULT NULL,
            PRIMARY KEY (id),
            KEY status (status),
            KEY domain (domain)
        ) $charset;";
        
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta($sql);
    }
    
    /**
     * List pending unlinked emails (REST)
     */
    public static function list_pending_emails(WP_REST_Request $req) {
        global $wpdb;
        $table = $wpdb->prefix . 'psp_pending_emails';
        
        $results = $wpdb->get_results("SELECT * FROM $table WHERE status = 'pending' ORDER BY received_at DESC LIMIT 50", ARRAY_A);
        
        return rest_ensure_response($results);
    }
    
    /**
     * Link pending email to partner (REST)
     */
    public static function link_email_to_partner(WP_REST_Request $req) {
        global $wpdb;
        $table = $wpdb->prefix . 'psp_pending_emails';
        
        $pending_id = intval($req['id']);
        $partner_id = intval($req['partner_id']);
        
        $email_data = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id = %d", $pending_id), ARRAY_A);
        
        if (!$email_data) {
            return new WP_Error('not_found', 'Pending email not found', ['status' => 404]);
        }
        
        // Create ticket
        $ticket_id = self::create_ticket_from_email([
            'partner_id' => $partner_id,
            'from_email' => $email_data['from_email'],
            'from_name' => $email_data['from_name'],
            'subject' => $email_data['subject'],
            'body_text' => $email_data['body_text'],
            'body_html' => $email_data['body_html'],
            'to' => $email_data['to_email'],
        ]);
        
        // Update pending record
        $wpdb->update($table, [
            'status' => 'linked',
            'partner_id' => $partner_id,
            'ticket_id' => $ticket_id,
            'linked_at' => current_time('mysql'),
        ], ['id' => $pending_id], ['%s','%d','%d','%s'], ['%d']);
        
        // Auto-save domain to partner for future matching
        if (!empty($email_data['domain'])) {
            update_post_meta($partner_id, 'psp_email_domain', $email_data['domain']);
        }
        
        return rest_ensure_response([
            'success' => true,
            'ticket_id' => $ticket_id,
            'partner_id' => $partner_id,
        ]);
    }
    
    /**
     * AJAX handler for manual linking (admin UI)
     */
    public static function ajax_link_email() : void {
        check_ajax_referer('psp_link_email', 'nonce');
        
        if (!current_user_can('psp_support') && !current_user_can('administrator')) {
            wp_send_json_error(['message' => 'Insufficient permissions']);
        }
        
        $pending_id = intval($_POST['pending_id'] ?? 0);
        $partner_id = intval($_POST['partner_id'] ?? 0);
        
        if (!$pending_id || !$partner_id) {
            wp_send_json_error(['message' => 'Missing parameters']);
        }
        
        $req = new WP_REST_Request('POST', '/poolsafe/v1/pending-emails/' . $pending_id . '/link');
        $req->set_param('partner_id', $partner_id);
        
        $response = self::link_email_to_partner($req);
        
        if (is_wp_error($response)) {
            wp_send_json_error(['message' => $response->get_error_message()]);
        }
        
        wp_send_json_success($response->get_data());
    }
    
    /**
     * Register admin menu for pending emails
     */
    public static function register_admin_menu() : void {
        add_submenu_page(
            'edit.php?post_type=psp_ticket',
            __('Pending Emails', 'psp'),
            __('Pending Emails', 'psp'),
            'psp_support',
            'psp-pending-emails',
            [ __CLASS__, 'render_admin_page' ]
        );
    }
    
    /**
     * Render admin page for pending emails
     */
    public static function render_admin_page() : void {
        global $wpdb;
        $table = $wpdb->prefix . 'psp_pending_emails';
        
        $pending = $wpdb->get_results("SELECT * FROM $table WHERE status = 'pending' ORDER BY received_at DESC", ARRAY_A);
        
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('Pending Emails (Needs Partner Linking)', 'psp'); ?></h1>
            <p><?php esc_html_e('These emails could not be automatically matched to a partner company. Link them manually below.', 'psp'); ?></p>
            
            <?php if (empty($pending)): ?>
                <p><?php esc_html_e('No pending emails. All incoming emails are either auto-matched or already processed.', 'psp'); ?></p>
            <?php else: ?>
                <table class="wp-list-table widefat fixed striped">
                    <thead>
                        <tr>
                            <th><?php esc_html_e('From', 'psp'); ?></th>
                            <th><?php esc_html_e('Domain', 'psp'); ?></th>
                            <th><?php esc_html_e('Subject', 'psp'); ?></th>
                            <th><?php esc_html_e('Received', 'psp'); ?></th>
                            <th><?php esc_html_e('Actions', 'psp'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($pending as $email): ?>
                            <tr>
                                <td>
                                    <strong><?php echo esc_html($email['from_name'] ?: $email['from_email']); ?></strong><br>
                                    <small><?php echo esc_html($email['from_email']); ?></small>
                                </td>
                                <td><code><?php echo esc_html($email['domain']); ?></code></td>
                                <td><?php echo esc_html($email['subject']); ?></td>
                                <td><?php echo esc_html($email['received_at']); ?></td>
                                <td>
                                    <form method="post" action="" class="psp-link-email-form" data-email-id="<?php echo esc_attr($email['id']); ?>">
                                        <?php wp_nonce_field('psp_link_email', 'nonce'); ?>
                                        <select name="partner_id" required>
                                            <option value="">-- Select Partner --</option>
                                            <?php
                                            $partners = get_posts(['post_type' => 'psp_partner', 'posts_per_page' => -1, 'orderby' => 'title', 'order' => 'ASC']);
                                            foreach ($partners as $p) {
                                                echo '<option value="' . esc_attr($p->ID) . '">' . esc_html($p->post_title) . '</option>';
                                            }
                                            ?>
                                        </select>
                                        <button type="submit" class="button button-primary"><?php esc_html_e('Link & Create Ticket', 'psp'); ?></button>
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
        
        <script>
        jQuery(document).ready(function($){
            $('.psp-link-email-form').on('submit', function(e){
                e.preventDefault();
                var form = $(this);
                var emailId = form.data('email-id');
                var partnerId = form.find('select[name="partner_id"]').val();
                var nonce = form.find('input[name="nonce"]').val();
                
                if (!partnerId) {
                    alert('Please select a partner');
                    return;
                }
                
                $.post(ajaxurl, {
                    action: 'psp_link_email_to_partner',
                    pending_id: emailId,
                    partner_id: partnerId,
                    nonce: nonce
                }, function(response){
                    if (response.success) {
                        alert('Ticket created successfully! ID: ' + response.data.ticket_id);
                        location.reload();
                    } else {
                        alert('Error: ' + response.data.message);
                    }
                });
            });
        });
        </script>
        <?php
    }
}
