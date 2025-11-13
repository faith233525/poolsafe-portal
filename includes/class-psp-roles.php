<?php
/**
 * Roles & Capabilities
 */
if (!defined('ABSPATH')) { exit; }

class PSP_Roles {
    const ROLE_PARTNER = 'psp_partner';
    const ROLE_SUPPORT = 'psp_support';

    public static function register_roles() : void {
        add_role(self::ROLE_PARTNER, __('PSP Partner', 'psp'), [
            'read' => true,
        ]);
        add_role(self::ROLE_SUPPORT, __('PSP Support', 'psp'), [
            'read' => true,
            'edit_posts' => true,
            'upload_files' => true,
        ]);

        // Ensure administrators always have full capabilities
        $admin = get_role('administrator');
        if ($admin) {
            foreach (self::caps_list() as $cap) {
                $admin->add_cap($cap);
            }
        }
    }

    public static function register_caps() : void {
        $support = get_role(self::ROLE_SUPPORT);
        if ($support) {
            foreach (self::caps_list() as $cap) {
                $support->add_cap($cap);
            }
        }
        // Partners get minimal caps; specific endpoints enforce access.
    }

    public static function caps_list() : array {
        return [
            // Tickets CPT caps
            'read_psp_ticket',
            'read_private_psp_tickets',
            'edit_psp_ticket',
            'edit_psp_tickets',
            'edit_others_psp_tickets',
            'publish_psp_tickets',
            'delete_psp_ticket',
            'delete_psp_tickets',
            'delete_others_psp_tickets',
            // Partners CPT caps
            'read_psp_partner',
            'read_private_psp_partners',
            'edit_psp_partner',
            'edit_psp_partners',
            'edit_others_psp_partners',
            'publish_psp_partners',
            'delete_psp_partner',
            'delete_psp_partners',
            'delete_others_psp_partners',
            // Calendar CPT caps
            'read_psp_calendar_event',
            'read_private_psp_calendar_events',
            'edit_psp_calendar_event',
            'edit_psp_calendar_events',
            'edit_others_psp_calendar_events',
            'publish_psp_calendar_events',
            'delete_psp_calendar_event',
            'delete_psp_calendar_events',
        ];
    }
}
