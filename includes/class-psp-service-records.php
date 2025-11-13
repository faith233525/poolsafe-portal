<?php
/**
 * Service Records - Track support interactions and on-site services
 * Includes: phone, email, remote support, maintenance, installation, repairs, inspections
 */
if (!defined('ABSPATH')) { exit; }

class PSP_Service_Records {
    public static function register_cpt() : void {
        register_post_type('psp_service_record', [
            'labels' => [ 
                'name' => __('Service Records','psp'), 
                'singular_name' => __('Service Record','psp'),
                'add_new' => __('Add Service Record','psp'),
                'add_new_item' => __('Add New Service Record','psp'),
                'edit_item' => __('Edit Service Record','psp'),
                'view_item' => __('View Service Record','psp'),
            ],
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => 'psp-admin',
            'supports' => ['title','editor','custom-fields','author'],
            'show_in_rest' => false,
            'menu_icon' => 'dashicons-clipboard',
            'capability_type' => 'post',
            'capabilities' => [
                'edit_post' => 'edit_psp_tickets',
                'read_post' => 'read_psp_tickets',
                'delete_post' => 'delete_psp_tickets',
                'edit_posts' => 'edit_psp_tickets',
                'edit_others_posts' => 'edit_psp_tickets',
                'publish_posts' => 'publish_psp_tickets',
                'read_private_posts' => 'read_psp_tickets',
            ],
        ]);
        
        // Core fields
        register_post_meta('psp_service_record', 'psp_partner_id', [ 'type' => 'integer', 'single' => true, 'show_in_rest' => false ]);
        register_post_meta('psp_service_record', 'psp_service_date', [ 'type' => 'string', 'single' => true, 'show_in_rest' => false ]);
        
        // Service type: phone, email, remote, onsite_maintenance, onsite_installation, onsite_repair, onsite_inspection
        register_post_meta('psp_service_record', 'psp_service_type', [ 'type' => 'string', 'single' => true, 'show_in_rest' => false ]);
        
        // Support interaction fields
        register_post_meta('psp_service_record', 'psp_contact_method', [ 'type' => 'string', 'single' => true, 'show_in_rest' => false ]); // phone, email, chat, remote
        register_post_meta('psp_service_record', 'psp_duration_minutes', [ 'type' => 'integer', 'single' => true, 'show_in_rest' => false ]);
        
        // On-site service fields
        register_post_meta('psp_service_record', 'psp_onsite_type', [ 'type' => 'string', 'single' => true, 'show_in_rest' => false ]); // maintenance, installation, repair, inspection
        register_post_meta('psp_service_record', 'psp_technician', [ 'type' => 'string', 'single' => true, 'show_in_rest' => false ]);
        
        // Resolution tracking
        register_post_meta('psp_service_record', 'psp_issue_resolved', [ 'type' => 'boolean', 'single' => true, 'show_in_rest' => false ]);
        register_post_meta('psp_service_record', 'psp_followup_required', [ 'type' => 'boolean', 'single' => true, 'show_in_rest' => false ]);
        register_post_meta('psp_service_record', 'psp_followup_date', [ 'type' => 'string', 'single' => true, 'show_in_rest' => false ]);
        
        // Related ticket
        register_post_meta('psp_service_record', 'psp_related_ticket_id', [ 'type' => 'integer', 'single' => true, 'show_in_rest' => false ]);
    }

    public static function register_routes() : void {
        register_rest_route('poolsafe/v1', '/service-records', [
            [
                'methods' => 'GET',
                'permission_callback' => function(){ return is_user_logged_in(); },
                'callback' => [ __CLASS__, 'list_records' ],
                'args' => [
                    'partner_id' => [ 'required' => false, 'type' => 'integer' ],
                    'service_type' => [ 'required' => false, 'type' => 'string' ],
                    'page' => [ 'required' => false, 'type' => 'integer' ],
                    'per_page' => [ 'required' => false, 'type' => 'integer' ],
                ],
            ],
            [
                'methods' => 'POST',
                'permission_callback' => function(){ return current_user_can('publish_psp_tickets') || current_user_can('administrator'); },
                'args' => [
                    'partner_id' => [ 'required' => true, 'type' => 'integer' ],
                    'service_date' => [ 'required' => true, 'type' => 'string' ],
                    'service_type' => [ 'required' => true, 'type' => 'string' ], // phone, email, remote, onsite_maintenance, onsite_installation, onsite_repair, onsite_inspection
                    'notes' => [ 'required' => false, 'type' => 'string' ],
                    // Support interaction fields
                    'contact_method' => [ 'required' => false, 'type' => 'string' ],
                    'duration_minutes' => [ 'required' => false, 'type' => 'integer' ],
                    // On-site service fields
                    'onsite_type' => [ 'required' => false, 'type' => 'string' ],
                    'technician' => [ 'required' => false, 'type' => 'string' ],
                    // Resolution
                    'issue_resolved' => [ 'required' => false, 'type' => 'boolean' ],
                    'followup_required' => [ 'required' => false, 'type' => 'boolean' ],
                    'followup_date' => [ 'required' => false, 'type' => 'string' ],
                    'related_ticket_id' => [ 'required' => false, 'type' => 'integer' ],
                ],
                'callback' => [ __CLASS__, 'create_record' ],
            ],
        ]);
        
        // Get single service record
        register_rest_route('poolsafe/v1', '/service-records/(?P<id>\d+)', [
            'methods' => 'GET',
            'permission_callback' => function(){ return is_user_logged_in(); },
            'callback' => [ __CLASS__, 'get_record' ],
        ]);
    }

