<?php
/**
 * Bulk User Import - Import users from CSV and auto-match to partners
 */
if (!defined('ABSPATH')) { exit; }

class PSP_Bulk_Import {
    
    public static function init() : void {
        add_action('admin_menu', [ __CLASS__, 'add_menu_page' ]);
        add_action('admin_post_psp_bulk_import_users', [ __CLASS__, 'handle_bulk_import' ]);
    }
    
    public static function add_menu_page() : void {
        add_submenu_page(
            'psp-admin',
            __('Bulk User Import', 'psp'),
            __('Bulk Import Users', 'psp'),
            'manage_options',
            'psp-bulk-import',
            [ __CLASS__, 'render_page' ]
        );
    }
    
    public static function render_page() : void {
        ?>
        <div class="wrap">
            <h1><?php echo esc_html__('Bulk User Import', 'psp'); ?></h1>
            <p class="description">
                <?php echo esc_html__('Import multiple user accounts from a CSV file. Users will be automatically matched to existing partners by email or company name.', 'psp'); ?>
            </p>
            
            <div class="card" style="max-width: 800px; margin-top: 20px;">
                <h2><?php echo esc_html__('CSV Format Requirements', 'psp'); ?></h2>
                <p><?php echo esc_html__('Your CSV file must include the following columns (header row required):', 'psp'); ?></p>
                <ul style="list-style: disc; margin-left: 20px;">
                    <li><strong>email</strong> - User email address (required, will be used as username)</li>
                    <li><strong>first_name</strong> - User first name (optional)</li>
                    <li><strong>last_name</strong> - User last name (optional)</li>
                    <li><strong>company_name</strong> - Partner company name for matching (optional)</li>
                    <li><strong>role</strong> - User role: psp_partner, psp_support, or administrator (default: psp_partner)</li>
                    <li><strong>send_email</strong> - Send welcome email? yes/no (default: yes)</li>
                </ul>
                
                <h3><?php echo esc_html__('Example CSV:', 'psp'); ?></h3>
                <pre style="background: #f0f0f0; padding: 15px; overflow-x: auto;">email,first_name,last_name,company_name,role,send_email
john@resort.com,John,Doe,Sunset Resort,psp_partner,yes
jane@hotel.com,Jane,Smith,Beachside Hotel,psp_partner,yes
support@company.com,Mike,Johnson,,psp_support,no</pre>
            </div>
            
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" enctype="multipart/form-data" style="margin-top: 30px;">
                <?php wp_nonce_field('psp_bulk_import_users', 'psp_bulk_import_nonce'); ?>
                <input type="hidden" name="action" value="psp_bulk_import_users" />
                
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="psp_user_csv"><?php echo esc_html__('CSV File', 'psp'); ?></label>
                        </th>
                        <td>
                            <input type="file" name="psp_user_csv" id="psp_user_csv" accept=".csv" required />
                            <p class="description"><?php echo esc_html__('Select a CSV file to upload.', 'psp'); ?></p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="psp_update_existing"><?php echo esc_html__('Update Existing Users', 'psp'); ?></label>
                        </th>
                        <td>
                            <label>
                                <input type="checkbox" name="psp_update_existing" id="psp_update_existing" value="1" />
                                <?php echo esc_html__('Update existing users if email already exists', 'psp'); ?>
                            </label>
                            <p class="description"><?php echo esc_html__('If checked, existing users will be updated with new data. Otherwise, they will be skipped.', 'psp'); ?></p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="psp_auto_match"><?php echo esc_html__('Auto-Match Partners', 'psp'); ?></label>
                        </th>
                        <td>
                            <label>
                                <input type="checkbox" name="psp_auto_match" id="psp_auto_match" value="1" checked />
                                <?php echo esc_html__('Automatically link users to partner accounts by email or company name', 'psp'); ?>
                            </label>
                            <p class="description"><?php echo esc_html__('Recommended: Matches users to partners so they can access their partner data.', 'psp'); ?></p>
                        </td>
                    </tr>
                </table>
                
                <?php submit_button(__('Import Users', 'psp'), 'primary large'); ?>
            </form>
        </div>
        <?php
    }
    
    public static function handle_bulk_import() : void {
        if (!current_user_can('manage_options')) {
            wp_die(__('Unauthorized access', 'psp'));
        }
        
        if (!isset($_POST['psp_bulk_import_nonce']) || !wp_verify_nonce($_POST['psp_bulk_import_nonce'], 'psp_bulk_import_users')) {
            wp_die(__('Invalid nonce', 'psp'));
        }
        
        if (empty($_FILES['psp_user_csv']['tmp_name'])) {
            wp_redirect(add_query_arg(['page' => 'psp-bulk-import', 'error' => 'no_file'], admin_url('admin.php')));
            exit;
        }
        
        $update_existing = isset($_POST['psp_update_existing']);
        $auto_match = isset($_POST['psp_auto_match']);
        
        $file = $_FILES['psp_user_csv']['tmp_name'];
        $results = self::import_users_from_csv($file, $update_existing, $auto_match);
        
        // Redirect with results
        $redirect_args = [
            'page' => 'psp-bulk-import',
            'imported' => $results['imported'],
            'updated' => $results['updated'],
            'skipped' => $results['skipped'],
            'errors' => $results['errors']
        ];
        
        wp_redirect(add_query_arg($redirect_args, admin_url('admin.php')));
        exit;
    }
    
