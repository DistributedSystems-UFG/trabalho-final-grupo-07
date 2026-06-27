package com.trivia.game.infra.questions;

public class ShardUnavailableException extends RuntimeException {
    public ShardUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
