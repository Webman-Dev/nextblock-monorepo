<?php
declare(strict_types=1);

namespace NextBlock\Migration;

if (!defined('ABSPATH')) exit;

class Extractor {

    /**
     * Parses qTranslate-style multilingual shortcodes.
     * Input:  "[:en]English text[:fr]French text[:]"
     * Output: ['en' => 'English text', 'fr' => 'French text']
     * If no shortcodes found, returns null.
     */
    public function parse_qtranslate(?string $text): ?array {
        if (empty($text)) return null;

        // Match [:xx]content patterns (qTranslate-X / qTranslate-XT)
        if (preg_match_all('/\[:([a-z]{2,5})\](.*?)(?=\[:|$)/s', $text, $matches, PREG_SET_ORDER)) {
            if (count($matches) < 2) return null; // Need at least 2 languages for it to be multilingual
            $result = [];
            foreach ($matches as $match) {
                $lang = $match[1];
                $content = rtrim($match[2], '[:] ');
                // Remove trailing [:] marker
                $content = preg_replace('/\[:\]\s*$/', '', $content);
                $result[$lang] = trim($content);
            }
            return count($result) >= 2 ? $result : null;
        }

        return null;
    }

    /**
     * Takes a single entity data array and splits it into multiple language-specific
     * entities if qTranslate shortcodes are detected in key text fields.
     * Returns an array of entities (always an array, even if only one language).
     */
    public function split_entity_by_language(array $data): array {
        // Fields to check for qTranslate shortcodes
        $translatable_fields = ['title', 'excerpt', 'content_html'];
        $ecommerce_fields = ['short_description'];

        // Detect languages from all translatable fields
        $detected_languages = [];
        foreach ($translatable_fields as $field) {
            $parsed = $this->parse_qtranslate($data[$field] ?? null);
            if ($parsed !== null) {
                $detected_languages = array_unique(array_merge($detected_languages, array_keys($parsed)));
            }
        }

        // Also check ecommerce short_description
        if (isset($data['ecommerce'])) {
            // WooCommerce excerpt (short description) is in $data['excerpt'] for products
        }

        // Check the WooCommerce short_description field from the excerpt
        $parsed_excerpt = $this->parse_qtranslate($data['excerpt'] ?? null);
        if ($parsed_excerpt !== null) {
            $detected_languages = array_unique(array_merge($detected_languages, array_keys($parsed_excerpt)));
        }

        // If no multilingual content detected, return as-is with single entity
        if (empty($detected_languages)) {
            return [$data];
        }

        // Build a shared translation_group_id for all variants
        $base_trid = $data['translation']['translation_group_id'] ?? sprintf('00000000-0000-0000-0000-%012d', $data['id'] ?? 0);

        $entities = [];
        foreach ($detected_languages as $lang) {
            $entity = $data;

            // Override translation metadata
            $entity['translation'] = [
                'iso_code' => $lang,
                'translation_group_id' => $base_trid,
            ];

            // Split each translatable text field
            foreach ($translatable_fields as $field) {
                if (!isset($entity[$field])) continue;
                $parsed = $this->parse_qtranslate($entity[$field]);
                if ($parsed !== null) {
                    $entity[$field] = $parsed[$lang] ?? $parsed[array_key_first($parsed)] ?? $entity[$field];
                }
            }

            // Also split the SEO fields if they contain shortcodes
            if (isset($entity['seo'])) {
                foreach (['meta_title', 'meta_description'] as $seo_field) {
                    if (isset($entity['seo'][$seo_field])) {
                        $parsed = $this->parse_qtranslate($entity['seo'][$seo_field]);
                        if ($parsed !== null) {
                            $entity['seo'][$seo_field] = $parsed[$lang] ?? $parsed[array_key_first($parsed)] ?? $entity['seo'][$seo_field];
                        }
                    }
                }
            }

            $entities[] = $entity;
        }

        return $entities;
    }

