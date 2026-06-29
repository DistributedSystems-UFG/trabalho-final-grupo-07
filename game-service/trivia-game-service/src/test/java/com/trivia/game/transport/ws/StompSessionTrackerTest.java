package com.trivia.game.transport.ws;

import com.trivia.game.application.GameCoordinator;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class StompSessionTrackerTest {
    private static final String SESSION_ID = "session-1";
    private static final String ROOM_CODE = "ROOM01";
    private static final String PLAYER_ID = "player-1";

    private final GameCoordinator games = mock(GameCoordinator.class);
    private final StompSessionTracker tracker = new StompSessionTracker(games);

    @Test
    void connectStoresSessionAndSetsPrincipal() {
        when(games.canConnect(ROOM_CODE, PLAYER_ID)).thenReturn(true);

        Message<?> connected = tracker.handleInbound(connectMessage());
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(connected);

        assertNotNull(accessor.getUser());
        assertEquals(PLAYER_ID, accessor.getUser().getName());
    }

    @Test
    void sendRestoresPrincipalFromConnectedSession() {
        when(games.canConnect(ROOM_CODE, PLAYER_ID)).thenReturn(true);
        tracker.handleInbound(connectMessage());

        Message<?> restored = tracker.handleInbound(sendMessage());
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(restored);

        assertNotNull(accessor.getUser());
        assertEquals(PLAYER_ID, accessor.getUser().getName());
    }

    private static Message<byte[]> connectMessage() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setSessionId(SESSION_ID);
        accessor.addNativeHeader("player-id", PLAYER_ID);
        accessor.addNativeHeader("room-code", ROOM_CODE);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private static Message<byte[]> sendMessage() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SEND);
        accessor.setSessionId(SESSION_ID);
        accessor.setDestination("/app/rooms/" + ROOM_CODE + "/answer");
        return MessageBuilder.createMessage("""
                {"type":"answer","question_id":"00000000-0000-0000-0000-000000000000","option":"a"}
                """.getBytes(java.nio.charset.StandardCharsets.UTF_8), accessor.getMessageHeaders());
    }
}
