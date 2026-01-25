add_action( 'rest_api_init', function () {
    register_rest_route( 'stream-bridge/v1', '/incoming', array(
        'methods' => 'POST',
        'callback' => 'handle_stream_message',
        'permission_callback' => '__return_true', // You should add a secret key later
    ) );
} );

function handle_stream_message( $request ) {
    $params = $request->get_json_params();
    $user = sanitize_text_field( $params['username'] );
    $message = sanitize_textarea_field( $params['message'] );
    $platform = sanitize_text_field( $params['platform'] );

    // 1. Check if you are Live (You can use a simple option toggle in WP)
    $is_live = get_option('my_stream_status'); 

    if ( $is_live == 'yes' ) {
        // CODE TO PUSH TO TWITCH IMMEDIATELY
        // (Uses a wp_remote_post to the Twitch API)
        return new WP_REST_Response( array('status' => 'Relayed to Twitch'), 200 );
    } else {
        // CODE TO SAVE TO DATABASE
        global $wpdb;
        $wpdb->insert('wp_offline_messages', array(
            'platform' => $platform,
            'user' => $user,
            'message' => $message,
            'time' => current_time('mysql')
        ));
        return new WP_REST_Response( array('status' => 'Saved for later'), 200 );
    }
}
