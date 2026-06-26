"""
Validação de app/services/identity_guard.py.
"""

import pytest

from app.exceptions import InvalidArgumentError, PermissionDeniedError
from app.services.identity_guard import ensure_identity

# UUID v4 válido para uso nos testes
VALID_UUID = "550e8400-e29b-41d4-a716-446655440000"
VALID_ANON = f"anon:{VALID_UUID}"


# ── Autenticado (jwt_user_id presente) ───────────────────────────────────────

class TestAuthenticated:

    def test_matching_identity_returns_id(self):
        result = ensure_identity("uid-1", "uid-1")
        assert result == "uid-1"

    def test_divergent_identity_raises(self):
        with pytest.raises(PermissionDeniedError):
            ensure_identity("uid-1", "uid-2")

    def test_divergent_identity_message(self):
        with pytest.raises(PermissionDeniedError) as exc_info:
            ensure_identity("uid-1", "uid-2")
        assert "uid-1" in exc_info.value.message

    def test_divergent_anon_id_raises(self):
        """JWT presente não aceita client_provided_id no formato anon:."""
        with pytest.raises(PermissionDeniedError):
            ensure_identity("uid-1", VALID_ANON)


# ── Anônimo (jwt_user_id ausente) ────────────────────────────────────────────

class TestAnonymous:

    def test_valid_anon_returns_id(self):
        result = ensure_identity(None, VALID_ANON)
        assert result == VALID_ANON

    def test_invalid_anon_no_prefix_raises(self):
        with pytest.raises(InvalidArgumentError):
            ensure_identity(None, VALID_UUID)

    def test_invalid_anon_wrong_prefix_raises(self):
        with pytest.raises(InvalidArgumentError):
            ensure_identity(None, f"user:{VALID_UUID}")

    def test_invalid_anon_malformed_uuid_raises(self):
        with pytest.raises(InvalidArgumentError):
            ensure_identity(None, "anon:nao-e-um-uuid")

    def test_invalid_anon_empty_raises(self):
        with pytest.raises(InvalidArgumentError):
            ensure_identity(None, "")

    def test_invalid_anon_message(self):
        with pytest.raises(InvalidArgumentError) as exc_info:
            ensure_identity(None, "formato-errado")
        assert "anon:{uuid}" in exc_info.value.message