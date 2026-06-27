package com.trivia.user.kafka;

import com.trivia.user.repository.UserStatsRepository;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Component
public class GameFinishedConsumer {

    private final UserStatsRepository userStatsRepository;

    public GameFinishedConsumer(UserStatsRepository userStatsRepository) {
        this.userStatsRepository = userStatsRepository;
    }

    @KafkaListener(topics = "game-finished", groupId = "user-service-group")
    public void onGameFinished(GameFinishedEvent event, Acknowledgment acknowledgment) {
        processEvent(event);
        acknowledgment.acknowledge();
    }

    @Transactional("primaryTransactionManager")
    public void processEvent(GameFinishedEvent event) {
        if (userStatsRepository.isGameProcessed(event.roomId())) {
            return;
        }

        for (GameFinishedEvent.PlayerResult result : event.results()) {
            if (result.isAnonymous() || result.playerId().startsWith("anon:")) {
                continue;
            }

            UUID userId = UUID.fromString(result.playerId());
            userStatsRepository.applyGameResult(
                    userId,
                    result.position(),
                    result.score(),
                    result.won()
            );
        }

        userStatsRepository.markGameProcessed(event.roomId());
    }
}