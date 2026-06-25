"""
Tradução canônica de erros gRPC → exceção de domínio do Gateway.
"""

import grpc

from app.exceptions import (
    AlreadyExistsError,
    FailedPreconditionError,
    GatewayError,
    InvalidArgumentError,
    NotFoundError,
    PermissionDeniedError,
    UnauthenticatedError,
    UpstreamUnavailableError,
)


_GRPC_TO_EXCEPTION: dict[grpc.StatusCode, type[GatewayError]] = {
    grpc.StatusCode.INVALID_ARGUMENT:    InvalidArgumentError,
    grpc.StatusCode.UNAUTHENTICATED:     UnauthenticatedError,
    grpc.StatusCode.PERMISSION_DENIED:   PermissionDeniedError,
    grpc.StatusCode.NOT_FOUND:           NotFoundError,
    grpc.StatusCode.ALREADY_EXISTS:      AlreadyExistsError,
    grpc.StatusCode.FAILED_PRECONDITION: FailedPreconditionError,
    grpc.StatusCode.UNAVAILABLE:         UpstreamUnavailableError,
}


def grpc_error_to_exception(exc: grpc.RpcError) -> GatewayError:
    """
    Converte grpc.RpcError na exceção de domínio correspondente.
    Códigos não mapeados são tratados como UNAVAILABLE (503).
    """
    code = exc.code()
    message = exc.details() or str(code)
    exc_class = _GRPC_TO_EXCEPTION.get(code, UpstreamUnavailableError)
    return exc_class(message)