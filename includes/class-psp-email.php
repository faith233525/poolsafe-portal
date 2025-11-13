<?php
/**
 * Email notifications and SMTP configuration
 */
if (!defined('ABSPATH')) { exit; }

class PSP_Email {
    const OPTION_KEY = 'psp_email_settings';

    public static function init() : void {
        // Hook into ticket creation to send notifications
        add_action('transition_post_status', [ __CLASS__, 'on_ticket_status_change' ], 10, 3);
        
        // Admin settings
        add_action('admin_init', [ __CLASS__, 'register_settings' ]);
    }

    public static function register_settings() : void {
        register_setting('psp_email_group', self::OPTION_KEY, [
            'type' => 'array',
            'sanitize_callback' => [ __CLASS__, 'sanitize_settings' ],
            'default' => [
                'smtp_enabled' => false,
                'smtp_host' => '',
                'smtp_port' => '587',
                'smtp_user' => '',
                'smtp_password' => '',
                'smtp_from' => '',
                'smtp_from_name' => 'Pool Safe Portal',
                'notify_on_ticket_create' => true,
                'notify_on_ticket_update' => true,
            ],
        ]);

        add_settings_section('psp_email_section', __('Email Settings', 'psp'), function(){
            echo '<p>' . esc_html__('Configure SMTP and notification settings.', 'psp') . '</p>';
        }, 'psp-email');

        add_settings_field('psp_smtp_enabled', __('Enable SMTP', 'psp'), [ __CLASS__, 'field_smtp_enabled' ], 'psp-email', 'psp_email_section');
        add_settings_field('psp_smtp_host', __('SMTP Host', 'psp'), [ __CLASS__, 'field_smtp_host' ], 'psp-email', 'psp_email_section');
        add_settings_field('psp_smtp_port', __('SMTP Port', 'psp'), [ __CLASS__, 'field_smtp_port' ], 'psp-email', 'psp_email_section');
        add_settings_field('psp_smtp_user', __('SMTP Username', 'psp'), [ __CLASS__, 'field_smtp_user' ], 'psp-email', 'psp_email_section');
        add_settings_field('psp_smtp_password', __('SMTP Password', 'psp'), [ __CLASS__, 'field_smtp_password' ], 'psp-email', 'psp_email_section');
        add_settings_field('psp_smtp_from', __('From Email', 'psp'), [ __CLASS__, 'field_smtp_from' ], 'psp-email', 'psp_email_section');
        add_settings_field('psp_smtp_from_name', __('From Name', 'psp'), [ __CLASS__, 'field_smtp_from_name' ], 'psp-email', 'psp_email_section');
        // Hybrid fields are in PSP_Hybrid_Email settings section
    }

    public static function sanitize_settings($input) : array {
        $out = is_array($input) ? $input : [];
        $out['smtp_enabled'] = !empty($out['smtp_enabled']);
        $out['smtp_host'] = isset($out['smtp_host']) ? sanitize_text_field($out['smtp_host']) : '';
        $out['smtp_port'] = isset($out['smtp_port']) ? intval($out['smtp_port']) : 587;
        $out['smtp_user'] = isset($out['smtp_user']) ? sanitize_text_field($out['smtp_user']) : '';
        $out['smtp_password'] = isset($out['smtp_password']) ? $out['smtp_password'] : ''; // no sanitize for password
        $out['smtp_from'] = isset($out['smtp_from']) ? sanitize_email($out['smtp_from']) : '';
        $out['smtp_from_name'] = isset($out['smtp_from_name']) ? sanitize_text_field($out['smtp_from_name']) : 'Pool Safe Portal';
        $out['notify_on_ticket_create'] = !empty($out['notify_on_ticket_create']);
        $out['notify_on_ticket_update'] = !empty($out['notify_on_ticket_update']);
        return $out;
    }

    public static function get_settings() : array {
        $defaults = [
            'smtp_enabled' => false,
            'smtp_host' => '',
            'smtp_port' => 587,
            'smtp_user' => '',
            'smtp_password' => '',
            'smtp_from' => get_option('admin_email'),
            'smtp_from_name' => 'Pool Safe Portal',
            'notify_on_ticket_create' => true,
            'notify_on_ticket_update' => true,
        ];
        $opts = get_option(self::OPTION_KEY, []);
        if (!is_array($opts)) $opts = [];
        return wp_parse_args($opts, $defaults);
    }

    // Field callbacks
    public static function field_smtp_enabled() : void {
        $opts = self::get_settings();
        echo '<label><input type="checkbox" name="' . esc_attr(self::OPTION_KEY) . '[smtp_enabled]" value="1" ' . checked($opts['smtp_enabled'], true, false) . ' /> ' . esc_html__('Use custom SMTP server', 'psp') . '</label>';
    }

