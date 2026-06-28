package com.trivia.user.kafka;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record GameFinishedEvent(
        @JsonProperty("room_code") String roomId,
        @JsonProperty("finished_at") String finishedAt,
        String theme,
        List<PlayerResult> results
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PlayerResult(
            @JsonProperty("player_id") String playerId,
            @JsonProperty("player_name") String playerName,
            @JsonProperty("is_anonymous") boolean isAnonymous,
            int score,
            int position,
            boolean won
    ) {
    }
}