    public static function import_users_from_csv($file, $update_existing = false, $auto_match = true) : array {
        $results = [
            'imported' => 0,
            'updated' => 0,
            'skipped' => 0,
            'errors' => 0,
            'details' => []
        ];
        
        if (!file_exists($file)) {
            $results['errors']++;
            return $results;
        }
        
        $csv = array_map('str_getcsv', file($file));
        if (empty($csv)) {
            $results['errors']++;
            return $results;
        }
        
        $headers = array_map('trim', array_map('strtolower', $csv[0]));
        unset($csv[0]); // Remove header row
        
        // Find column indexes
        $email_idx = array_search('email', $headers);
        $fname_idx = array_search('first_name', $headers);
        $lname_idx = array_search('last_name', $headers);
        $company_idx = array_search('company_name', $headers);
        $role_idx = array_search('role', $headers);
        $send_email_idx = array_search('send_email', $headers);
        
        if ($email_idx === false) {
            $results['errors']++;
            $results['details'][] = 'CSV must have an "email" column';
            return $results;
        }
        
        foreach ($csv as $row) {
            $email = isset($row[$email_idx]) ? sanitize_email(trim($row[$email_idx])) : '';
            
            if (empty($email) || !is_email($email)) {
                $results['skipped']++;
                $results['details'][] = "Skipped invalid email: $email";
                continue;
            }
            
            $first_name = isset($row[$fname_idx]) ? sanitize_text_field(trim($row[$fname_idx])) : '';
            $last_name = isset($row[$lname_idx]) ? sanitize_text_field(trim($row[$lname_idx])) : '';
            $company_name = isset($row[$company_idx]) ? sanitize_text_field(trim($row[$company_idx])) : '';
            $role = isset($row[$role_idx]) ? sanitize_text_field(trim($row[$role_idx])) : 'psp_partner';
            $send_email = isset($row[$send_email_idx]) ? strtolower(trim($row[$send_email_idx])) === 'yes' : true;
            
            // Validate role
            if (!in_array($role, ['psp_partner', 'psp_support', 'administrator'])) {
                $role = 'psp_partner';
            }
            
            // Check if user exists
            $existing_user = get_user_by('email', $email);
            
            if ($existing_user) {
                if ($update_existing) {
                    // Update existing user
                    $user_id = $existing_user->ID;
                    wp_update_user([
                        'ID' => $user_id,
                        'first_name' => $first_name,
                        'last_name' => $last_name,
                        'role' => $role
                    ]);
                    $results['updated']++;
                    $results['details'][] = "Updated: $email";
                } else {
                    $results['skipped']++;
                    $results['details'][] = "Skipped existing: $email";
                    continue;
                }
            } else {
                // Create new user
                $username = sanitize_user(current(explode('@', $email)));
                $password = wp_generate_password(12, true, true);
                
                $user_id = wp_create_user($username, $password, $email);
                
                if (is_wp_error($user_id)) {
                    // Try with a modified username
                    $username = sanitize_user($email);
                    $user_id = wp_create_user($username, $password, $email);
                    
                    if (is_wp_error($user_id)) {
                        $results['errors']++;
                        $results['details'][] = "Error creating: $email - " . $user_id->get_error_message();
                        continue;
                    }
                }
                
                wp_update_user([
                    'ID' => $user_id,
                    'first_name' => $first_name,
                    'last_name' => $last_name,
                    'role' => $role
                ]);
                
                $results['imported']++;
                $results['details'][] = "Created: $email";
                
                // Send welcome email
                if ($send_email) {
                    wp_new_user_notification($user_id, null, 'both');
                }
            }
            
            // Auto-match to partner
            if ($auto_match && $user_id && $role === 'psp_partner') {
                $partner_id = self::find_partner_match($email, $company_name);
                if ($partner_id) {
                    update_user_meta($user_id, 'psp_partner_id', $partner_id);
                    update_post_meta($partner_id, 'psp_user_id', $user_id);
                    $results['details'][] = "  → Matched to partner: " . get_the_title($partner_id);
                    
                    // Log activity
                    if (class_exists('PSP_Admin')) {
                        PSP_Admin::log_activity($partner_id, 'user_linked', [
                            'user_id' => $user_id,
                            'email' => $email,
                            'via' => 'bulk_import'
                        ]);
                    }
                }
            }
        }
        
        return $results;
    }
    
    private static function find_partner_match($email, $company_name = '') : ?int {
        // Try to find partner by email
        $partners = get_posts([
            'post_type' => 'psp_partner',
            'posts_per_page' => 1,
            'meta_query' => [
                [
                    'key' => 'psp_company_email',
                    'value' => $email,
                    'compare' => '='
                ]
            ]
        ]);
        
        if (!empty($partners)) {
            return $partners[0]->ID;
        }
        
        // Try to find partner by company name
        if (!empty($company_name)) {
            $partners = get_posts([
                'post_type' => 'psp_partner',
                'posts_per_page' => 1,
                'meta_query' => [
                    [
                        'key' => 'psp_company_name',
                        'value' => $company_name,
                        'compare' => '='
                    ]
                ]
            ]);
            
            if (!empty($partners)) {
                return $partners[0]->ID;
            }
        }
        
        return null;
    }
}
