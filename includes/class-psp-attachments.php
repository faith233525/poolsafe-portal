<?php
/**
 * Attachments REST: upload/list ticket attachments using WP media library
 */
if (!defined('ABSPATH')) { exit; }

class PSP_Attachments {
    public static function register_routes() : void {
        register_rest_route('poolsafe/v1', '/attachments', [
            [
                'methods' => 'POST',
                'permission_callback' => function(){
                    // Allow Support/Admin to upload; Partners can upload if logged in (optional)
                    return is_user_logged_in();
                },
                'args' => [
                    'ticket_id' => [ 'required' => false, 'type' => 'integer' ],
                ],
                'callback' => [ __CLASS__, 'upload' ],
            ],
            [
                'methods' => 'GET',
                'permission_callback' => function(){ return is_user_logged_in(); },
                'args' => [ 'ticket_id' => [ 'required' => true, 'type' => 'integer' ] ],
                'callback' => [ __CLASS__, 'list' ],
            ],
        ]);
    }

    public static function upload(WP_REST_Request $req){
        if (empty($_FILES['file'])) {
            return new WP_Error('no_file', __('No file uploaded', 'psp'), [ 'status' => 400 ]);
        }
        if (!function_exists('media_handle_upload')) {
            require_once ABSPATH . 'wp-admin/includes/image.php';
            require_once ABSPATH . 'wp-admin/includes/file.php';
            require_once ABSPATH . 'wp-admin/includes/media.php';
        }
        $ticket_id = intval($req->get_param('ticket_id'));
        $attachment_id = media_handle_upload('file', 0);
        if (is_wp_error($attachment_id)) {
            return $attachment_id;
        }
        if ($ticket_id) {
            add_post_meta($ticket_id, 'psp_attachment_ids', $attachment_id);
        }
        $url = wp_get_attachment_url($attachment_id);
        return rest_ensure_response([ 'id' => $attachment_id, 'url' => $url ]);
    }

    public static function list(WP_REST_Request $req){
        $ticket_id = intval($req->get_param('ticket_id'));
        if (!$ticket_id) {
            return new WP_Error('bad_request', __('ticket_id is required', 'psp'), [ 'status' => 400 ]);
        }
        $ids = (array) get_post_meta($ticket_id, 'psp_attachment_ids');
        $items = [];
        foreach ($ids as $id) {
            $items[] = [ 'id' => intval($id), 'url' => wp_get_attachment_url($id) ];
        }
        return rest_ensure_response($items);
    }
}
