<?php
/**
 * Stream Chat Bridge for werewolf.ourflora.com
 * Receives messages from GitHub Actions and pushes to Discord and Twitch Shared Chat.
 * Endpoint: https://werewolf.ourflora.com/wp-json/stream-bridge/v1/relay
 */

add_action( 'rest_api_init', function () {
    register_rest_route( 'stream-bridge/v1', '/relay', array(
        'methods'             => 'POST',
        'callback'            => 'werewolf_process_relay',
        'permission_callback' => '__return_true', // You can add an API Key check here later for security
    ));
});

function werewolf_process_relay( $request ) {
    $params   = $request->get_json_params();
    $user     = sanitize_text_field($params['username']);
    $msg      = sanitize_textarea_field($params['message']);
    $platform = sanitize_text_field($params['platform']);
    
    // --- 1. ALWAYS SEND TO YOUR DISCORD ---
    $discord_webhook = "https://discord.com/api/webhooks/1412973382433247252/fFwKe5xeW-S6VgWaPionj0A-ieKu3h_qFLaDZBl2JKobFispq0fBg_5_y8n1cWHwlGpY";
    
    wp_remote_post( $discord_webhook, array(
        'headers' => array('Content-Type' => 'application/json'),
        'body'    => json_encode(array(
            "content" => "**[$platform] $user:** $msg"
        ))
    ));

    // --- 2. CHECK IF LIVE & PUSH TO TWITCH ---
    // Note: Set 'my_stream_status' to 'yes' in your WP options when you start your stream.
    $is_live = get_option('my_stream_status', 'no'); 

    if ( $is_live === 'yes' ) {
        // REPLACE THESE with the actual strings you saved from Twitch/Token Generator
        $twitch_client_id = 'YOUR_TWITCH_CLIENT_ID'; 
        $twitch_token     = 'YOUR_TWITCH_ACCESS_TOKEN'; 
        $broadcaster_id   = '896952944'; // Your verified Twitch ID from screenshot
        
        wp_remote_post( 'https://api.twitch.tv/helix/chat/messages', array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $twitch_token,
                'Client-Id'     => $twitch_client_id,
                'Content-Type'  => 'application/json'
            ),
            'body' => json_encode(array(
                "broadcaster_id"  => $broadcaster_id,
                "sender_id"       => $broadcaster_id,
                "message"         => "[$platform] $user: $msg",
                "for_source_only" => false // This ensures it works with Twitch's Shared Chat
            ))
        ));
    } else {
        // --- 3. LOG OFFLINE MESSAGES TO DATABASE ---
        // This saves messages so you can check them on your site later.
        global $wpdb;
        $wpdb->insert('wp_offline_messages', array(
            'platform' => $platform,
            'user'     => $user,
            'message'  => $msg,
            'time'     => current_time('mysql')
        ));
    }
    
    return new WP_REST_Response(array('status' => 'success'), 200);
}
