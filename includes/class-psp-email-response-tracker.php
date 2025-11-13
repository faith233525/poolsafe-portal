<?php
/**
 * Email Response Tracking
 * Tracks support responses via portal comments AND Outlook email replies
 */
if (!defined('ABSPATH')) { exit; }

class PSP_Email_Response_Tracker {
    
    public static function init() : void {
        // Track portal comment responses
        add_action('comment_post', [ __CLASS__, 'track_portal_comment' ], 10, 2);
        
        // Register webhook endpoint for Outlook responses (via email provider)
        add_action('rest_api_init', [ __CLASS__, 'register_routes' ]);
        
        // Add response history to ticket REST API
        add_filter('psp_ticket_rest_data', [ __CLASS__, 'add_response_history' ], 10, 2);
    }
    
    /**
     * Register REST routes for email response webhook
     */
    public static function register_routes() : void {
        // Webhook for incoming support email responses
        register_rest_route('poolsafe/v1', '/email-response', [
            'methods' => 'POST',
            'permission_callback' => [ __CLASS__, 'verify_webhook_auth' ],
            'callback' => [ __CLASS__, 'handle_email_response' ],
        ]);
        
        // Get response history for a ticket
        register_rest_route('poolsafe/v1', '/tickets/(?P<id>\\d+)/responses', [
            'methods' => 'GET',
            'permission_callback' => function() {
                return current_user_can('read_psp_ticket');
            },
            'callback' => [ __CLASS__, 'get_response_history' ],
        ]);
    }
    
