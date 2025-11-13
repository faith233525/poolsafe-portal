<?php
/**
 * Admin CSV importer for Partners
 */
if (!defined('ABSPATH')) { exit; }

class PSP_Import {
    public static function register() : void {
        add_action('admin_post_psp_import_partners', [ __CLASS__, 'handle_import' ]);
    }

    public static function render_page() : void { ?>
        <div class="wrap">
            <h1><?php echo esc_html__('Import Partners (CSV)', 'psp'); ?></h1>
            <form method="post" enctype="multipart/form-data" action="<?php echo esc_url( admin_url('admin-post.php') ); ?>">
                <?php wp_nonce_field('psp_import_partners'); ?>
                <input type="hidden" name="action" value="psp_import_partners" />
                <p><input type="file" name="csv" accept=".csv" required /></p>
                <p><label><input type="checkbox" name="dry_run" value="1" /> <?php echo esc_html__('Dry run (preview only - no actual import)', 'psp'); ?></label></p>
                <p><button type="submit" class="button button-primary"><?php echo esc_html__('Import Partners', 'psp'); ?></button></p>
            </form>
            <hr />
            <h2><?php echo esc_html__('CSV Format Requirements', 'psp'); ?></h2>
            <p><strong><?php echo esc_html__('Required columns:', 'psp'); ?></strong> company_name</p>
            <p><strong><?php echo esc_html__('Optional columns:', 'psp'); ?></strong> user_login, user_pass, number, display_name, top_colour, management_company, units, street_address, city, state, zip, country, lock, master_code, sub_master_code, lock_part, key</p>
            <p><strong><?php echo esc_html__('Example CSV:', 'psp'); ?></strong></p>
            <pre style="background: #f5f5f5; padding: 10px; border: 1px solid #ddd;">company_name,street_address,city,state,zip,units,top_colour
Sheraton Resort,123 Beach Blvd,Miami,FL,33139,15,Blue
Westin Hotel,456 Ocean Ave,San Diego,CA,92101,20,Red</pre>
            <?php if (isset($_GET['psp_msg'])): ?>
                <div class="notice notice-success"><p><?php echo esc_html(rawurldecode($_GET['psp_msg'])); ?></p></div>
            <?php endif; ?>
        </div>
    <?php }

    public static function handle_import() : void {
        if (!current_user_can('manage_options')) wp_die(__('Permission denied', 'psp'));
        check_admin_referer('psp_import_partners');
        if (empty($_FILES['csv']['tmp_name'])) wp_die(__('No file', 'psp'));
        $dry = !empty($_POST['dry_run']);

        $fh = fopen($_FILES['csv']['tmp_name'], 'r');
        if (!$fh) wp_die(__('Failed to open file', 'psp'));
        $header = fgetcsv($fh);
        if (!is_array($header)) wp_die(__('Invalid CSV header', 'psp'));
        $map = array_change_key_case(array_flip($header), CASE_LOWER);
        $rows = 0; $created = 0; $updated = 0;
        while (($row = fgetcsv($fh)) !== false) {
            $rows++;
            $data = function($key) use ($map, $row){ 
                $k = strtolower($key); 
                return isset($map[$k]) ? trim($row[$map[$k]]) : ''; 
            };
            
            // company_name is required
            $company = $data('company_name');
            if ($company === '') continue;

            $existing = get_page_by_title($company, OBJECT, 'psp_partner');
            $postarr = [
                'post_type' => 'psp_partner',
                'post_title' => $company,
                'post_status' => 'publish',
            ];
            $pid = $existing ? $existing->ID : 0;
            if (!$dry) {
                if ($pid) {
                    $postarr['ID'] = $pid; wp_update_post($postarr); $updated++;
                } else {
                    $pid = wp_insert_post($postarr); $created++;
                }
                if (!is_wp_error($pid)) {
                    // Basic info
                    update_post_meta($pid, 'psp_management_company', sanitize_text_field($data('management_company')));
                    update_post_meta($pid, 'psp_street_address', sanitize_text_field($data('street_address')));
                    update_post_meta($pid, 'psp_city', sanitize_text_field($data('city')));
                    update_post_meta($pid, 'psp_state', sanitize_text_field($data('state')));
                    update_post_meta($pid, 'psp_zip', sanitize_text_field($data('zip')));
                    update_post_meta($pid, 'psp_country', sanitize_text_field($data('country')));
                    
                    // Units (changed from numberOfLoungeUnits)
                    if ($data('units')) {
                        update_post_meta($pid, 'psp_units', intval($data('units')));
                        // Also update the old field name for compatibility
                        update_post_meta($pid, 'psp_number_of_lounge_units', intval($data('units')));
                    }
                    
                    // Visual
                    update_post_meta($pid, 'psp_top_colour', sanitize_text_field($data('top_colour')));
                    
                    // Lock information (secure fields)
                    update_post_meta($pid, 'psp_lock_make', sanitize_text_field($data('lock')));
                    update_post_meta($pid, 'psp_master_code', sanitize_text_field($data('master_code')));
                    update_post_meta($pid, 'psp_sub_master_code', sanitize_text_field($data('sub_master_code')));
                    update_post_meta($pid, 'psp_lock_part', sanitize_text_field($data('lock_part')));
                    update_post_meta($pid, 'psp_key', sanitize_text_field($data('key')));
                    
                    // Contact (optional)
                    if ($data('number')) {
                        update_post_meta($pid, 'psp_phone_number', sanitize_text_field($data('number')));
                    }
                }
            }
        }
        fclose($fh);
        $msg = sprintf('Rows=%d Created=%d Updated=%d DryRun=%s', $rows, $created, $updated, $dry ? 'yes' : 'no');
        wp_redirect( add_query_arg([ 'page' => 'psp-import', 'psp_msg' => rawurlencode($msg) ], admin_url('admin.php')) );
        exit;
    }
}