    public static function list_records(WP_REST_Request $req){
        $page = max(1, intval($req['page'] ?: 1));
        $per_page = intval($req['per_page'] ?: 25);
        if ($per_page < 1) $per_page = 1; if ($per_page > 100) $per_page = 100;
        $offset = ($page - 1) * $per_page;

        $args = [
            'post_type' => 'psp_service_record',
            'posts_per_page' => $per_page,
            'offset' => $offset,
            'orderby' => 'date', 
            'order' => 'DESC'
        ];
        
        // Filter by partner
        if ($req['partner_id']) {
            $args['meta_query'] = [
                [
                    'key' => 'psp_partner_id',
                    'value' => intval($req['partner_id']),
                    'compare' => '='
                ]
            ];
        }
        
        // Filter by service type
        if ($req['service_type']) {
            if (!isset($args['meta_query'])) {
                $args['meta_query'] = [];
            }
            $args['meta_query'][] = [
                'key' => 'psp_service_type',
                'value' => sanitize_text_field($req['service_type']),
                'compare' => '='
            ];
        }
        
        $q = new WP_Query($args);
        $out = [];
        
        foreach ($q->posts as $p){
            $partner_id = intval(get_post_meta($p->ID, 'psp_partner_id', true));
            $partner_name = '';
            if ($partner_id) {
                $partner_post = get_post($partner_id);
                $partner_name = $partner_post ? $partner_post->post_title : '';
            }
            
            $service_type = get_post_meta($p->ID, 'psp_service_type', true);
            
            $record = [
                'id' => $p->ID,
                'partner_id' => $partner_id,
                'partner_name' => $partner_name,
                'service_date' => get_post_meta($p->ID, 'psp_service_date', true),
                'service_type' => $service_type,
                'notes' => apply_filters('the_content', $p->post_content),
                'created_by' => (int) $p->post_author,
                'created_at' => get_post_time('c', true, $p),
            ];
            
            // Add type-specific fields
            if (in_array($service_type, ['phone', 'email', 'remote'])) {
                $record['contact_method'] = get_post_meta($p->ID, 'psp_contact_method', true);
                $record['duration_minutes'] = intval(get_post_meta($p->ID, 'psp_duration_minutes', true));
            }
            
            if (strpos($service_type, 'onsite_') === 0) {
                $record['onsite_type'] = get_post_meta($p->ID, 'psp_onsite_type', true);
                $record['technician'] = get_post_meta($p->ID, 'psp_technician', true);
            }
            
            // Resolution fields
            $record['issue_resolved'] = (bool) get_post_meta($p->ID, 'psp_issue_resolved', true);
            $record['followup_required'] = (bool) get_post_meta($p->ID, 'psp_followup_required', true);
            $record['followup_date'] = get_post_meta($p->ID, 'psp_followup_date', true);
            $record['related_ticket_id'] = intval(get_post_meta($p->ID, 'psp_related_ticket_id', true));
            
            $out[] = $record;
        }

        $total = $q->found_posts;
        $has_more = ($offset + $per_page) < $total;
        $total_pages = $per_page > 0 ? ceil($total / $per_page) : 1;
        
        return rest_ensure_response([
            'records' => $out,
            'total' => $total,
            'page' => $page,
            'per_page' => $per_page,
            'total_pages' => $total_pages,
            'has_more' => $has_more,
        ]);
    }

