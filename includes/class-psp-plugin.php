<?php
/**
 * Bootstrap and orchestrate plugin components
 */
if (!defined('ABSPATH')) { exit; }

require_once __DIR__ . '/class-psp-roles.php';
require_once __DIR__ . '/class-psp-tickets.php';
require_once __DIR__ . '/class-psp-partners.php';
require_once __DIR__ . '/class-psp-rest.php';
require_once __DIR__ . '/class-psp-frontend.php';
require_once __DIR__ . '/class-psp-admin.php';
require_once __DIR__ . '/class-psp-settings.php';
require_once __DIR__ . '/class-psp-attachments.php';
require_once __DIR__ . '/class-psp-notifications.php';
require_once __DIR__ . '/class-psp-import.php';
require_once __DIR__ . '/class-psp-service-records.php';
require_once __DIR__ . '/class-psp-email.php';
require_once __DIR__ . '/class-psp-hubspot.php';
require_once __DIR__ . '/class-psp-calendar.php';
require_once __DIR__ . '/class-psp-gallery.php';
require_once __DIR__ . '/class-psp-blocks.php';
require_once __DIR__ . '/class-psp-knowledge-base.php';
require_once __DIR__ . '/class-psp-bulk-import.php';
require_once __DIR__ . '/class-psp-canned-responses.php';
require_once __DIR__ . '/class-psp-access-control.php';
require_once __DIR__ . '/class-psp-menu-filter.php';
require_once __DIR__ . '/class-psp-company-users.php';
require_once __DIR__ . '/class-psp-email-to-ticket.php';
require_once __DIR__ . '/class-psp-email-response-tracker.php';
require_once __DIR__ . '/class-psp-setup-wizard.php';
require_once __DIR__ . '/class-psp-auto-config.php';
require_once __DIR__ . '/class-psp-azure-ad.php';

class PSP_Plugin {
    public function run() : void {
        // i18n
        add_action('plugins_loaded', function(){
            load_plugin_textdomain('psp', false, dirname(plugin_basename(PSP_PLUGIN_FILE)) . '/languages');
        });
        add_action('init', [ 'PSP_Roles', 'register_caps' ]);
        add_action('init', [ 'PSP_Tickets', 'register_cpt' ]);
        add_action('init', [ 'PSP_Partners', 'register_cpt' ]);
        add_action('init', [ 'PSP_Notifications', 'register_cpt' ]);
        add_action('init', [ 'PSP_Service_Records', 'register_cpt' ]);
        add_action('init', [ 'PSP_Calendar', 'register_cpt' ]);
        add_action('init', [ 'PSP_Knowledge_Base', 'register_cpt' ]);
        add_action('init', [ 'PSP_Canned_Responses', 'register_cpt' ]);

        add_action('rest_api_init', [ 'PSP_REST', 'register_routes' ]);
        add_action('rest_api_init', [ 'PSP_Attachments', 'register_routes' ]);
        add_action('rest_api_init', [ 'PSP_Notifications', 'register_routes' ]);
        add_action('rest_api_init', [ 'PSP_Service_Records', 'register_routes' ]);
        add_action('rest_api_init', [ 'PSP_Calendar', 'register_routes' ]);
        add_action('rest_api_init', [ 'PSP_Knowledge_Base', 'register_routes' ]);
        add_action('rest_api_init', [ 'PSP_Canned_Responses', 'register_routes' ]);

        add_action('init', [ 'PSP_Frontend', 'register_shortcodes' ]);
        add_action('add_meta_boxes_psp_ticket', [ 'PSP_Canned_Responses', 'add_comment_meta_box' ]);

        add_action('admin_menu', [ 'PSP_Admin', 'register_menus' ]);
        add_action('admin_init', [ 'PSP_Settings', 'register' ]);
        add_action('admin_init', [ 'PSP_Import', 'register' ]);
        
        // Partner admin UI (meta boxes, user creation, CSV import)
        PSP_Admin::init();
        
        // Ticket hooks (email notifications on create/update)
        PSP_Tickets::init();
        
        // Email & integrations
        PSP_Email::init();
        PSP_Email_To_Ticket::init();
        PSP_Email_Response_Tracker::init();
        PSP_HubSpot::init();
        PSP_Gallery::init();
        PSP_Blocks::init();
        PSP_Knowledge_Base::init();
        PSP_Bulk_Import::init();
        PSP_Access_Control::init();
        PSP_Menu_Filter::init();
        PSP_Company_Users::init();
        PSP_Setup_Wizard::init();
    }
}
