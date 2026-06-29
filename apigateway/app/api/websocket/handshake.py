"""
Handshake WebSocket - valida JWT e identidade antes de abrir conexão upstream.

Ordem de operações (conforme contrato documentado):
  1. Aceita a conexão WebSocket do cliente
  2. Lê o frame STOMP CONNECT
  3. Valida JWT (se presente) via core/security
  4. Aplica ensure_identity  rejeita aqui, antes de abrir upstream
  5. Retorna HandshakeResult com frame CONNECT traduzido para o upstream

"""

import json
from dataclasses import dataclass

from fastapi import WebSocket

from app.core.security import decode_jwt
from app.exceptions import InvalidArgumentError, PermissionDeniedError, UnauthenticatedError
from app.services.identity_guard import ensure_identity

SUPPORTED_STOMP_SUBPROTOCOLS = ("v12.stomp", "v11.stomp", "v10.stomp")


@dataclass(frozen=True)
class HandshakeResult:
    """Dados validados do handshake, prontos para abrir a conexão upstream."""
    player_id: str
    room_code: str
    authenticated: bool
    upstream_connect_frame: str  # frame STOMP CONNECT com headers traduzidos 


def _parse_stomp_headers(raw: str) -> dict[str, str]:
    """
    Extrai os headers do frame STOMP CONNECT.
    Formato STOMP: COMMAND\\nkey:value\\n...\\n\\nbody\\0
    """
    headers: dict[str, str] = {}
    lines = raw.split('\n')
    for line in lines[1:]:   # pula a primeira linha (comando)
        line = line.rstrip('\r')
        if line == '' or line == '\x00':
            break            # linha vazia separa headers do body
        if ':' in line:
            key, _, value = line.partition(':')
            headers[key] = value
    return headers


def _build_stomp_connect(headers: dict[str, str]) -> str:
    """Monta um frame STOMP CONNECT a partir de um dicionário de headers."""
    frame = 'CONNECT\n'
    for key, value in headers.items():
        frame += f'{key}:{value}\n'
    frame += '\n\x00'
    return frame


def _select_stomp_subprotocol(websocket: WebSocket) -> str | None:
    """Escolhe um subprotocolo STOMP oferecido pelo cliente WebSocket."""
    try:
        requested = websocket.headers.get("sec-websocket-protocol", "")
    except AttributeError:
        return None

    if not isinstance(requested, str):
        return None

    offered = {protocol.strip() for protocol in requested.split(",") if protocol.strip()}
    for protocol in SUPPORTED_STOMP_SUBPROTOCOLS:
        if protocol in offered:
            return protocol

    return None


def _error_frame(code: str, message: str) -> str:
    """
    Frame de erro enviado como mensagem de texto WebSocket antes de fechar a conexão.
    """
    return json.dumps({"type": "error", "code": code, "message": message})


async def perform_handshake(websocket: WebSocket) -> HandshakeResult | None:
    """
    Executa o handshake WebSocket 
    Retorna HandshakeResult se JWT e identidade forem válidos.
    Retorna None se a conexão foi rejeitada — frame de erro já enviado
    e conexão já fechada antes de retornar.
    """
    await websocket.accept(subprotocol=_select_stomp_subprotocol(websocket))

    # lê o frame STOMP CONNECT enviado pelo cliente
    raw = await websocket.receive_text()

    headers = _parse_stomp_headers(raw)

    player_id    = headers.get('player-id', '')
    room_code    = headers.get('room-code', '')
    authorization = headers.get('authorization', '')

    # valida JWT se presente
    jwt_user_id: str | None = None
    authenticated = False

    if authorization:
        token = authorization.removeprefix('Bearer ').strip()
        try:
            claims = decode_jwt(token)
            jwt_user_id = claims.user_id
            authenticated = True
        except UnauthenticatedError:
            await websocket.send_text(
                _error_frame("UNAUTHENTICATED", "Token inválido ou expirado")
            )
            await websocket.close()
            return None

    # integridade de identidade (antes de abrir upstream)
    # ensure_identity levanta PermissionDeniedError em caso de mismatch JWT vs player-id.
    # No contexto WebSocket, esse erro é traduzido para o frame PLAYER_ID_MISMATCH 
    try:
        player_id = ensure_identity(jwt_user_id, player_id)
    except PermissionDeniedError:
        await websocket.send_text(
            _error_frame("PLAYER_ID_MISMATCH", "player-id diverge do sub do JWT")
        )
        await websocket.close()
        return None
    except InvalidArgumentError as e:
        await websocket.send_text(
            _error_frame("INVALID_ARGUMENT", str(e))
        )
        await websocket.close()
        return None

    # monta frame CONNECT traduzido: remove authorization, preserva os headers
    # STOMP de protocolo e acrescenta a identidade validada para o Game Service.
    upstream_headers = {
        'accept-version': headers.get('accept-version', '1.2'),
        'heart-beat':    headers.get('heart-beat', '0,0'),
        'player-id':     player_id,
        'room-code':     room_code,
        'authenticated': str(authenticated).lower(),  # "true" ou "false"
    }
    if host := headers.get('host'):
        upstream_headers['host'] = host

    return HandshakeResult(
        player_id=player_id,
        room_code=room_code,
        authenticated=authenticated,
        upstream_connect_frame=_build_stomp_connect(upstream_headers),
    )
