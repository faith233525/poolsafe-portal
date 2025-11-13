<?php
/**
 * Activation tasks
 */
if (!defined('ABSPATH')) { exit; }

class PSP_Activator {
    public static function activate() : void {
        // Ensure roles and capabilities are present on activation
        require_once __DIR__ . '/class-psp-roles.php';
        PSP_Roles::register_roles();
        PSP_Roles::register_caps();

        // Register CPTs to flush rewrite rules properly
        require_once __DIR__ . '/class-psp-tickets.php';
        require_once __DIR__ . '/class-psp-partners.php';
        PSP_Tickets::register_cpt();
        PSP_Partners::register_cpt();

        // Create activity log table
        require_once __DIR__ . '/class-psp-admin.php';
        PSP_Admin::create_activity_log_table();

        // Create email-to-ticket pending table
        require_once __DIR__ . '/class-psp-email-to-ticket.php';
        PSP_Email_To_Ticket::maybe_create_pending_table();
        
        // Set activation redirect flag for setup wizard
        set_transient('psp_activation_redirect', true, 30);

        flush_rewrite_rules();
    }
}
