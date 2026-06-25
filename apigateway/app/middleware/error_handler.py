from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.exceptions import GatewayError
from app.schemas.error_schemas import ErrorResponse


async def _gateway_error_handler(
    request: Request, exc: GatewayError
) -> JSONResponse:
    body = ErrorResponse(
        status=exc.status_code,
        error=exc.error_code,
        message=exc.message,
    )
    return JSONResponse(status_code=exc.status_code, content=body.model_dump())


async def _validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    first_error = exc.errors()[0]
    message = first_error.get("msg", "invalid request body")
    body = ErrorResponse(status=400, error="INVALID_ARGUMENT", message=message)
    return JSONResponse(status_code=400, content=body.model_dump())


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(GatewayError, _gateway_error_handler)
    app.add_exception_handler(RequestValidationError, _validation_error_handler)