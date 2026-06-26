"""
Validação do middleware de tratamento de erros.
Artefato testado: app/middleware/error_handler.py
Garante que exceções de domínio e erros não tratados produzem
JSONResponse 
"""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.exceptions import (
    AlreadyExistsError,
    FailedPreconditionError,
    InvalidArgumentError,
    NotFoundError,
    PermissionDeniedError,
    UnauthenticatedError,
    UpstreamUnavailableError,
)
from app.middleware.error_handler import register_exception_handlers
from app.schemas.error_schemas import ErrorResponse


@pytest.fixture(scope="module")
def client():
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/err/{code}")
    def raise_error(code: str):
        errors = {
            "invalid":     InvalidArgumentError("bad input"),
            "unauth":      UnauthenticatedError("not authenticated"),
            "forbidden":   PermissionDeniedError("forbidden"),
            "notfound":    NotFoundError("not found"),
            "exists":      AlreadyExistsError("already exists"),
            "precond":     FailedPreconditionError("wrong state"),
            "unavailable": UpstreamUnavailableError("upstream down"),
        }
        raise errors[code]

    return TestClient(app, raise_server_exceptions=False)


class TestErrorHandler:

    @pytest.mark.parametrize("path, expected_status, expected_error", [
        ("/err/invalid",     400, "INVALID_ARGUMENT"),
        ("/err/unauth",      401, "UNAUTHENTICATED"),
        ("/err/forbidden",   403, "PERMISSION_DENIED"),
        ("/err/notfound",    404, "NOT_FOUND"),
        ("/err/exists",      409, "ALREADY_EXISTS"),
        ("/err/precond",     409, "FAILED_PRECONDITION"),
        ("/err/unavailable", 503, "UNAVAILABLE"),
    ])
    def test_response_format(self, client, path, expected_status, expected_error):
        r = client.get(path)
        assert r.status_code == expected_status
        parsed = ErrorResponse(**r.json())
        assert parsed.status == expected_status
        assert parsed.error == expected_error

    def test_pydantic_validation_returns_400(self, client):
        """RequestValidationError (422 padrão do FastAPI) deve ser convertido para 400."""
        app = FastAPI()
        register_exception_handlers(app)

        @app.get("/typed")
        def typed_endpoint(value: int):
            return {"value": value}

        c = TestClient(app, raise_server_exceptions=False)
        r = c.get("/typed?value=not_an_int")
        assert r.status_code == 400
        assert r.json()["error"] == "INVALID_ARGUMENT"

    def test_unhandled_exception_returns_500(self, client):
        """Exceção não mapeada deve retornar 500 no formato §7."""
        app = FastAPI()
        register_exception_handlers(app)

        @app.get("/boom")
        def boom():
            raise RuntimeError("unexpected error")

        c = TestClient(app, raise_server_exceptions=False)
        r = c.get("/boom")
        assert r.status_code == 500
        parsed = ErrorResponse(**r.json())
        assert parsed.status == 500
        assert parsed.error == "INTERNAL_SERVER_ERROR"