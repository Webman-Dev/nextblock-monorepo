<?php
declare(strict_types=1);

namespace NextBlock\Migration;

if (!defined('ABSPATH')) exit;

class Ajax_Handler {
    public function hooks(): void {
        add_action('wp_ajax_nme_process_batch', [$this, 'process_batch']);
        add_action('wp_ajax_nme_save_settings', [$this, 'save_settings']);
        add_action('wp_ajax_nme_generate_redirects', [$this, 'generate_redirects']);
        add_action('wp_ajax_nme_test_connection', [$this, 'test_connection']);
    }

    public function save_settings(): void {
        check_ajax_referer('nme_export_nonce', 'nonce');
        update_option('nme_supabase_url', sanitize_url($_POST['supabase_url'] ?? ''));
        update_option('nme_supabase_key', sanitize_text_field($_POST['supabase_key'] ?? ''));
        update_option('nme_r2_account_id', sanitize_text_field($_POST['r2_account_id'] ?? ''));
        update_option('nme_r2_access_key', sanitize_text_field($_POST['r2_access_key'] ?? ''));
        update_option('nme_r2_secret_key', sanitize_text_field($_POST['r2_secret_key'] ?? ''));
        update_option('nme_r2_bucket', sanitize_text_field($_POST['r2_bucket'] ?? ''));
        update_option('nme_r2_public_domain', sanitize_url($_POST['r2_public_domain'] ?? ''));
        wp_send_json_success();
    }

    public function test_connection(): void {
        check_ajax_referer('nme_export_nonce', 'nonce');
        $api = new Api_Client();
        $res = $api->test_connection();
        if ($res['status'] === 'success') {
            wp_send_json_success($res);
        } else {
            wp_send_json_error($res);
        }
    }

    public function generate_redirects(): void {
        check_ajax_referer('nme_export_nonce', 'nonce');
        $extractor = new Extractor();
        $redirects = $extractor->generate_redirects();

        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="next-redirects.json"');
        echo wp_json_encode($redirects, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public function process_batch(): void {
        check_ajax_referer('nme_export_nonce', 'nonce');

        // CRITICAL: Prevent memory exhaustion by suspending WP object caching during massive queries
        wp_suspend_cache_addition(true);

        $post_type  = sanitize_text_field($_POST['post_type'] ?? '');
        $offset     = (int) ($_POST['offset'] ?? 0);
        $test_limit = (int) ($_POST['test_limit'] ?? 0); // 0 = unlimited
        $limit      = 10; // Aggressively lowered chunk volume to 10 to safely process Cloudflare R2 Deno Stream Buffer timeouts

        $extractor = new Extractor();
        $payload   = [];

        if ($post_type === 'site_logo') {
            // Logo extraction — single-pass, no pagination
            if ($offset === 0) {
                $logo = $extractor->extract_site_logo();
                if ($logo) {
                    $payload = [$logo];
                }
                $total = 1;
                $processed = 1;
            } else {
                wp_send_json_success(['done' => true]);
                return;
            }
        } elseif ($post_type === 'nav_menu') {
            // Menu trees are mathematically small and processed entirely in a single pass
            if ($offset === 0) {
                $payload = $extractor->extract_menus();
                $total   = 1;
                $processed = 1;
            } else {
                wp_send_json_success(['done' => true]);
                return;
            }
        } elseif ($post_type === 'user') {
            // User loop mapping
            $args = [
                'number' => $limit,
                'offset' => $offset,
                'fields' => 'ID'
            ];
            $user_query = new \WP_User_Query($args);
            $total = $user_query->get_total();

            // Clamp total to test_limit if set
            if ($test_limit > 0 && $total > $test_limit) {
                $total = $test_limit;
            }

            $users = (array) $user_query->get_results();
            if (empty($users) || $offset >= $total) {
                wp_send_json_success(['done' => true]);
                return;
            }

            foreach ($users as $u_id) {
                $payload[] = $extractor->extract_user((int) $u_id);
            }
            $processed = count($users);
        } elseif ($post_type === 'shop_order') {
            // HPOS-Compatible Order Ledger
            if (function_exists('wc_get_orders')) {
                $args = [
                    'limit'    => $limit,
                    'offset'   => $offset,
                    'paginate' => true,
                    'return'   => 'ids',
                    'type'     => 'shop_order',
                    'status'   => 'any'
                ];
                $results = wc_get_orders($args);
                $total = $results->total;
                $orders = $results->orders;

                // Clamp total to test_limit if set
                if ($test_limit > 0 && $total > $test_limit) {
                    $total = $test_limit;
                }
                
                if (empty($orders) || $offset >= $total) {
                    wp_send_json_success(['done' => true]);
                    return;
                }

                foreach ($orders as $order_id) {
                    $payload[] = $extractor->extract_order((int) $order_id);
                }
                $processed = count($orders);
            } else {
                wp_send_json_success(['done' => true]); // Bypass if WC not active
                return;
            }
        } else {
            // Standard entity processing (Posts, Pages, WooCommerce Products)
            $args = [
                'post_type'      => $post_type,
                'post_status'    => ['publish', 'draft'],
                'posts_per_page' => $limit,
                'offset'         => $offset,
                'fields'         => 'ids', // Memory optimization: fetch strictly integer IDs
                'no_found_rows'  => false  // Retain calculation to evaluate total progress
            ];

            $query = new \WP_Query($args);
            $total = $query->found_posts;

            // Clamp total to test_limit if set
            if ($test_limit > 0 && $total > $test_limit) {
                $total = $test_limit;
            }

            if (empty($query->posts) || $offset >= $total) {
                wp_send_json_success(['done' => true]);
                return;
            }

            foreach ($query->posts as $post_id) {
                // process_entity now returns an ARRAY of entities (one per language)
                $entities = $extractor->process_entity((int) $post_id, $post_type);
                foreach ($entities as $entity) {
                    $payload[] = $entity;
                }
            }
            $processed = count($query->posts);
        }

        // Initialize API transmission to Supabase
        $api = new Api_Client();
        $response = $api->transmit($post_type, $payload);

        // Force PHP garbage collector to drop cached object data to free the memory heap
        wp_cache_flush();

        wp_send_json_success([
            'done'       => ($offset + $processed) >= $total,
            'offset'     => $offset + $processed,
            'total'      => $total,
            'api_status' => $response,
            'message'    => "Extracted {$processed} {$post_type} entities."
        ]);
    }
}