    /**
     * Primary hub routing entity extraction logic based on the underlying architecture.
     * Returns an ARRAY of entities (one per detected language).
     */
    public function process_entity(int $post_id, string $post_type): array {
        $post = get_post($post_id);
        
        $status = $post->post_status === 'publish' ? 'published' : 'draft';
        if ($post_type === 'product') {
            $status = $post->post_status === 'publish' ? 'active' : 'draft';
        }

        $author = get_userdata($post->post_author);

        $clean_date = function($date) {
            return ($date === '0000-00-00 00:00:00' || empty($date)) ? null : $date;
        };

        $data = [
            'id' => $post->ID,
            'title' => get_the_title($post),
            'slug' => $post->post_name,
            'status' => $status,
            'created_at' => $clean_date($post->post_date_gmt) ?? $clean_date($post->post_date),
            'updated_at' => $clean_date($post->post_modified_gmt) ?? $clean_date($post->post_modified),
            'published_at' => $clean_date($post->post_date_gmt) ?? $clean_date($post->post_date),
            'author_id' => $post->post_author,
            'author_email' => $author ? $author->user_email : null,
            'excerpt' => $post->post_excerpt,
        ];

        // Extract associated categories, tags, and custom taxonomies
        $data['taxonomies'] = $this->extract_taxonomies($post->ID);

        // Extract clean custom meta-data (ignoring private prefixed '_' keys to avoid system junk)
        $all_meta = get_post_meta($post->ID);
        $clean_meta = [];
        foreach ($all_meta as $key => $value) {
            if (strpos($key, '_') !== 0) {
                $clean_meta[$key] = count($value) === 1 ? $value[0] : $value;
            }
        }
        $data['custom_meta'] = $clean_meta;

        // Execute shortcodes and Gutenberg blocks into standard HTML for Tiptap ingestion
        $html_content = apply_filters('the_content', $post->post_content);
        $data['content_html'] = $html_content;

        // Scrape <img> tags via Regex to package asset URLs for Edge function rewriting
        $data['media_urls'] = $this->extract_media_urls($html_content);
        
        // Extract the canonical featured image
        $thumb_url = get_the_post_thumbnail_url($post->ID, 'full');
        if ($thumb_url) {
            $data['media_urls'][] = $thumb_url;
            $data['media_urls'] = array_values(array_unique($data['media_urls']));
        }
        $data['featured_image'] = $thumb_url;

        // Normalize SEO Metadata (Yoast vs RankMath)
        $data['seo'] = $this->extract_seo_metadata($post->ID);

        // Normalize Multilingual data (WPML vs Polylang)
        $data['translation'] = $this->extract_multilingual_data($post->ID, $post_type);

        // Specialized WooCommerce object formatting
        if ($post_type === 'product' && function_exists('wc_get_product')) {
            $woo_mapper = new WooCommerce_Mapper();
            $data['ecommerce'] = $woo_mapper->extract_product_data($post->ID);
        }

        // Extract Global Customizer CSS purely on the initial request
        if ($post_id === 1 || $post_id === 2) {
            $data['global_customizer_css'] = wp_get_custom_css();
        }

        // Split into per-language entities if qTranslate shortcodes detected
        return $this->split_entity_by_language($data);
    }

    /**
     * Extracts the WordPress site logo for migration to NextBlock.
     * Attempts custom_logo (Customizer), then site_icon as fallback.
     */
    public function extract_site_logo(): ?array {
        // Try the Custom Logo (set via Appearance > Customize > Site Identity)
        $custom_logo_id = get_theme_mod('custom_logo');
        if ($custom_logo_id) {
            $logo_url = wp_get_attachment_image_url($custom_logo_id, 'full');
            if ($logo_url) {
                $attachment = get_post($custom_logo_id);
                return [
                    'url' => $logo_url,
                    'file_name' => basename($logo_url),
                    'alt' => get_post_meta($custom_logo_id, '_wp_attachment_image_alt', true) ?: get_bloginfo('name'),
                    'width' => (int) wp_get_attachment_metadata($custom_logo_id)['width'] ?? 0,
                    'height' => (int) wp_get_attachment_metadata($custom_logo_id)['height'] ?? 0,
                ];
            }
        }

        // Fallback: Site Icon (favicon)
        $site_icon_id = get_option('site_icon');
        if ($site_icon_id) {
            $icon_url = wp_get_attachment_image_url($site_icon_id, 'full');
            if ($icon_url) {
                return [
                    'url' => $icon_url,
                    'file_name' => basename($icon_url),
                    'alt' => get_bloginfo('name'),
                    'width' => (int) wp_get_attachment_metadata($site_icon_id)['width'] ?? 0,
                    'height' => (int) wp_get_attachment_metadata($site_icon_id)['height'] ?? 0,
                ];
            }
        }

        return null;
    }

    /**
     * Extracts all associated taxonomy terms for the given entity.
     */
    private function extract_taxonomies(int $post_id): array {
        $taxonomies = get_post_taxonomies($post_id);
        $extracted = [];
        foreach ($taxonomies as $tax) {
            $terms = wp_get_post_terms($post_id, $tax, ['fields' => 'all']);
            if (!is_wp_error($terms) && !empty($terms)) {
                $term_data = [];
                foreach ($terms as $term) {
                    $term_data[] = [
                        'id' => $term->term_id,
                        'name' => $term->name,
                        'slug' => $term->slug,
                        'parent' => $term->parent
                    ];
                }
                $extracted[$tax] = $term_data;
            }
        }
        return $extracted;
    }

