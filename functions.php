function werewolf_process_relay( $request ) {
    $params = $request->get_json_params();
    
    // Pull keys from the Headers sent by GitHub
    $twitch_client_id = $request->get_header('X-Twitch-Client-ID');
    $twitch_token     = $request->get_header('X-Twitch-Token');
    $broadcaster_id   = '896952944'; // Your verified ID

    // 1. Send to Discord (Always)
    wp_remote_post( "https://discord.com/api/webhooks/1412973382433247252/fFwKe5xeW-S6VgWaPionj0A-ieKu3h_qFLaDZBl2JKobFispq0fBg_5_y8n1cWHwlGpY", array(
        'headers' => array('Content-Type' => 'application/json'),
        'body'    => json_encode(array("content" => "**[{$params['platform']}] {$params['username']}:** {$params['message']}"))
    ));

    // 2. Send to Twitch (Only if keys are present and you are live)
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
                "for_source_only" => false
            ))
        ));
    }
    return new WP_REST_Response(array('status' => 'success'), 200);
}
