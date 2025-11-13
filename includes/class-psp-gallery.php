<?php
/**
 * Partner Gallery - media attachments per partner
 */
if (!defined('ABSPATH')) { exit; }

class PSP_Gallery {
    public static function init() : void {
        add_action('rest_api_init', [ __CLASS__, 'register_routes' ]);
        
        // Admin meta box for gallery
        add_action('add_meta_boxes', [ __CLASS__, 'add_meta_box' ]);
        add_action('save_post_psp_partner', [ __CLASS__, 'save_meta_box' ], 10, 2);
    }

    public static function add_meta_box() : void {
        add_meta_box(
            'psp_partner_gallery',
            __('Partner Gallery', 'psp'),
            [ __CLASS__, 'render_meta_box' ],
            'psp_partner',
            'side',
            'default'
        );
    }

    public static function render_meta_box($post) : void {
        $gallery_ids = get_post_meta($post->ID, 'psp_gallery_ids', true);
        if (!is_array($gallery_ids)) $gallery_ids = [];
        
        wp_nonce_field('psp_gallery_meta', 'psp_gallery_nonce');
        ?>
        <p>
            <button type="button" class="button psp-gallery-upload" data-post-id="<?php echo esc_attr($post->ID); ?>">
                <?php esc_html_e('Add Images & Videos', 'psp'); ?>
            </button>
            <span class="description" style="display:block;margin-top:5px;">
                <?php esc_html_e('Supports: Images (JPG, PNG, GIF) and Videos (MP4, WebM, MOV)', 'psp'); ?>
            </span>
        </p>
        <div class="psp-gallery-preview" id="psp-gallery-preview">
            <?php foreach ($gallery_ids as $media_id): ?>
                <?php 
                $mime_type = get_post_mime_type($media_id);
                $is_video = strpos($mime_type, 'video') !== false;
                if ($is_video) {
                    $video_url = wp_get_attachment_url($media_id);
                    ?>
                    <div class="psp-gallery-item" data-id="<?php echo esc_attr($media_id); ?>">
                        <video src="<?php echo esc_url($video_url); ?>" style="max-width:100px;height:auto;" controls></video>
                        <span class="psp-media-type">🎥 Video</span>
                        <button type="button" class="button psp-gallery-remove" data-id="<?php echo esc_attr($media_id); ?>">×</button>
                    </div>
                    <?php
                } else {
                    $img = wp_get_attachment_image_src($media_id, 'thumbnail');
                    if ($img):
                    ?>
                    <div class="psp-gallery-item" data-id="<?php echo esc_attr($media_id); ?>">
                        <img src="<?php echo esc_url($img[0]); ?>" alt="" style="max-width:100px;height:auto;" />
                        <span class="psp-media-type">📷 Image</span>
                        <button type="button" class="button psp-gallery-remove" data-id="<?php echo esc_attr($media_id); ?>">×</button>
                    </div>
                    <?php endif;
                }
                ?>
            <?php endforeach; ?>
        </div>
        <input type="hidden" name="psp_gallery_ids" id="psp-gallery-ids" value="<?php echo esc_attr(implode(',', $gallery_ids)); ?>" />
        <script>
        jQuery(function($){
            var frame;
            $('.psp-gallery-upload').on('click', function(e){
                e.preventDefault();
                if (frame) { frame.open(); return; }
                frame = wp.media({
                    title: '<?php echo esc_js(__('Select Gallery Media (Images & Videos)', 'psp')); ?>',
                    button: { text: '<?php echo esc_js(__('Add to Gallery', 'psp')); ?>' },
                    library: { type: ['image', 'video'] },
                    multiple: true
                });
                frame.on('select', function(){
                    var selection = frame.state().get('selection');
                    var ids = $('#psp-gallery-ids').val().split(',').filter(Boolean);
                    selection.map(function(attachment){
                        attachment = attachment.toJSON();
                        ids.push(attachment.id);
                        var isVideo = attachment.type === 'video';
                        var mediaHtml = isVideo 
                            ? '<video src="'+attachment.url+'" style="max-width:100px;height:auto;" controls></video><span class="psp-media-type">🎥 Video</span>'
                            : '<img src="'+(attachment.sizes && attachment.sizes.thumbnail ? attachment.sizes.thumbnail.url : attachment.url)+'" style="max-width:100px;height:auto;" /><span class="psp-media-type">📷 Image</span>';
                        $('#psp-gallery-preview').append(
                            '<div class="psp-gallery-item" data-id="'+attachment.id+'">'+
                            mediaHtml+
                            '<button type="button" class="button psp-gallery-remove" data-id="'+attachment.id+'">×</button>'+
                            '</div>'
                        );
                    });
                    $('#psp-gallery-ids').val(ids.join(','));
                });
                frame.open();
            });

            $(document).on('click', '.psp-gallery-remove', function(e){
                e.preventDefault();
                var id = $(this).data('id');
                $(this).closest('.psp-gallery-item').remove();
                var ids = $('#psp-gallery-ids').val().split(',').filter(function(i){ return i != id; });
                $('#psp-gallery-ids').val(ids.join(','));
            });
        });
        </script>
        <style>
        .psp-gallery-preview { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
        .psp-gallery-item { position: relative; border: 2px solid #ddd; padding: 5px; border-radius: 4px; background: #f9f9f9; }
        .psp-gallery-item:hover { border-color: #0073aa; }
        .psp-media-type { display: block; text-align: center; font-size: 11px; margin-top: 5px; color: #666; }
        .psp-gallery-remove { position: absolute; top: 0; right: 0; background: #dc3232; color: white; border: none; cursor: pointer; font-size: 18px; line-height: 1; padding: 2px 6px; border-radius: 0 4px 0 0; }
        .psp-gallery-remove:hover { background: #a00; }
        </style>
        <?php
    }

    public static function save_meta_box($post_id, $post) : void {
        if (!isset($_POST['psp_gallery_nonce']) || !wp_verify_nonce($_POST['psp_gallery_nonce'], 'psp_gallery_meta')) return;
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
        if (!current_user_can('edit_psp_partner', $post_id)) return;

        if (isset($_POST['psp_gallery_ids'])) {
            $ids = array_filter(array_map('intval', explode(',', $_POST['psp_gallery_ids'])));
            update_post_meta($post_id, 'psp_gallery_ids', $ids);
        } else {
            delete_post_meta($post_id, 'psp_gallery_ids');
        }
    }

    public static function register_routes() : void {
        register_rest_route('poolsafe/v1', '/partners/(?P<id>\\d+)/gallery', [
            'methods' => 'GET',
            'permission_callback' => function() { return is_user_logged_in(); },
            'callback' => function($req){
                $partner_id = intval($req['id']);
                $gallery_ids = get_post_meta($partner_id, 'psp_gallery_ids', true);
                if (!is_array($gallery_ids)) $gallery_ids = [];
                
                $media = [];
                foreach ($gallery_ids as $media_id) {
                    $mime_type = get_post_mime_type($media_id);
                    $is_video = strpos($mime_type, 'video') !== false;
                    
                    if ($is_video) {
                        $url = wp_get_attachment_url($media_id);
                        $media[] = [
                            'id' => $media_id,
                            'type' => 'video',
                            'url' => $url,
                            'mime_type' => $mime_type,
                            'title' => get_the_title($media_id),
                        ];
                    } else {
                        $src = wp_get_attachment_image_src($media_id, 'large');
                        $thumb = wp_get_attachment_image_src($media_id, 'thumbnail');
                        if ($src) {
                            $media[] = [
                                'id' => $media_id,
                                'type' => 'image',
                                'url' => $src[0],
                                'thumbnail' => $thumb ? $thumb[0] : $src[0],
                                'alt' => get_post_meta($media_id, '_wp_attachment_image_alt', true),
                            ];
                        }
                    }
                }
                return rest_ensure_response($media);
            },
        ]);
    }
}