    /**
     * Interrogates postmeta to harmonize Yoast and RankMath schemas into a strict JSON format.
     */
    private function extract_seo_metadata(int $post_id): array {
        $title = get_post_meta($post_id, '_yoast_wpseo_title', true) ?: get_post_meta($post_id, 'rank_math_title', true);
        $desc  = get_post_meta($post_id, '_yoast_wpseo_metadesc', true) ?: get_post_meta($post_id, 'rank_math_description', true);
        $og_img= get_post_meta($post_id, '_yoast_wpseo_opengraph-image', true) ?: get_post_meta($post_id, 'rank_math_facebook_image', true);

        return [
            'meta_title'       => $title ?: get_the_title($post_id),
            'meta_description' => $desc ?: wp_trim_excerpt('', $post_id),
            'og_image'         => $og_img ?: get_the_post_thumbnail_url($post_id, 'full'),
        ];
    }

    /**
     * Unified handler translating discrete WPML and Polylang architectures into ISO & TRID arrays.
     */
    private function extract_multilingual_data(int $post_id, string $type): array {
        $iso = 'en'; 
        $trid = (string) $post_id;

        // WPML Hook Resolution
        if (defined('ICL_SITEPRESS_VERSION')) {
            $lang_details = apply_filters('wpml_post_language_details', null, $post_id);
            $iso = $lang_details['language_code'] ?? substr(get_locale(), 0, 2);
            $trid = (string) apply_filters('wpml_element_trid', null, $post_id, 'post_' . $type);
        } 
        // Polylang Taxonomy Resolution
        elseif (function_exists('pll_get_post_language')) {
            $iso = call_user_func('pll_get_post_language', $post_id, 'slug') ?: substr(get_locale(), 0, 2);
            $translations = call_user_func('pll_get_post_translations', $post_id);
            // Polylang returns an array of post IDs. We use the minimum ID to generate a consistent relational hash.
            if (!empty($translations)) {
                $trid = (string) min($translations);
            }
        }
        // Weglot
        elseif (function_exists('weglot_get_original_language')) {
            $iso = call_user_func('weglot_get_original_language') ?: substr(get_locale(), 0, 2);
        }
        // TranslatePress
        elseif (class_exists('TRP_Translate_Press')) {
            global $TRP_LANGUAGE;
            $iso = isset($TRP_LANGUAGE) ? substr($TRP_LANGUAGE, 0, 2) : substr(get_locale(), 0, 2);
        }
        // Generic WordPress Fallback
        else {
            $iso = substr(get_locale(), 0, 2);
        }

        // Format $trid as a valid UUID (deterministic across batch executions)
        $trid_uuid = sprintf('00000000-0000-0000-0000-%012d', (int) $trid);

        return [
            'iso_code' => $iso,
            'translation_group_id' => $trid_uuid
        ];
    }

    /**
     * High-efficiency O(N) Regex search to isolate external image URIs within rendered HTML.
     */
    private function extract_media_urls(string $html): array {
        $urls = [];
        if (preg_match_all('/<img[^>]+src=(["\'])(.*?)\1/i', $html, $matches)) {
            $urls = array_unique($matches[2]);
        }
        return array_values($urls);
    }

    /**
     * Recursively traverses a flat WordPress array to output a structured JSON tree for frontend rendering.
     */
    public function extract_user(int $user_id): array {
        $user = get_userdata($user_id);
        if (!$user) return [];

        $addresses = [];
        
        $billing_city = get_user_meta($user_id, 'billing_city', true);
        if ($billing_city) {
            $addresses[] = [
                'address_type' => 'billing',
                'is_default'   => true,
                'recipient_name' => trim(get_user_meta($user_id, 'billing_first_name', true) . ' ' . get_user_meta($user_id, 'billing_last_name', true)),
                'line1'        => get_user_meta($user_id, 'billing_address_1', true),
                'line2'        => get_user_meta($user_id, 'billing_address_2', true),
                'city'         => $billing_city,
                'state'        => get_user_meta($user_id, 'billing_state', true),
                'postal_code'  => get_user_meta($user_id, 'billing_postcode', true),
                'country_code' => get_user_meta($user_id, 'billing_country', true)
            ];
        }

        $shipping_city = get_user_meta($user_id, 'shipping_city', true);
        if ($shipping_city) {
            $addresses[] = [
                'address_type' => 'shipping',
                'is_default'   => true,
                'recipient_name' => trim(get_user_meta($user_id, 'shipping_first_name', true) . ' ' . get_user_meta($user_id, 'shipping_last_name', true)),
                'line1'        => get_user_meta($user_id, 'shipping_address_1', true),
                'line2'        => get_user_meta($user_id, 'shipping_address_2', true),
                'city'         => $shipping_city,
                'state'        => get_user_meta($user_id, 'shipping_state', true),
                'postal_code'  => get_user_meta($user_id, 'shipping_postcode', true),
                'country_code' => get_user_meta($user_id, 'shipping_country', true)
            ];
        }

        return [
            'id' => $user_id,
            'email' => $user->user_email,
            'login' => $user->user_login,
            'full_name' => trim(get_user_meta($user_id, 'first_name', true) . ' ' . get_user_meta($user_id, 'last_name', true)),
            'stripe_customer_id' => get_user_meta($user_id, 'wp__stripe_customer_id', true) ?: get_user_meta($user_id, '_stripe_customer_id', true) ?: null,
            'addresses' => $addresses
        ];
    }

