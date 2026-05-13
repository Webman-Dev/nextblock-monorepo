<?php
/**
 * Plugin Name: NextBlock Migration Exporter
 * Description: High-performance extraction engine for migrating massive multi-language architectures, WooCommerce products, and complex content to NextBlock CMS.
 * Version: 1.0.0
 * Author: NextBlock Architecture Team
 * Text Domain: nextblock-exporter
 */

declare(strict_types=1);

namespace NextBlock\Migration;

if (!defined('ABSPATH')) {
    exit; // Prevent direct access to executable code
}

define('NME_VERSION', '1.0.0');
define('NME_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('NME_PLUGIN_URL', plugin_dir_url(__FILE__));

// Autoloader for the /includes/ directory classes
spl_autoload_register(function (string $class) {
    $prefix = 'NextBlock\\Migration\\';
    if (strncmp($prefix, $class, strlen($prefix)) !== 0) {
        return;
    }
    $relative_class = substr($class, strlen($prefix));
    $mapped_class = strtolower(str_replace(['\\', '_'], ['-', '-'], $relative_class));
    $file_name = 'class-nme-' . $mapped_class . '.php';
    $file = NME_PLUGIN_DIR . 'includes/' . $file_name;
    if (file_exists($file)) {
        require_once $file;
    }
});

/**
 * Main Bootstrap initialization class.
 */
class Bootstrap {
    public static function init(): void {
        // Instantiate core architectural components
        $settings = new Settings();
        $settings->hooks();

        $ajax = new Ajax_Handler();
        $ajax->hooks();
    }
}

// Bootstrap the plugin immediately on plugins_loaded
add_action('plugins_loaded', ['NextBlock\Migration\Bootstrap', 'init']);
