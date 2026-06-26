"""
Validação dos schemas Pydantic (DTOs de request e response).
Artefatos testados: app/schemas/auth_schemas, room_schemas, user_schemas, error_schemas.
"""

import pytest
from pydantic import ValidationError

from app.schemas.auth_schemas import AuthResponse, LoginRequest, RegisterRequest
from app.schemas.error_schemas import ErrorResponse
from app.schemas.room_schemas import (
    CreateRoomRequest,
    RestartGameRequest,
    RoomStatus,
    Theme,
)
from app.schemas.user_schemas import UpdateUserRequest, UserStatsResponse


class TestAuthSchemas:

    def test_register_request_valid(self):
        r = RegisterRequest(name="alice", password="secret")
        assert r.name == "alice"

    def test_login_request_valid(self):
        r = LoginRequest(name="alice", password="secret")
        assert r.name == "alice"

    def test_auth_response_fields(self):
        r = AuthResponse(jwt="token.abc", user_id="uuid-1")
        assert r.jwt == "token.abc"
        assert r.user_id == "uuid-1"


class TestRoomSchemas:

    def test_create_room_valid(self):
        r = CreateRoomRequest(
            creator_id="uuid-1",
            creator_name="alice",
            is_anonymous=False,
            max_players=4,
            num_questions=10,
            theme=Theme.science,
        )
        assert r.theme == Theme.science

    def test_create_room_max_players_below_min(self):
        with pytest.raises(ValidationError):
            CreateRoomRequest(
                creator_id="uuid-1", creator_name="alice", is_anonymous=False,
                max_players=1, num_questions=10, theme=Theme.science,
            )

    def test_create_room_max_players_above_max(self):
        with pytest.raises(ValidationError):
            CreateRoomRequest(
                creator_id="uuid-1", creator_name="alice", is_anonymous=False,
                max_players=11, num_questions=10, theme=Theme.science,
            )

    def test_create_room_num_questions_below_min(self):
        with pytest.raises(ValidationError):
            CreateRoomRequest(
                creator_id="uuid-1", creator_name="alice", is_anonymous=False,
                max_players=4, num_questions=4, theme=Theme.science,
            )

    def test_create_room_invalid_theme(self):
        with pytest.raises(ValidationError):
            CreateRoomRequest(
                creator_id="uuid-1", creator_name="alice", is_anonymous=False,
                max_players=4, num_questions=10, theme="invalid_theme",
            )

    def test_restart_game_valid(self):
        r = RestartGameRequest(requester_id="uuid-1", new_theme=Theme.history)
        assert r.new_theme == Theme.history

    def test_room_status_values(self):
        assert RoomStatus.WAITING == "WAITING"
        assert RoomStatus.IN_PROGRESS == "IN_PROGRESS"
        assert RoomStatus.FINISHED == "FINISHED"

    def test_all_themes_valid(self):
        expected = {
            "music", "sport_and_leisure", "film_and_tv", "arts_and_literature",
            "history", "society_and_culture", "science", "geography",
            "food_and_drink", "general_knowledge",
        }
        assert {t.value for t in Theme} == expected

    def test_create_room_max_players_min_boundary(self):
        r = CreateRoomRequest(
            creator_id="uuid-1", creator_name="alice", is_anonymous=False,
            max_players=2, num_questions=5, theme=Theme.science,
        )
        assert r.max_players == 2

    def test_create_room_max_players_max_boundary(self):
        r = CreateRoomRequest(
            creator_id="uuid-1", creator_name="alice", is_anonymous=False,
            max_players=10, num_questions=5, theme=Theme.science,
        )
        assert r.max_players == 10

    def test_create_room_num_questions_min_boundary(self):
        r = CreateRoomRequest(
            creator_id="uuid-1", creator_name="alice", is_anonymous=False,
            max_players=4, num_questions=5, theme=Theme.science,
        )
        assert r.num_questions == 5

    def test_create_room_num_questions_max_boundary(self):
        r = CreateRoomRequest(
            creator_id="uuid-1", creator_name="alice", is_anonymous=False,
            max_players=4, num_questions=20, theme=Theme.science,
        )
        assert r.num_questions == 20


class TestUserSchemas:

    def test_update_user_only_name(self):
        r = UpdateUserRequest(name="bob")
        assert r.name == "bob"
        assert r.password is None

    def test_update_user_only_password(self):
        r = UpdateUserRequest(password="newpass")
        assert r.password == "newpass"

    def test_update_user_both_none(self):
        r = UpdateUserRequest()
        assert r.name is None and r.password is None

    def test_user_stats_response(self):
        r = UserStatsResponse(
            games_played=10, avg_position=2.5,
            avg_points=47.3, highest_score=80, games_won=3,
        )
        assert r.games_played == 10