package com.trivia.user.repository;

import com.trivia.user.domain.UserStats;

import java.util.Optional;
import java.util.UUID;

public interface UserStatsRepository {

    Optional<UserStats> findByUserId(UUID userId);

    void insertEmptyStats(UUID userId);

    void applyGameResult(UUID userId, int position, int points, boolean won);

    boolean isGameProcessed(String roomId);

    void markGameProcessed(String roomId);
}