package com.trivia.game.infra.questions;

import com.trivia.game.domain.Question;
import com.trivia.game.domain.Theme;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;

@Repository
public class QuestionRepository {
    private static final String AVAILABILITY_QUERY = "SELECT 1";
    private static final String RANDOM_QUESTIONS_QUERY = """
            SELECT id, text, option_a, option_b, option_c, option_d, correct_option
            FROM questions
            WHERE theme = ?
            ORDER BY RANDOM()
            LIMIT ?
            """;

    private final JdbcTemplate shardA;
    private final JdbcTemplate shardB;

    public QuestionRepository(
            @Qualifier("shardAJdbcTemplate") JdbcTemplate shardA,
            @Qualifier("shardBJdbcTemplate") JdbcTemplate shardB
    ) {
        this.shardA = shardA;
        this.shardB = shardB;
    }

    public boolean isAvailable(Theme theme) {
        try {
            jdbcFor(theme).queryForObject(AVAILABILITY_QUERY, Integer.class);
            return true;
        } catch (DataAccessException exception) {
            return false;
        }
    }

    public List<Question> randomQuestions(Theme theme, int limit) {
        try {
            return jdbcFor(theme).query(RANDOM_QUESTIONS_QUERY, this::question, theme.value(), limit);
        } catch (DataAccessException exception) {
            throw new ShardUnavailableException("Question shard unavailable for theme " + theme.value(), exception);
        }
    }

    private JdbcTemplate jdbcFor(Theme theme) {
        return switch (theme.shard()) {
            case A -> shardA;
            case B -> shardB;
        };
    }

    private Question question(ResultSet rs, int rowNum) throws SQLException {
        return new Question(
                UUID.fromString(rs.getString("id")),
                rs.getString("text"),
                rs.getString("option_a"),
                rs.getString("option_b"),
                rs.getString("option_c"),
                rs.getString("option_d"),
                rs.getString("correct_option")
        );
    }
}
