<?php
$plugin_id         = 24851; // Change to your product ID
$plugin_public_key = 'pk_fa434b3a361d9bd75c2a33438448c'; // Your public key
$plugin_secret_key = 'sk_V:gPf*#-LI284<gfFrf1p]%QuwU@W'; // Your secret key
$timestamp         = "1772826623"; // Will be replaced by node script

$sandbox_token = md5(
    $timestamp .
    $plugin_id .
    $plugin_secret_key .
    $plugin_public_key .
    'checkout'
);

echo "PHP Hash: " . json_encode(['ctx' => (string)$timestamp, 'token' => $sandbox_token]) . "\n";
?>
