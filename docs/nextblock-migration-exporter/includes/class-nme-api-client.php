<?php
declare(strict_types=1);

namespace NextBlock\Migration;

if (!defined('ABSPATH')) exit;

class Api_Client {
    /**
     * Manages HTTPS transport and strict authorization mappings for Supabase Edge injection.
     */
    public function transmit(string $type, array $payload): array {
        $url = get_option('nme_supabase_url');
        $key = get_option('nme_supabase_key');

        if (empty($url) || empty($key) || empty($payload)) {
            return ['status' => 'skipped', 'reason' => 'Invalid configuration or null payload detected.'];
        }

        // Auto-fix URL if the user only pasted the base project URL
        if (strpos($url, '/functions/v1/') === false) {
            $url = rtrim($url, '/') . '/functions/v1/nextblock-migration-ingest';
        }

        $args = [
            'method'  => 'POST',
            'timeout' => 60, // Elevated to 60.0s for massive high-latency external ingestion proxies and R2 media streams
            'headers' => [
                'Content-Type'  => 'application/json',
                'Authorization' => 'Bearer ' . $key,
                'apikey'        => $key
            ],
            'body' => wp_json_encode([
                'entity_type' => $type,
                'r2_config'   => [
                    'account_id'    => get_option('nme_r2_account_id', ''),
                    'access_key'    => get_option('nme_r2_access_key', ''),
                    'secret_key'    => get_option('nme_r2_secret_key', ''),
                    'bucket'        => get_option('nme_r2_bucket', ''),
                    'public_domain' => get_option('nme_r2_public_domain', '')
                ],
                'data'        => $payload
            ])
        ];

        $response = wp_remote_post($url, $args);

        if (is_wp_error($response)) {
            return ['status' => 'error', 'message' => $response->get_error_message()];
        }

        $code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);

        if ($code >= 400) {
            return ['status' => 'error', 'message' => "HTTP $code: " . $body];
        }

        return [
            'status' => 'success',
            'code'   => $code,
            'body'   => $body
        ];
    }

    public function test_connection(): array {
        $url = get_option('nme_supabase_url');
        
        if (empty($url)) {
            return ['status' => 'error', 'message' => 'Supabase URL is not configured.'];
        }

        if (strpos($url, '/functions/v1/') === false) {
            $url = rtrim($url, '/') . '/functions/v1/nextblock-migration-ingest';
        }

        $args = [
            'method'  => 'OPTIONS',
            'timeout' => 10,
        ];

        $response = wp_remote_request($url, $args);

        if (is_wp_error($response)) {
            return ['status' => 'error', 'message' => $response->get_error_message()];
        }

        $code = wp_remote_retrieve_response_code($response);
        if ($code >= 200 && $code < 300) {
            return ['status' => 'success', 'code' => $code];
        }

        return ['status' => 'error', 'message' => "Endpoint returned HTTP $code", 'code' => $code];
    }
}
