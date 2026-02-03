// SECTION 1: RELAY DATA (Called by GitHub/Node)
add_action( 'rest_api_init', function () {
    register_rest_route( 'stream-bridge/v1', '/relay', array(
        'methods' => 'POST',
        'callback' => 'werewolf_process_relay',
        'permission_callback' => '__return_true', 
    ));
});

function werewolf_process_relay( $request ) {
    $params = $request->get_json_params();
    // Update stream status if data is flowing
    update_option('my_stream_status', 'yes');
    return new WP_REST_Response(array('status' => 'synced'), 200);
}

// SECTION 2: AUTO-CHECK STATUS
add_action( 'werewolf_check_twitch_event', function() {
    $user_id = '896952944'; // werewolf3788
    // Check Twitch Helix API...
    // If live, update_option('my_stream_status', 'yes');
    // If offline, update_option('my_stream_status', 'no');
});