    public static function get_record(WP_REST_Request $req){
        $post_id = intval($req['id']);
        $p = get_post($post_id);
        
        if (!$p || $p->post_type !== 'psp_service_record') {
            return new WP_Error('not_found', 'Service record not found', ['status' => 404]);
        }
        
        $partner_id = intval(get_post_meta($post_id, 'psp_partner_id', true));
        $partner_name = '';
        if ($partner_id) {
            $partner_post = get_post($partner_id);
            $partner_name = $partner_post ? $partner_post->post_title : '';
        }
        
        $service_type = get_post_meta($post_id, 'psp_service_type', true);
        
        $record = [
            'id' => $post_id,
            'partner_id' => $partner_id,
            'partner_name' => $partner_name,
            'service_date' => get_post_meta($post_id, 'psp_service_date', true),
            'service_type' => $service_type,
            'notes' => apply_filters('the_content', $p->post_content),
            'created_by' => (int) $p->post_author,
            'created_at' => get_post_time('c', true, $p),
        ];
        
        // Add all possible fields
        $record['contact_method'] = get_post_meta($post_id, 'psp_contact_method', true);
        $record['duration_minutes'] = intval(get_post_meta($post_id, 'psp_duration_minutes', true));
        $record['onsite_type'] = get_post_meta($post_id, 'psp_onsite_type', true);
        $record['technician'] = get_post_meta($post_id, 'psp_technician', true);
        $record['issue_resolved'] = (bool) get_post_meta($post_id, 'psp_issue_resolved', true);
        $record['followup_required'] = (bool) get_post_meta($post_id, 'psp_followup_required', true);
        $record['followup_date'] = get_post_meta($post_id, 'psp_followup_date', true);
        $record['related_ticket_id'] = intval(get_post_meta($post_id, 'psp_related_ticket_id', true));
        
        return rest_ensure_response($record);
    }

    public static function create_record(WP_REST_Request $req){
        $service_type = sanitize_text_field($req['service_type']);
        $service_date = sanitize_text_field($req['service_date']);
        
        // Build title based on service type
        $type_labels = [
            'phone' => 'Phone Support',
            'email' => 'Email Support',
            'remote' => 'Remote Support',
            'onsite_maintenance' => 'On-site Maintenance',
            'onsite_installation' => 'On-site Installation',
            'onsite_repair' => 'On-site Repair',
            'onsite_inspection' => 'On-site Inspection',
        ];
        
        $title = ($type_labels[$service_type] ?? 'Service') . ': ' . $service_date;
        
        $post_id = wp_insert_post([
            'post_type' => 'psp_service_record',
            'post_title' => $title,
            'post_content' => wp_kses_post($req['notes'] ?? ''),
            'post_status' => 'publish',
            'post_author' => get_current_user_id(),
        ]);
        
        if (is_wp_error($post_id)) return $post_id;
        
        // Save core fields
        update_post_meta($post_id, 'psp_partner_id', intval($req['partner_id']));
        update_post_meta($post_id, 'psp_service_date', $service_date);
        update_post_meta($post_id, 'psp_service_type', $service_type);
        
        // Save support interaction fields
        if (isset($req['contact_method'])) {
            update_post_meta($post_id, 'psp_contact_method', sanitize_text_field($req['contact_method']));
        }
        if (isset($req['duration_minutes'])) {
            update_post_meta($post_id, 'psp_duration_minutes', intval($req['duration_minutes']));
        }
        
        // Save on-site service fields
        if (isset($req['onsite_type'])) {
            update_post_meta($post_id, 'psp_onsite_type', sanitize_text_field($req['onsite_type']));
        }
        if (isset($req['technician'])) {
            update_post_meta($post_id, 'psp_technician', sanitize_text_field($req['technician']));
        }
        
        // Save resolution fields
        if (isset($req['issue_resolved'])) {
            update_post_meta($post_id, 'psp_issue_resolved', (bool) $req['issue_resolved']);
        }
        if (isset($req['followup_required'])) {
            update_post_meta($post_id, 'psp_followup_required', (bool) $req['followup_required']);
        }
        if (isset($req['followup_date'])) {
            update_post_meta($post_id, 'psp_followup_date', sanitize_text_field($req['followup_date']));
        }
        if (isset($req['related_ticket_id'])) {
            update_post_meta($post_id, 'psp_related_ticket_id', intval($req['related_ticket_id']));
        }
        
        return rest_ensure_response([ 
            'id' => $post_id,
            'message' => 'Service record created successfully'
        ]);
    }
}