    public function extract_order(int $order_id): array {
        if (!function_exists('wc_get_order')) return [];
        $order = wc_get_order($order_id);
        if (!$order) return [];

        $wp_status = $order->get_status(); // Note: Without the 'wc-' prefix
        // Map WP statuses ('pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed')
        $status = 'pending';
        if (in_array($wp_status, ['processing', 'completed'])) $status = 'paid';
        if ($wp_status === 'cancelled' || $wp_status === 'failed') $status = 'cancelled';
        if ($wp_status === 'refunded') $status = 'refunded';

        $items = [];
        foreach ($order->get_items() as $item) {
            if (!method_exists($item, 'get_product')) continue;
            
            /** @var \WC_Order_Item_Product $item */
            $product = $item->get_product();
            $sku = $product ? $product->get_sku() : null;
            if (!$sku) continue; // If SKU doesn't exist, NextBlock relational DB cannot bridge it.

            $items[] = [
                'sku' => $sku,
                'quantity' => $item->get_quantity(),
                'price_at_purchase' => (int) round(((float) $item->get_subtotal() / max(1, $item->get_quantity())) * 100) // Converted to integer cents
            ];
        }

        return [
            'id' => $order_id,
            'user_email' => $order->get_billing_email(),
            'status' => $status,
            'total' => (int) round((float) $order->get_total() * 100), // Converted to cents
            'stripe_session_id' => $order->get_meta('_stripe_session_id') ?: null,
            'payment_intent_id' => $order->get_meta('_stripe_intent_id') ?: null,
            'provider' => 'stripe',
            'created_at' => $order->get_date_created() ? $order->get_date_created()->date('Y-m-d H:i:s') : null,
            'order_items' => $items
        ];
    }

    public function generate_redirects(): array {
        $redirects = [];
        $query = new \WP_Query([
            'post_type'      => ['post', 'page', 'product'],
            'posts_per_page' => -1,
            'post_status'    => 'publish'
        ]);

        foreach ($query->posts as $post) {
            $old_url = wp_make_link_relative(get_permalink($post->ID));
            $slug = $post->post_name;
            
            $new_url = "/{$slug}";
            if ($post->post_type === 'product') {
                $new_url = "/products/{$slug}";
            } elseif ($post->post_type === 'post') {
                $new_url = "/blog/{$slug}";
            }
            
            if ($old_url !== $new_url) {
                // Complies identically with standard next.config.js redirect objects
                $redirects[] = [
                    'source'      => $old_url,
                    'destination' => $new_url,
                    'permanent'   => true
                ];
            }
        }
        return $redirects;
    }

    public function extract_menus(): array {
        $menus = wp_get_nav_menus();
        $payload = [];

        foreach ($menus as $menu) {
            $items = wp_get_nav_menu_items($menu->term_id);
            $payload[] = [
                'slug' => $menu->slug,
                'name' => $menu->name,
                'tree' => $this->build_menu_tree($items ?: [])
            ];
        }
        return $payload;
    }

    private function build_menu_tree(array $elements, int $parent_id = 0): array {
        $branch = [];
        foreach ($elements as $element) {
            if ((int) $element->menu_item_parent === $parent_id) {
                $children = $this->build_menu_tree($elements, (int) $element->ID);
                $node = [
                    'id' => $element->ID,
                    'title' => $element->title,
                    'url' => $element->url,
                ];
                if ($children) {
                    $node['children'] = $children;
                }
                $branch[] = $node;
            }
        }
        return $branch;
    }
}