    public static function field_smtp_host() : void {
        $opts = self::get_settings();
        echo '<input type="text" class="regular-text" name="' . esc_attr(self::OPTION_KEY) . '[smtp_host]" value="' . esc_attr($opts['smtp_host']) . '" placeholder="smtp.example.com" />';
    }

    public static function field_smtp_port() : void {
        $opts = self::get_settings();
        echo '<input type="number" class="small-text" name="' . esc_attr(self::OPTION_KEY) . '[smtp_port]" value="' . esc_attr($opts['smtp_port']) . '" placeholder="587" />';
    }

    public static function field_smtp_user() : void {
        $opts = self::get_settings();
        echo '<input type="text" class="regular-text" name="' . esc_attr(self::OPTION_KEY) . '[smtp_user]" value="' . esc_attr($opts['smtp_user']) . '" placeholder="user@example.com" />';
    }

    public static function field_smtp_password() : void {
        $opts = self::get_settings();
        echo '<input type="password" class="regular-text" name="' . esc_attr(self::OPTION_KEY) . '[smtp_password]" value="' . esc_attr($opts['smtp_password']) . '" placeholder="' . esc_attr__('Password', 'psp') . '" />';
    }

    public static function field_smtp_from() : void {
        $opts = self::get_settings();
        echo '<input type="email" class="regular-text" name="' . esc_attr(self::OPTION_KEY) . '[smtp_from]" value="' . esc_attr($opts['smtp_from']) . '" placeholder="noreply@poolsafeinc.com" />';
    }

    public static function field_smtp_from_name() : void {
        $opts = self::get_settings();
        echo '<input type="text" class="regular-text" name="' . esc_attr(self::OPTION_KEY) . '[smtp_from_name]" value="' . esc_attr($opts['smtp_from_name']) . '" placeholder="Pool Safe Portal" />';
    }

    // Configure PHPMailer if SMTP enabled
    public static function configure_mailer($phpmailer) : void {
        $opts = self::get_settings();
        if (!$opts['smtp_enabled'] || empty($opts['smtp_host'])) {
            return;
        }

        $phpmailer->isSMTP();
        $phpmailer->Host = $opts['smtp_host'];
        $phpmailer->Port = $opts['smtp_port'];
        $phpmailer->SMTPAuth = !empty($opts['smtp_user']);
        if ($phpmailer->SMTPAuth) {
            $phpmailer->Username = $opts['smtp_user'];
            $phpmailer->Password = $opts['smtp_password'];
        }
        $phpmailer->SMTPSecure = ($opts['smtp_port'] == 465) ? 'ssl' : 'tls';
        $phpmailer->From = $opts['smtp_from'];
        $phpmailer->FromName = $opts['smtp_from_name'];
    }

    // Ticket status change hook
    public static function on_ticket_status_change($new_status, $old_status, $post) : void {
        if ($post->post_type !== 'psp_ticket') return;

        $opts = self::get_settings();
        $send = false;
        if ($new_status === 'publish' && $old_status !== 'publish' && $opts['notify_on_ticket_create']) {
            $send = true;
            $subject = __('New Support Ticket Created', 'psp');
            $message = sprintf(__('A new ticket has been created: %s', 'psp'), get_the_title($post));
        } elseif ($new_status !== $old_status && $opts['notify_on_ticket_update']) {
            $send = true;
            $subject = __('Ticket Status Updated', 'psp');
            $message = sprintf(__('Ticket "%s" status changed from %s to %s.', 'psp'), get_the_title($post), $old_status, $new_status);
        }

        if ($send) {
            $author = get_userdata($post->post_author);
            $to = $author && $author->user_email ? $author->user_email : get_option('admin_email');
            self::send($to, $subject, $message);
        }
    }

    // Send email wrapper
    public static function send($to, $subject, $message, $headers = []) : bool {
        add_action('phpmailer_init', [ __CLASS__, 'configure_mailer' ]);
        $result = wp_mail($to, $subject, $message, $headers);
        remove_action('phpmailer_init', [ __CLASS__, 'configure_mailer' ]);
        return $result;
    }

