<?php
/**
 * Deactivation tasks
 */
if (!defined('ABSPATH')) { exit; }

class PSP_Deactivator {
    public static function deactivate() : void {
        flush_rewrite_rules();
    }
}
