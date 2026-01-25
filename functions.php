add_action( 'rest_api_init', function () {
    register_rest_route( 'stream-bridge/v1', '/relay', array(
        'methods' => 'POST',
        'callback' => 'process_stream_relay',
        'permission_callback' => '__return_true',
    ));
});

function process_stream_relay( $request ) {
    $params = $request->get_json_params();
    $user = sanitize_text_field($params['username']);
    $msg = sanitize_textarea_field($params['message']);
    $platform = sanitize_text_field($params['platform']);
    
    // --- 1. ALWAYS SEND TO DISCORD ---
    $discord_webhook = "https://discord.com/api/webhooks/1412973382433247252/fFwKe5xeW-S6VgWaPionj0A-ieKu3h_qFLaDZBl2JKobFispq0fBg_5_y8n1cWHwlGpY";
    
    wp_remote_post( $discord_webhook, array(
        'headers' => array('Content-Type' => 'application/json'),
        'body' => json_encode(array(
            "content" => "**[$platform] $user:** $msg"
        ))
    ));

    // --- 2. CHECK IF LIVE & PUSH TO TWITCH ---
    // Change 'no' to 'yes' manually or via a plugin when you start streaming
    $is_live = get_option('my_stream_status', 'no'); 

    if ( $is_live === 'yes' ) {
        $twitch_client_id = 'YOUR_CLIENT_ID';
        $twitch_token     = 'YOUR_OAUTH_TOKEN'; // Needs user:write:chat scope
        $broadcaster_id   = 'YOUR_USER_ID';     // Your numerical ID
        
        wp_remote_post( 'https://api.twitch.tv/helix/chat/messages', array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $twitch_token,
                'Client-Id'     => $twitch_client_id,
                'Content-Type'  => 'application/json'
            ),
            'body' => json_encode(array(
                "broadcaster_id" => $broadcaster_id,
                "sender_id"      => $broadcaster_id, // Sending as yourself
                "message"        => "[$platform] $user: $msg"
            ))
        ));
    } else {
        // --- 3. OPTIONAL: LOG OFFLINE MESSAGES TO DB ---
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
