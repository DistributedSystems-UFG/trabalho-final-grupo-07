CREATE TABLE questions (
    id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    theme          TEXT    NOT NULL,
    language       TEXT    NOT NULL DEFAULT 'pt-BR',
    text           TEXT    NOT NULL,
    option_a       TEXT    NOT NULL,
    option_b       TEXT    NOT NULL,
    option_c       TEXT    NOT NULL,
    option_d       TEXT    NOT NULL,
    correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('a', 'b', 'c', 'd'))
);

CREATE INDEX idx_questions_theme_language ON questions (theme, language);