    /**
     * Verify webhook authentication (same token as email-to-ticket)
     */
    public static function verify_webhook_auth() : bool {
        $token = $_GET['token'] ?? '';
        $expected = defined('PSP_EMAIL_WEBHOOK_TOKEN') ? PSP_EMAIL_WEBHOOK_TOKEN : '';
        
        if ($expected && $token === $expected) {
            return true;
        }
        
        // Allow localhost for testing
        if (in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'])) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Handle incoming email response from support staff's Outlook
     */
    public static function handle_email_response(WP_REST_Request $req) {
        $data = $req->get_params();
        
        // Parse email fields
        $from_email = sanitize_email($data['from'] ?? $data['sender'] ?? '');
        $from_name = sanitize_text_field($data['from_name'] ?? '');
        $subject = sanitize_text_field($data['subject'] ?? '');
        $body_text = sanitize_textarea_field($data['text'] ?? $data['body-plain'] ?? '');
        $body_html = wp_kses_post($data['html'] ?? $data['body-html'] ?? '');
        $in_reply_to = sanitize_text_field($data['in_reply_to'] ?? $data['references'] ?? '');
        
        if (empty($from_email)) {
            return new WP_Error('missing_sender', 'No sender email', ['status' => 400]);
        }
        
        // Extract thread_id from subject or in_reply_to header
        // Subject format: "Re: [Ticket #123] Original subject"
        $ticket_id = null;
        if (preg_match('/\\[Ticket #(\\d+)\\]/', $subject, $matches)) {
            $ticket_id = intval($matches[1]);
        }
        
        // Alternative: Parse thread_id from in_reply_to header
        if (!$ticket_id && $in_reply_to) {
            // Extract thread-id from Message-ID format: <ticket-123-abc123@yoursite.com>
            if (preg_match('/ticket-(\\d+)-/', $in_reply_to, $matches)) {
                $ticket_id = intval($matches[1]);
            }
        }
        
        if (!$ticket_id) {
            return new WP_Error('no_ticket', 'Could not match email to ticket', ['status' => 400]);
        }
        
        // Verify ticket exists
        $ticket = get_post($ticket_id);
        if (!$ticket || $ticket->post_type !== 'psp_ticket') {
            return new WP_Error('invalid_ticket', 'Ticket not found', ['status' => 404]);
        }
        
        // Add response as comment
        $comment_data = [
            'comment_post_ID' => $ticket_id,
            'comment_author' => $from_name ?: $from_email,
            'comment_author_email' => $from_email,
            'comment_content' => $body_html ?: $body_text,
            'comment_type' => 'psp_ticket_response',
            'comment_approved' => 1,
            'comment_meta' => [
                'response_via' => 'outlook',
                'response_source' => 'email',
            ],
        ];
        
        $comment_id = wp_insert_comment($comment_data);
        
        if ($comment_id) {
            // Update ticket meta tracking
            self::update_ticket_response_meta($ticket_id, $from_email, 'outlook');
            
            // Send notification to partner (if enabled)
            if (class_exists('PSP_Email')) {
                PSP_Email::notify_ticket_response($ticket_id, $comment_id);
            }
            
            return rest_ensure_response([
                'success' => true,
                'ticket_id' => $ticket_id,
                'comment_id' => $comment_id,
                'message' => 'Response added to ticket',
            ]);
        }
        
        return new WP_Error('comment_failed', 'Failed to add response', ['status' => 500]);
    }
    
    /**
     * Track portal comment as response
     */
    public static function track_portal_comment(int $comment_id, $approved) : void {
        $comment = get_comment($comment_id);
        if (!$comment) return;
        
        $post = get_post($comment->comment_post_ID);
        if (!$post || $post->post_type !== 'psp_ticket') return;
        
        // Determine if this is a support response
        $user = get_user_by('email', $comment->comment_author_email);
        $is_support = $user && (user_can($user, 'administrator') || user_can($user, 'psp_support'));
        
        if ($is_support) {
            // Add comment meta
            add_comment_meta($comment_id, 'response_via', 'portal');
            add_comment_meta($comment_id, 'response_source', 'comment');
            
            // Update ticket response tracking
            self::update_ticket_response_meta($post->ID, $comment->comment_author_email, 'portal');
        }
    }
    
    /**
     * Update ticket meta with response tracking
     */
    private static function update_ticket_response_meta(int $ticket_id, string $responder, string $via) : void {
        $count = intval(get_post_meta($ticket_id, 'psp_response_count', true));
        update_post_meta($ticket_id, 'psp_response_count', $count + 1);
        update_post_meta($ticket_id, 'psp_last_response_at', current_time('mysql'));
        update_post_meta($ticket_id, 'psp_last_response_by', $responder);
        update_post_meta($ticket_id, 'psp_last_response_via', $via);
    }
    
    /**
     * Get response history for a ticket
     */
    public static function get_response_history(WP_REST_Request $req) {
        $ticket_id = intval($req['id']);
        
        $comments = get_comments([
            'post_id' => $ticket_id,
            'type' => 'psp_ticket_response',
            'orderby' => 'comment_date',
            'order' => 'ASC',
        ]);
        
        // Also get regular comments on this ticket
        $regular_comments = get_comments([
            'post_id' => $ticket_id,
            'type' => 'comment',
            'orderby' => 'comment_date',
            'order' => 'ASC',
        ]);
        
        $all_comments = array_merge($comments, $regular_comments);
        
        // Sort by date
        usort($all_comments, function($a, $b) {
            return strtotime($a->comment_date) - strtotime($b->comment_date);
        });
        
        $responses = [];
        foreach ($all_comments as $comment) {
            $via = get_comment_meta($comment->comment_ID, 'response_via', true);
            $source = get_comment_meta($comment->comment_ID, 'response_source', true);
            
            $responses[] = [
                'id' => $comment->comment_ID,
                'author' => $comment->comment_author,
                'author_email' => $comment->comment_author_email,
                'content' => $comment->comment_content,
                'date' => $comment->comment_date,
                'via' => $via ?: 'portal', // Default to portal for old comments
                'source' => $source ?: 'comment',
            ];
        }
        
        return rest_ensure_response([
            'ticket_id' => $ticket_id,
            'response_count' => count($responses),
            'responses' => $responses,
        ]);
    }
    
    /**
     * Add response history to ticket REST data
     */
    public static function add_response_history($data, int $ticket_id) {
        $data['response_count'] = intval(get_post_meta($ticket_id, 'psp_response_count', true));
        $data['last_response_at'] = get_post_meta($ticket_id, 'psp_last_response_at', true);
        $data['last_response_by'] = get_post_meta($ticket_id, 'psp_last_response_by', true);
        $data['last_response_via'] = get_post_meta($ticket_id, 'psp_last_response_via', true);
        
        return $data;
    }
}
