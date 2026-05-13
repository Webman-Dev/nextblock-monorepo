<?php
declare(strict_types=1);

namespace NextBlock\Migration;

if (!defined('ABSPATH')) exit;

class WooCommerce_Mapper {
    /**
     * Collapses vertical EAV structures into a comprehensive horizontal object array.
     */
    public function extract_product_data(int $post_id): array {
        $product = wc_get_product($post_id);
        if (!$product) return [];

        $data = [
            'sku'           => $product->get_sku(),
            'price'         => $product->get_price(),
            'regular_price' => $product->get_regular_price(),
            'sale_price'    => $product->get_sale_price(),
            'manage_stock'  => $product->get_manage_stock(),
            'stock_qty'     => $product->get_stock_quantity(),
            'stock_status'  => $product->get_stock_status(),
            'weight'              => $product->get_weight(),
            'dimensions'          => $product->get_dimensions(false),
            'is_variable'         => $product->is_type('variable'),
            'attributes'          => $this->format_attributes($product),
            'freemius_plan_id'    => get_post_meta($post_id, 'freemius_plan_id', true) ?: null,
            'freemius_product_id' => get_post_meta($post_id, 'freemius_product_id', true) ?: null,
            'variations'          => [],
        ];

        // Resolve parent-child relational complexity by nesting variant object arrays.
        if ($data['is_variable']) {
            $variations = $product->get_available_variations();
            foreach ($variations as $var) {
                $var_obj = wc_get_product($var['variation_id']);
                if ($var_obj) {
                    $data['variations'][] = [
                        'variation_id' => $var['variation_id'],
                        'attributes'   => $var['attributes'],
                        'sku'          => $var_obj->get_sku(),
                        'price'        => $var_obj->get_price(),
                        'stock_qty'    => $var_obj->get_stock_quantity(),
                        'stock_status' => $var_obj->get_stock_status(),
                    ];
                }
            }
        }

        return $data;
    }

    private function format_attributes(\WC_Product $product): array {
        $formatted = [];
        foreach ($product->get_attributes() as $attr) {
            $formatted[] = [
                'name'    => $attr->get_name(),
                'options' => $attr->get_options(),
                'visible' => $attr->get_visible(),
                'variation'=> $attr->get_variation()
            ];
        }
        return $formatted;
    }
}