    /**
     * Send detailed new ticket notification to support team
     */
    public static function notify_new_ticket(int $ticket_id) : bool {
        $ticket = get_post($ticket_id);
        if (!$ticket) return false;

        $partner_id = get_post_meta($ticket_id, 'psp_partner_id', true);
        $partner_name = $partner_id ? get_the_title($partner_id) : 'Unknown Partner';
        
        $first_name = get_post_meta($ticket_id, 'psp_first_name', true);
        $last_name = get_post_meta($ticket_id, 'psp_last_name', true);
        $contact_email = get_post_meta($ticket_id, 'psp_contact_email', true);
        $contact_number = get_post_meta($ticket_id, 'psp_contact_number', true);
        $category = get_post_meta($ticket_id, 'psp_category', true);
        $priority = get_post_meta($ticket_id, 'psp_priority', true);

        $to = self::get_support_emails();
        if (empty($to)) return false;

        $subject = sprintf('[Pool Safe Portal] New Ticket #%d: %s', $ticket_id, $ticket->post_title);
        
        $message = sprintf(
            "A new support ticket has been created:\n\n" .
            "Ticket ID: #%d\n" .
            "Subject: %s\n" .
            "Partner: %s\n" .
            "Category: %s\n" .
            "Priority: %s\n\n" .
            "Contact Information:\n" .
            "Name: %s %s\n" .
            "Email: %s\n" .
            "Phone: %s\n\n" .
            "Message:\n%s\n\n" .
            "View ticket: %s",
            $ticket_id,
            $ticket->post_title,
            $partner_name,
            $category ?: 'Not specified',
            $priority ?: 'Normal',
            $first_name,
            $last_name,
            $contact_email,
            $contact_number,
            $ticket->post_content,
            admin_url("post.php?post={$ticket_id}&action=edit")
        );

        $headers = ['Content-Type: text/plain; charset=UTF-8'];
        if ($contact_email) {
            $headers[] = "Reply-To: {$contact_email}";
        }

        // Also create notifications for support users
        if (class_exists('PSP_Notifications')) {
            $support_users = get_users(['role' => 'psp_support']);
            foreach ($support_users as $user) {
                PSP_Notifications::create(
                    $user->ID,
                    "New Ticket: {$ticket->post_title}",
                    "Ticket #{$ticket_id} from {$partner_name}",
                    [
                        'type' => 'ticket',
                        'icon' => '🎫',
                        'link' => admin_url("post.php?post={$ticket_id}&action=edit")
                    ]
                );
            }
        }

        return self::send($to, $subject, $message, $headers);
    }

    /**
     * Send ticket status change notification to partner
     */
    public static function notify_status_change(int $ticket_id, string $old_status, string $new_status) : bool {
        $ticket = get_post($ticket_id);
        if (!$ticket || $old_status === $new_status) return false;

        $contact_email = get_post_meta($ticket_id, 'psp_contact_email', true);
        if (!$contact_email) {
            $partner_id = get_post_meta($ticket_id, 'psp_partner_id', true);
            if ($partner_id) {
                $contact_email = get_post_meta($partner_id, 'psp_company_email', true);
            }
        }

        if (!$contact_email) return false;

        $first_name = get_post_meta($ticket_id, 'psp_first_name', true);
        $partner_id = get_post_meta($ticket_id, 'psp_partner_id', true);
        $partner_name = $partner_id ? get_the_title($partner_id) : '';

        $subject = sprintf('[Pool Safe Portal] Ticket #%d Status Updated', $ticket_id);
        
        $message = sprintf(
            "Hello%s,\n\n" .
            "Your support ticket status has been updated:\n\n" .
            "Ticket ID: #%d\n" .
            "Subject: %s\n" .
            "%s" .
            "Previous Status: %s\n" .
            "New Status: %s\n\n" .
            "View your ticket: %s\n\n" .
            "Thank you,\nPool Safe Support Team",
            $first_name ? " {$first_name}" : '',
            $ticket_id,
            $ticket->post_title,
            $partner_name ? "Partner: {$partner_name}\n" : '',
            ucfirst($old_status),
            ucfirst($new_status),
            home_url('/portal')
        );

        // Create notification for partner user
        if ($partner_id && class_exists('PSP_Notifications')) {
            $partner_users = get_users([
                'meta_key' => 'psp_partner_id',
                'meta_value' => $partner_id
            ]);
            foreach ($partner_users as $user) {
                PSP_Notifications::create(
                    $user->ID,
                    "Ticket Status Updated",
                    "Ticket #{$ticket_id}: {$old_status} → {$new_status}",
                    [
                        'type' => 'ticket_update',
                        'icon' => '🔔',
                        'link' => home_url('/portal')
                    ]
                );
            }
        }

        return self::send($contact_email, $subject, $message);
    }

    /**
     * Get support team email addresses
     */
    private static function get_support_emails() : array {
        $emails = [];
        
        $support_users = get_users(['role' => 'psp_support']);
        foreach ($support_users as $user) {
            if ($user->user_email) {
                $emails[] = $user->user_email;
            }
        }

        $admin_users = get_users(['role' => 'administrator']);
        foreach ($admin_users as $user) {
            if ($user->user_email && !in_array($user->user_email, $emails)) {
                $emails[] = $user->user_email;
            }
        }

        if (empty($emails)) {
            $admin_email = get_option('admin_email');
            if ($admin_email) {
                $emails[] = $admin_email;
            }
        }

        return $emails;
    }
}
