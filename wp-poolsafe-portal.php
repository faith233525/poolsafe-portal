<?php
/**
 * Plugin Name:       Pool Safe Portal (PSP)
 * Plugin URI:        https://poolsafeinc.com
 * Description:       Pool Safe Portal for partners and support with tickets, partner data, map integration, and contact management.
 * Version:           1.3.1
 * Author:            Pool Safe Inc.
 * Author URI:        https://poolsafeinc.com
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       psp
 * Domain Path:       /languages
 * Requires at least: 6.0
 * Requires PHP:      7.4
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

// Constants
if (!defined('PSP_VERSION')) {
    define('PSP_VERSION', '1.3.1');
}
if (!defined('PSP_PLUGIN_FILE')) {
    define('PSP_PLUGIN_FILE', __FILE__);
}
if (!defined('PSP_PLUGIN_DIR')) {
    define('PSP_PLUGIN_DIR', plugin_dir_path(__FILE__));
}
if (!defined('PSP_PLUGIN_URL')) {
    define('PSP_PLUGIN_URL', plugin_dir_url(__FILE__));
}

// Includes
require_once PSP_PLUGIN_DIR . 'includes/class-psp-activator.php';
require_once PSP_PLUGIN_DIR . 'includes/class-psp-deactivator.php';
require_once PSP_PLUGIN_DIR . 'includes/class-psp-plugin.php';

register_activation_hook(__FILE__, ['PSP_Activator', 'activate']);
register_deactivation_hook(__FILE__, ['PSP_Deactivator', 'deactivate']);

function psp_run() : void {
    $plugin = new PSP_Plugin();
    $plugin->run();
}

psp_run();
