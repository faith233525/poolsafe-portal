<?php
/**
 * Canned Responses - Pre-written templates for common ticket replies
 */
if (!defined('ABSPATH')) { exit; }

class PSP_Canned_Responses {
    public static function register_cpt() : void {
        register_post_type('psp_canned_response', [
            'labels' => [
                'name' => __('Canned Responses', 'psp'),
                'singular_name' => __('Canned Response', 'psp'),
                'add_new' => __('Add Canned Response', 'psp'),
                'add_new_item' => __('Add New Canned Response', 'psp'),
                'edit_item' => __('Edit Canned Response', 'psp'),
                'view_item' => __('View Canned Response', 'psp'),
                'all_items' => __('Canned Responses', 'psp'),
            ],
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => 'psp-admin',
            'supports' => ['title', 'editor'],
            'show_in_rest' => false,
            'menu_icon' => 'dashicons-format-quote',
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

        // Category meta (optional grouping)
        register_post_meta('psp_canned_response', 'psp_category', [
            'type' => 'string',
            'single' => true,
            'show_in_rest' => false
        ]);
    }

    public static function register_routes() : void {
        register_rest_route('poolsafe/v1', '/canned-responses', [
            'methods' => 'GET',
            'permission_callback' => function() {
                return current_user_can('edit_psp_tickets') || current_user_can('administrator');
            },
            'callback' => [ __CLASS__, 'list_responses' ],
        ]);
    }

    public static function list_responses(WP_REST_Request $req) {
        $args = [
            'post_type' => 'psp_canned_response',
            'posts_per_page' => -1,
            'orderby' => 'title',
            'order' => 'ASC',
            'post_status' => 'publish'
        ];

        $posts = get_posts($args);
        $responses = [];

        foreach ($posts as $post) {
            $responses[] = [
                'id' => $post->ID,
                'title' => $post->post_title,
                'content' => $post->post_content,
                'category' => get_post_meta($post->ID, 'psp_category', true)
            ];
        }

        return rest_ensure_response($responses);
    }

    /**
     * Replace template variables with actual values
     */
    public static function replace_variables($content, $ticket_id = 0) {
        if ($ticket_id) {
            $ticket = get_post($ticket_id);
            $partner_id = get_post_meta($ticket_id, 'psp_partner_id', true);
            $partner = $partner_id ? get_post($partner_id) : null;
            
            $replacements = [
                '{ticket_id}' => $ticket_id,
                '{ticket_title}' => $ticket ? $ticket->post_title : '',
                '{partner_name}' => $partner ? get_the_title($partner) : '',
                '{contact_name}' => get_post_meta($ticket_id, 'psp_first_name', true) . ' ' . get_post_meta($ticket_id, 'psp_last_name', true),
                '{contact_email}' => get_post_meta($ticket_id, 'psp_contact_email', true),
                '{status}' => get_post_meta($ticket_id, 'psp_status', true),
                '{priority}' => get_post_meta($ticket_id, 'psp_priority', true),
                '{date}' => current_time('F j, Y'),
                '{time}' => current_time('g:i a'),
            ];

            foreach ($replacements as $var => $value) {
                $content = str_replace($var, $value, $content);
            }
        }

        return $content;
    }

    /**
     * Add meta box for ticket comment screen
     */
    public static function add_comment_meta_box() : void {
        add_meta_box(
            'psp_canned_responses_box',
            'Insert Canned Response',
            [ __CLASS__, 'render_canned_responses_box' ],
            'psp_ticket',
            'side',
            'default'
        );
    }

    public static function render_canned_responses_box($post) : void {
        $responses = get_posts([
            'post_type' => 'psp_canned_response',
            'posts_per_page' => -1,
            'orderby' => 'title',
            'order' => 'ASC',
            'post_status' => 'publish'
        ]);
        ?>
        <div class="psp-canned-responses-widget">
            <select id="psp-select-canned-response" style="width:100%;margin-bottom:10px;">
                <option value="">-- Select Template --</option>
                <?php foreach ($responses as $response) : 
                    $category = get_post_meta($response->ID, 'psp_category', true);
                ?>
                    <option value="<?php echo esc_attr($response->ID); ?>" data-content="<?php echo esc_attr($response->post_content); ?>">
                        <?php echo esc_html($response->post_title); ?>
                        <?php if ($category) echo ' [' . esc_html($category) . ']'; ?>
                    </option>
                <?php endforeach; ?>
            </select>
            <button type="button" id="psp-insert-canned-response" class="button button-secondary" style="width:100%;">
                Insert into Comment
            </button>
            <p class="description" style="margin-top:8px;">
                Available variables: {ticket_id}, {ticket_title}, {partner_name}, {contact_name}, {contact_email}, {status}, {priority}, {date}, {time}
            </p>
        </div>

        <script>
        (function() {
            const selectEl = document.getElementById('psp-select-canned-response');
            const insertBtn = document.getElementById('psp-insert-canned-response');
            const ticketId = <?php echo (int) $post->ID; ?>;

            if (insertBtn && selectEl) {
                insertBtn.addEventListener('click', function() {
                    const selected = selectEl.options[selectEl.selectedIndex];
                    if (!selected || !selected.value) {
                        alert('Please select a template first.');
                        return;
                    }

                    let content = selected.dataset.content || '';
                    
                    // Replace variables (basic client-side replacement)
                    // For full replacement, would need to fetch ticket data via REST API
                    content = content.replace('{ticket_id}', ticketId);
                    content = content.replace('{date}', new Date().toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'}));
                    content = content.replace('{time}', new Date().toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'}));

                    // Try to insert into the comment field
                    const commentField = document.getElementById('content');
                    if (commentField) {
                        // If TinyMCE is active
                        if (typeof tinymce !== 'undefined') {
                            const editor = tinymce.get('content');
                            if (editor) {
                                editor.setContent(editor.getContent() + '\n\n' + content);
                            } else {
                                commentField.value += '\n\n' + content;
                            }
                        } else {
                            commentField.value += '\n\n' + content;
                        }
                        
                        // Show success message
                        selectEl.selectedIndex = 0;
                        insertBtn.textContent = '✓ Inserted!';
                        insertBtn.style.background = '#4caf50';
                        insertBtn.style.color = '#fff';
                        
                        setTimeout(function() {
                            insertBtn.textContent = 'Insert into Comment';
                            insertBtn.style.background = '';
                            insertBtn.style.color = '';
                        }, 2000);
                    } else {
                        alert('Comment field not found. Please add this from the Comments section below.');
                    }
                });
            }
        })();
        </script>
        <?php
    }
}
