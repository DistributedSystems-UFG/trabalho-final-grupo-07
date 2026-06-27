package com.trivia.user.kafka;

import java.util.List;

public record GameFinishedEvent(
        String roomId,
        String finishedAt,
        String theme,
        List<PlayerResult> results
) {

    public record PlayerResult(
            String playerId,
            String playerName,
            boolean isAnonymous,
            int score,
            int position,
            boolean won
    ) {
    }
}