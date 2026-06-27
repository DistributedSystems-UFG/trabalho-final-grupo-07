package com.trivia.game.infra.questions;

import com.trivia.game.domain.Question;
import com.trivia.game.domain.Theme;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.sql.ResultSet;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class QuestionRepositoryTest {
    private final JdbcTemplate shardA = mock(JdbcTemplate.class);
    private final JdbcTemplate shardB = mock(JdbcTemplate.class);
    private final QuestionRepository repository = new QuestionRepository(shardA, shardB);

    @Test
    void checksAvailabilityOnTheThemeShard() {
        when(shardB.queryForObject(anyString(), eq(Integer.class))).thenReturn(1);

        assertTrue(repository.isAvailable(Theme.MUSIC));
        verifyNoInteractions(shardA);
    }

    @Test
    void marksShardUnavailableWhenAvailabilityQueryFails() {
        when(shardA.queryForObject(anyString(), eq(Integer.class)))
                .thenThrow(new DataAccessResourceFailureException("down"));

        assertFalse(repository.isAvailable(Theme.SCIENCE));
    }

    @Test
    @SuppressWarnings("unchecked")
    void fetchesRandomQuestionsFromTheThemeShardAndMapsRows() throws Exception {
        UUID questionId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        when(shardA.query(anyString(), any(RowMapper.class), eq("science"), eq(1)))
                .thenAnswer(invocation -> {
                    RowMapper<Question> mapper = invocation.getArgument(1);
                    ResultSet row = mock(ResultSet.class);
                    when(row.getString("id")).thenReturn(questionId.toString());
                    when(row.getString("text")).thenReturn("Question?");
                    when(row.getString("option_a")).thenReturn("A");
                    when(row.getString("option_b")).thenReturn("B");
                    when(row.getString("option_c")).thenReturn("C");
                    when(row.getString("option_d")).thenReturn("D");
                    when(row.getString("correct_option")).thenReturn("b");
                    return List.of(mapper.mapRow(row, 0));
                });

        List<Question> questions = repository.randomQuestions(Theme.SCIENCE, 1);

        assertEquals(1, questions.size());
        assertEquals(questionId, questions.get(0).id());
        assertEquals("Question?", questions.get(0).text());
        assertEquals("b", questions.get(0).correctOption());
        verifyNoInteractions(shardB);
    }

    @Test
    @SuppressWarnings("unchecked")
    void throwsShardUnavailableWhenQuestionQueryFails() {
        when(shardB.query(anyString(), any(RowMapper.class), eq("music"), eq(5)))
                .thenThrow(new DataAccessResourceFailureException("down"));

        assertThrows(ShardUnavailableException.class, () -> repository.randomQuestions(Theme.MUSIC, 5));
    }
}
