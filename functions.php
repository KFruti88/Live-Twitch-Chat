<?php
/**
 * WEREWOLF STREAM HUB (werewolf.ourflora.com)
 * Handles Chat Relay, Auto-Live Detection, and Discord Notifications.
 * Database logging removed for a cleaner setup.
 */

// --- 1. THE RELAY ENDPOINT ---
add_action( 'rest_api_init', function () {
    register_rest_route( 'stream-bridge/v1', '/relay', array(
        'methods'             => 'POST',
        'callback'            => 'werewolf_process_relay',
        'permission_callback' => '__return_true', 
    ));
});

function werewolf_process_relay( $request ) {
    $params   = $request->get_json_params();
    $user     = sanitize_text_field($params['username']);
    $msg      = sanitize_textarea_field($params['message']);
    $platform = sanitize_text_field($params['platform']);
    
    // 1. ALWAYS SEND TO DISCORD (Works 24/7)
    $discord_webhook = "https://discord.com/api/webhooks/1412973382433247252/fFwKe5xeW-S6VgWaPionj0A-ieKu3h_qFLaDZBl2JKobFispq0fBg_5_y8n1cWHwlGpY";
    wp_remote_post( $discord_webhook, array(
        'headers' => array('Content-Type' => 'application/json'),
        'body'    => json_encode(array("content" => "**[$platform] $user:** $msg"))
    ));

    // 2. SEND TO TWITCH (ONLY if you are live)
    if ( get_option('my_stream_status') === 'yes' ) {
        wp_remote_post( 'https://api.twitch.tv/helix/chat/messages', array(
            'headers' => array(
                'Authorization' => 'Bearer YOUR_TWITCH_ACCESS_TOKEN', // PASTE HERE
                'Client-Id'     => 'YOUR_TWITCH_CLIENT_ID',     // PASTE HERE
                'Content-Type'  => 'application/json'
            ),
            'body' => json_encode(array(
                "broadcaster_id"  => '896952944',
                "sender_id"       => '896952944',
                "message"         => "[$platform] $user: $msg",
                "for_source_only" => false // Enabled for Shared Chat
            ))
        ));
    }
    
    return new WP_REST_Response(array('status' => 'success'), 200);
}

// --- 2. AUTO-CHECK TWITCH LIVE STATUS ---
function werewolf_auto_check_twitch_status() {
    $client_id = 'YOUR_TWITCH_CLIENT_ID';      // PASTE HERE
    $token     = 'YOUR_TWITCH_ACCESS_TOKEN'; // PASTE HERE
    $user_id   = '896952944';

    $response = wp_remote_get( "https://api.twitch.tv/helix/streams?user_id=$user_id", array(
        'headers' => array(
            'Client-ID'     => $client_id,
            'Authorization' => 'Bearer ' . $token,
        )
    ));

    if ( ! is_wp_error( $response ) && wp_remote_retrieve_response_code( $response ) === 200 ) {
        $data = json_decode( wp_remote_retrieve_body( $response ), true );
        $old_status = get_option('my_stream_status', 'no');
        $new_status = ! empty( $data['data'] ) ? 'yes' : 'no';

        if ($old_status !== $new_status) {
            update_option( 'my_stream_status', $new_status );
            
            // Notify Discord of status change
            $alert = ($new_status === 'yes') ? "🔴 LIVE detected! Twitch relay active." : "⚪ OFFLINE detected. Relay paused.";
            wp_remote_post("https://discord.com/api/webhooks/1412973382433247252/fFwKe5xeW-S6VgWaPionj0A-ieKu3h_qFLaDZBl2JKobFispq0fBg_5_y8n1cWHwlGpY", array(
                'headers' => array('Content-Type' => 'application/json'),
                'body'    => json_encode(array("content" => "**System Alert:** $alert"))
            ));
        }
    }
}

// --- 3. THE SCHEDULER (WP-CRON) ---
add_filter( 'cron_schedules', function ( $schedules ) {
    $schedules['every_five_minutes'] = array(
        'interval' => 300, 
        'display'  => esc_html__( 'Every Five Minutes' ),
    );
    return $schedules;
});

if ( ! wp_next_scheduled( 'werewolf_check_twitch_event' ) ) {
    wp_schedule_event( time(), 'every_five_minutes', 'werewolf_check_twitch_event' );
}
add_action( 'werewolf_check_twitch_event', 'werewolf_auto_check_twitch_status' );
