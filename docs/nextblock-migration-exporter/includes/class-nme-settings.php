<?php
declare(strict_types=1);

namespace NextBlock\Migration;

if (!defined('ABSPATH')) exit;

class Settings {
    public function hooks(): void {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
    }

    public function add_admin_menu(): void {
        add_menu_page(
            'NextBlock Export',
            'NextBlock Export',
            'manage_options',
            'nextblock-migration-exporter',
            [$this, 'render_ui'],
            'dashicons-cloud-upload', // Cool dashboard icon
            3 // Puts it near the top of the menu, under Dashboard
        );
    }

    public function enqueue_assets(string $hook): void {
        if (strpos($hook, 'nextblock-migration-exporter') === false) return;

        wp_enqueue_style('nme-admin-css', NME_PLUGIN_URL . 'assets/admin.css', [], NME_VERSION);
        wp_enqueue_script('nme-admin-js', NME_PLUGIN_URL . 'assets/admin.js', ['jquery'], NME_VERSION, true);
        
        // Expose configuration variables to the client-side JavaScript environment
        wp_localize_script('nme-admin-js', 'nmeConfig', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce'    => wp_create_nonce('nme_export_nonce'),
        ]);
    }

    public function render_ui(): void {
        // Retrieve historically saved Supabase endpoint credentials
        $supabase_url = get_option('nme_supabase_url', '');
        $supabase_key = get_option('nme_supabase_key', '');
        ?>

        <div class="wrap nme-wrap">
            <h1>NextBlock Migration Exporter</h1>
            <p>Configure endpoint connectivity and selectively extract complex architectures to your NextBlock / Supabase environment.</p>

            <div style="display: flex; gap: 20px; align-items: flex-start; margin-top: 20px;">
                <!-- Main Configuration Panel -->
                <div style="flex: 1;">
                    <div class="nme-card">
                        <h3>Destination API Configuration</h3>
                        <table class="form-table">
                            <tr>
                                <th scope="row"><label for="nme_supabase_url">Supabase REST / Edge URL</label></th>
                                <td><input type="url" id="nme_supabase_url" class="regular-text" value="<?php echo esc_attr($supabase_url); ?>" placeholder="https://xyz.supabase.co/rest/v1/content_items"></td>
                            </tr>
                            <tr>
                                <th scope="row"><label for="nme_supabase_key">Supabase Service Role Key</label></th>
                                <td><input type="password" id="nme_supabase_key" class="regular-text" value="<?php echo esc_attr($supabase_key); ?>"></td>
                            </tr>
                            <tr>
                                <th scope="row"><label for="nme_r2_account_id">Cloudflare R2 Account ID</label></th>
                                <td><input type="text" id="nme_r2_account_id" class="regular-text" value="<?php echo esc_attr(get_option('nme_r2_account_id', '')); ?>"></td>
                            </tr>
                            <tr>
                                <th scope="row"><label for="nme_r2_access_key">R2 Access Key</label></th>
                                <td><input type="text" id="nme_r2_access_key" class="regular-text" value="<?php echo esc_attr(get_option('nme_r2_access_key', '')); ?>"></td>
                            </tr>
                            <tr>
                                <th scope="row"><label for="nme_r2_secret_key">R2 Secret Key</label></th>
                                <td><input type="password" id="nme_r2_secret_key" class="regular-text" value="<?php echo esc_attr(get_option('nme_r2_secret_key', '')); ?>"></td>
                            </tr>
                            <tr>
                                <th scope="row"><label for="nme_r2_bucket">R2 Bucket Name</label></th>
                                <td><input type="text" id="nme_r2_bucket" class="regular-text" value="<?php echo esc_attr(get_option('nme_r2_bucket', '')); ?>" placeholder="my-bucket-name"></td>
                            </tr>
                            <tr>
                                <th scope="row"><label for="nme_r2_public_domain">R2 Public Domain</label></th>
                                <td><input type="url" id="nme_r2_public_domain" class="regular-text" value="<?php echo esc_attr(get_option('nme_r2_public_domain', '')); ?>" placeholder="https://cdn.vitazan.ca"></td>
                            </tr>
                        </table>
                    </div>

                    <div class="nme-card">
                        <h3>Entities to Export</h3>
                        <fieldset>
                            <label><input type="checkbox" class="nme-type-toggle" value="page" checked> Pages</label><br>
                            <label><input type="checkbox" class="nme-type-toggle" value="post" checked> Posts</label><br>
                            <label><input type="checkbox" class="nme-type-toggle" value="product" checked> WooCommerce Products</label><br>
                            <label><input type="checkbox" class="nme-type-toggle" value="shop_order" checked> WooCommerce Orders</label><br>
                            <label><input type="checkbox" class="nme-type-toggle" value="user" checked> Users & Customers</label><br>
                            <label><input type="checkbox" class="nme-type-toggle" value="nav_menu" checked> Hierarchical Menus</label><br>
                            <label><input type="checkbox" class="nme-type-toggle" value="site_logo" checked> Site Logo</label><br>
                        </fieldset>
                    </div>

                    <div class="nme-card">
                        <h3>Batch Limit (Testing)</h3>
                        <p style="margin-top: 0; font-size: 13px; color: #666;">Limit the number of entities extracted per type. Use a small value during testing to avoid long waits.</p>
                        <select id="nme_test_limit" style="min-width: 200px;">
                            <option value="10" selected>First 10 (Quick Test)</option>
                            <option value="50">First 50</option>
                            <option value="0">All (Full Migration)</option>
                        </select>
                    </div>

                    <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 20px;">
                        <button id="nme-start-export" class="button button-primary button-hero">Initialize Batch Export</button>
                        <button id="nme-cancel-export" class="button button-secondary button-hero" style="display:none; color: #d63638;">Cancel</button>
                        <a id="nme-download-redirects" href="#" class="button button-secondary button-hero">Download SEO 301 JSON Map</a>
                    </div>

                    <div id="nme-progress-container" style="display:none; margin-top: 20px;">
                        <div class="nme-progress-bar-bg">
                            <div id="nme-progress-bar" class="nme-progress-bar-fg" style="width: 0%;"></div>
                        </div>
                        <p id="nme-progress-text">Awaiting transmission...</p>
                        <ul id="nme-log-output"></ul>
                    </div>
                </div>

                <!-- Educational Sidebar -->
                <div style="flex: 0 0 350px; padding: 20px; background: #fff; border: 1px solid #ccd0d4; box-shadow: 0 1px 1px rgba(0,0,0,.04); border-radius: 4px;">
                    <h3 style="margin-top: 0; padding-bottom: 10px; border-bottom: 1px solid #eee;">Configuration Guide</h3>
                    
                    <h4 style="margin-bottom: 5px;">Supabase Edge URL</h4>
                    <p style="margin-top: 0; font-size: 13px; color: #666;">
                        In your Supabase Dashboard, go to <strong>Project Settings &rarr; API</strong> and find your <strong>Project URL</strong> (e.g. <code>https://xyz.supabase.co</code>).<br><br>
                        Since we are sending data directly to the Edge Function, you need to combine the Project URL with the Edge Function path.<br><br>
                        Your final URL here should look exactly like this:<br>
                        <code style="word-break: break-all;">https://[YOUR_ID].supabase.co/functions/v1/nextblock-migration-ingest</code>
                    </p>
                    
                    <h4 style="margin-bottom: 5px;">Supabase Service Role Key</h4>
                    <p style="margin-top: 0; font-size: 13px; color: #666;">Navigate to Supabase -> Project Settings -> API. Copy the <code>service_role</code> secret. <strong>Do not use the anon key.</strong></p>
                    
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    
                    <h4 style="margin-bottom: 5px;">Cloudflare R2 Account ID</h4>
                    <p style="margin-top: 0; font-size: 13px; color: #666;">In your Cloudflare Dashboard, look at the browser URL. The long alphanumeric string after <code>dash.cloudflare.com/</code> is your Account ID.</p>
                    
                    <h4 style="margin-bottom: 5px;">R2 Access & Secret Keys</h4>
                    <p style="margin-top: 0; font-size: 13px; color: #666;">Navigate to Cloudflare -> R2 -> Manage R2 API Tokens. Mint a new token strictly granting <strong>Object Read & Write</strong> permissions.</p>
                    
                    <h4 style="margin-bottom: 5px;">R2 Bucket & Domain</h4>
                    <p style="margin-top: 0; font-size: 13px; color: #666;">Identify the literal name of the bucket (e.g. <code>my-images</code>). Under Settings -> Public Access, connect it to your Custom Domain and enter the identical HTTPS address here.</p>
                </div>
            </div>
        </div>
        <?php
    }
}
