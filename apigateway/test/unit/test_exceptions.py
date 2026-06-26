"""
Validação da hierarquia de exceções de domínio.
Artefato testado: app/exceptions/
"""

import pytest

from app.exceptions import (
    AlreadyExistsError,
    FailedPreconditionError,
    GatewayError,
    InvalidArgumentError,
    NotFoundError,
    PermissionDeniedError,
    PlayerIdMismatchError,
    UnauthenticatedError,
    UpstreamUnavailableError,
)


class TestExceptions:

    @pytest.mark.parametrize("exc_class, expected_status, expected_code", [
        (InvalidArgumentError,     400, "INVALID_ARGUMENT"),
        (UnauthenticatedError,     401, "UNAUTHENTICATED"),
        (PermissionDeniedError,    403, "PERMISSION_DENIED"),
        (PlayerIdMismatchError,    403, "PLAYER_ID_MISMATCH"),
        (NotFoundError,            404, "NOT_FOUND"),
        (AlreadyExistsError,       409, "ALREADY_EXISTS"),
        (FailedPreconditionError,  409, "FAILED_PRECONDITION"),
        (UpstreamUnavailableError, 503, "UNAVAILABLE"),
    ])
    def test_status_and_code(self, exc_class, expected_status, expected_code):
        exc = exc_class("test message")
        assert exc.status_code == expected_status
        assert exc.error_code == expected_code
        assert exc.message == "test message"

    def test_all_are_gateway_errors(self):
        for cls in [
            InvalidArgumentError, UnauthenticatedError, PermissionDeniedError,
            PlayerIdMismatchError, NotFoundError, AlreadyExistsError,
            FailedPreconditionError, UpstreamUnavailableError,
        ]:
            assert issubclass(cls, GatewayError)

    def test_player_id_mismatch_is_permission_denied(self):
        assert issubclass(PlayerIdMismatchError, PermissionDeniedError)