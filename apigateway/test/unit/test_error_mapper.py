"""
Validação do mapeamento gRPC StatusCode → exceção de domínio.
Artefato testado: app/mappers/error_mapper.py
"""

import grpc
import pytest

from app.exceptions import (
    AlreadyExistsError,
    FailedPreconditionError,
    InvalidArgumentError,
    NotFoundError,
    PermissionDeniedError,
    UnauthenticatedError,
    UpstreamUnavailableError,
)
from app.mappers.error_mapper import grpc_error_to_exception


class FakeRpcError(grpc.RpcError):
    def __init__(self, code: grpc.StatusCode, details: str = "error"):
        self._code = code
        self._details = details

    def code(self):    return self._code
    def details(self): return self._details


class TestErrorMapper:

    @pytest.mark.parametrize("grpc_code, expected_exc", [
        (grpc.StatusCode.INVALID_ARGUMENT,    InvalidArgumentError),
        (grpc.StatusCode.UNAUTHENTICATED,     UnauthenticatedError),
        (grpc.StatusCode.PERMISSION_DENIED,   PermissionDeniedError),
        (grpc.StatusCode.NOT_FOUND,           NotFoundError),
        (grpc.StatusCode.ALREADY_EXISTS,      AlreadyExistsError),
        (grpc.StatusCode.FAILED_PRECONDITION, FailedPreconditionError),
        (grpc.StatusCode.UNAVAILABLE,         UpstreamUnavailableError),
    ])
    def test_grpc_code_maps_to_exception(self, grpc_code, expected_exc):
        exc = grpc_error_to_exception(FakeRpcError(grpc_code, "detail"))
        assert isinstance(exc, expected_exc)
        assert exc.message == "detail"

    def test_unknown_grpc_code_maps_to_unavailable(self):
        exc = grpc_error_to_exception(FakeRpcError(grpc.StatusCode.INTERNAL))
        assert isinstance(exc, UpstreamUnavailableError)

    def test_resource_exhausted_also_maps_to_unavailable(self):
        exc = grpc_error_to_exception(FakeRpcError(grpc.StatusCode.RESOURCE_EXHAUSTED))
        assert isinstance(exc, UpstreamUnavailableError)