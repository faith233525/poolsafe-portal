<?php
/**
 * Knowledge Base CPT & REST API
 */
if (!defined('ABSPATH')) { exit; }

class PSP_Knowledge_Base {
    public static function init() : void {
        add_action('init', [ __CLASS__, 'register_taxonomy' ]);
        add_action('rest_api_init', [ __CLASS__, 'register_routes' ]);
    }

    public static function register_cpt() : void {
        register_post_type('psp_kb_article', [
            'labels' => [
                'name' => __('Knowledge Base', 'psp'),
                'singular_name' => __('Article', 'psp'),
                'add_new' => __('Add Article', 'psp'),
                'add_new_item' => __('Add New Article', 'psp'),
                'edit_item' => __('Edit Article', 'psp'),
                'search_items' => __('Search Articles', 'psp'),
            ],
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => 'psp-admin',
            'supports' => ['title', 'editor', 'thumbnail', 'excerpt'],
            'show_in_rest' => true,
            'menu_icon' => 'dashicons-book',
            'has_archive' => false,
        ]);
    }

    public static function register_taxonomy() : void {
        register_taxonomy('psp_kb_category', 'psp_kb_article', [
            'labels' => [
                'name' => __('KB Categories', 'psp'),
                'singular_name' => __('Category', 'psp'),
            ],
            'hierarchical' => true,
            'show_ui' => true,
            'show_in_rest' => true,
            'show_admin_column' => true,
        ]);
    }

    public static function register_routes() : void {
        register_rest_route('poolsafe/v1', '/kb/articles', [
            'methods' => 'GET',
            'permission_callback' => function() { return is_user_logged_in(); },
            'callback' => [ __CLASS__, 'list_articles' ],
        ]);

        register_rest_route('poolsafe/v1', '/kb/articles/(?P<id>\\d+)', [
            'methods' => 'GET',
            'permission_callback' => function() { return is_user_logged_in(); },
            'callback' => [ __CLASS__, 'get_article' ],
        ]);

        register_rest_route('poolsafe/v1', '/kb/search', [
            'methods' => 'GET',
            'permission_callback' => function() { return is_user_logged_in(); },
            'args' => [
                'q' => [ 'required' => true, 'type' => 'string' ],
            ],
            'callback' => [ __CLASS__, 'search_articles' ],
        ]);
    }

    public static function list_articles($request) {
        $args = [
            'post_type' => 'psp_kb_article',
            'posts_per_page' => $request->get_param('per_page') ?: 20,
            'paged' => $request->get_param('page') ?: 1,
            'post_status' => 'publish',
            'orderby' => 'title',
            'order' => 'ASC',
        ];

        $category = $request->get_param('category');
        if ($category) {
            $args['tax_query'] = [
                [
                    'taxonomy' => 'psp_kb_category',
                    'field' => 'slug',
                    'terms' => $category,
                ],
            ];
        }

        $query = new WP_Query($args);
        $articles = [];

        foreach ($query->posts as $post) {
            $categories = wp_get_post_terms($post->ID, 'psp_kb_category', ['fields' => 'names']);
            $articles[] = [
                'id' => $post->ID,
                'title' => $post->post_title,
                'excerpt' => $post->post_excerpt,
                'content' => apply_filters('the_content', $post->post_content),
                'categories' => $categories,
                'thumbnail' => get_the_post_thumbnail_url($post->ID, 'medium'),
                'date' => $post->post_date,
            ];
        }

        return rest_ensure_response([
            'articles' => $articles,
            'total' => $query->found_posts,
            'pages' => $query->max_num_pages,
        ]);
    }

    public static function get_article($request) {
        $post = get_post($request['id']);
        
        if (!$post || $post->post_type !== 'psp_kb_article') {
            return new WP_Error('not_found', 'Article not found', ['status' => 404]);
        }

        $categories = wp_get_post_terms($post->ID, 'psp_kb_category', ['fields' => 'names']);

        return rest_ensure_response([
            'id' => $post->ID,
            'title' => $post->post_title,
            'content' => apply_filters('the_content', $post->post_content),
            'categories' => $categories,
            'thumbnail' => get_the_post_thumbnail_url($post->ID, 'large'),
            'date' => $post->post_date,
        ]);
    }

    public static function search_articles($request) {
        $query_string = sanitize_text_field($request['q']);

        $args = [
            'post_type' => 'psp_kb_article',
            'posts_per_page' => 10,
            'post_status' => 'publish',
            's' => $query_string,
        ];

        $query = new WP_Query($args);
        $results = [];

        foreach ($query->posts as $post) {
            $results[] = [
                'id' => $post->ID,
                'title' => $post->post_title,
                'excerpt' => $post->post_excerpt,
            ];
        }

        return rest_ensure_response($results);
    }
}
