<?php
/**
 * WEREWOLF STREAM HUB (werewolf.ourflora.com)
 * Handles Chat Relay and Auto-Live Detection using GitHub-provided keys.
 */

// --- SECTION 1: THE RELAY ENDPOINT ---
add_action( 'rest_api_init', function () {
    register_rest_route( 'stream-bridge/v1', '/relay', array(
        'methods'             => 'POST',
        'callback'            => 'werewolf_process_relay',
        'permission_callback' => '__return_true', 
    ));
});

function werewolf_process_relay( $request ) {
    $params = $request->get_json_params();
    
    // PULL KEYS FROM HEADERS (Sent by GitHub Action)
    $twitch_client_id = $request->get_header('X-Twitch-Client-ID'); //
    $twitch_token     = $request->get_header('X-Twitch-Token');     //
    $broadcaster_id   = '896952944'; // Your verified ID

    // 1. ALWAYS SEND TO YOUR DISCORD
    $discord_webhook = "https://discord.com/api/webhooks/1412973382433247252/fFwKe5xeW-S6VgWaPionj0A-ieKu3h_qFLaDZBl2JKobFispq0fBg_5_y8n1cWHwlGpY";
    wp_remote_post( $discord_webhook, array(
        'headers' => array('Content-Type' => 'application/json'),
        'body'    => json_encode(array("content" => "**[{$params['platform']}] {$params['username']}:** {$params['message']}"))
    ));

    // 2. SEND TO TWITCH (ONLY if keys are present and you are live)
    if ( get_option('my_stream_status') === 'yes' && $twitch_token ) {
        wp_remote_post( 'https://api.twitch.tv/helix/chat/messages', array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $twitch_token,
                'Client-Id'     => $twitch_client_id,
                'Content-Type'  => 'application/json'
            ),
            'body' => json_encode(array(
                "broadcaster_id"  => $broadcaster_id,
                "sender_id"       => $broadcaster_id,
                "message"         => "[{$params['platform']}] {$params['username']}: {$params['message']}",
                "for_source_only" => false // Shared Chat support
            ))
        ));
    }
    return new WP_REST_Response(array('status' => 'success'), 200);
}

// --- SECTION 2: AUTO-CHECK TWITCH STATUS ---
function werewolf_auto_check_twitch_status() {
    // Note: This part still needs keys. To keep it fully synced with GitHub, 
    // it will update based on the last successful relay data.
    $client_id = get_option('last_twitch_client_id'); 
    $token     = get_option('last_twitch_token');
    $user_id   = '896952944';

    if (!$client_id || !$token) return;

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
            $status_msg = ($new_status === 'yes') ? "🔴 LIVE detected!" : "⚪ OFFLINE.";
            wp_remote_post("https://discord.com/api/webhooks/1412973382433247252/fFwKe5xeW-S6VgWaPionj0A-ieKu3h_qFLaDZBl2JKobFispq0fBg_5_y8n1cWHwlGpY", array(
                'headers' => array('Content-Type' => 'application/json'),
                'body'    => json_encode(array("content" => "**System Alert:** $status_msg"))
            ));
        }
    }
}

// --- SECTION 3: THE SCHEDULER (WP-CRON) ---
add_filter( 'cron_schedules', function ( $schedules ) {
    $schedules['every_five_minutes'] = array('interval' => 300, 'display' => 'Every 5 Minutes');
    return $schedules;
});
if ( ! wp_next_scheduled( 'werewolf_check_twitch_event' ) ) {
    wp_schedule_event( time(), 'every_five_minutes', 'werewolf_check_twitch_event' );
}
add_action( 'werewolf_check_twitch_event', 'werewolf_auto_check_twitch_status' );
