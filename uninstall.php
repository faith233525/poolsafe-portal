<?php
// On uninstall you may remove plugin options or transient data.
if (!defined('WP_UNINSTALL_PLUGIN')) { exit; }

// Remove plugin options
delete_option('psp_settings');
delete_option('psp_email_settings');
delete_option('psp_hubspot_settings');
