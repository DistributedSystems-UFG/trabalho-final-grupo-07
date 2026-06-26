"""
Cliente gRPC do Game Service.

Responsabilidades:
- Encapsular os stubs gerados em app/clients/generated/
- Converter grpc.RpcError em exceção de domínio via error_mapper
- Mapear mensagens proto → schemas Python já definidos em room_schemas
- Retornar tipos tipados ao chamador, a camada de serviço não conhece detalhes de gRPC

"""

import grpc.aio

from app.clients.generated import game_pb2, game_pb2_grpc
from app.mappers.error_mapper import grpc_error_to_exception
from app.schemas.room_schemas import (
    GetRoomResponse,
    JoinRoomResponse,
    PlayerSchema,
    RoomStatus,
    Theme,
)

_PROTO_TO_STATUS = {
    game_pb2.WAITING:     RoomStatus.WAITING,
    game_pb2.IN_PROGRESS: RoomStatus.IN_PROGRESS,
    game_pb2.FINISHED:    RoomStatus.FINISHED,
}


def _map_player(p: game_pb2.Player) -> PlayerSchema:
    return PlayerSchema(
        player_id=p.player_id,
        player_name=p.player_name,
        is_anonymous=p.is_anonymous,
        score=p.score,
    )


class GameServiceClient:

    def __init__(self, channel: grpc.aio.Channel) -> None:
        self._stub = game_pb2_grpc.GameServiceStub(channel)

    async def create_room(
        self,
        creator_id: str,
        creator_name: str,
        is_anonymous: bool,
        max_players: int,
        num_questions: int,
        theme: Theme,
    ) -> str:
        #CreateRoom: retorna room_code gerado pelo Game Service
        try:
            r = await self._stub.CreateRoom(
                game_pb2.CreateRoomRequest(
                    creator_id=creator_id,
                    creator_name=creator_name,
                    is_anonymous=is_anonymous,
                    max_players=max_players,
                    num_questions=num_questions,
                    theme=theme.value,
                )
            )
            return r.room_code
        except grpc.RpcError as e:
            raise grpc_error_to_exception(e)

    async def join_room(
        self,
        room_code: str,
        player_id: str,
        player_name: str,
        is_anonymous: bool,
    ) -> JoinRoomResponse:
        #JoinRoom:  retorna estado atual da sala após entrada do jogador
        try:
            r = await self._stub.JoinRoom(
                game_pb2.JoinRoomRequest(
                    room_code=room_code,
                    player_id=player_id,
                    player_name=player_name,
                    is_anonymous=is_anonymous,
                )
            )
            return JoinRoomResponse(
                players=[_map_player(p) for p in r.players],
                status=_PROTO_TO_STATUS[r.status],
                theme=Theme(r.theme),
                max_players=r.max_players,
                creator_id=r.creator_id,
                num_questions=r.num_questions,
            )
        except grpc.RpcError as e:
            raise grpc_error_to_exception(e)

    async def start_game(self, room_code: str, requester_id: str) -> bool:
        #StartGame: levanta PermissionDeniedError se requester não for o criador
        try:
            r = await self._stub.StartGame(
                game_pb2.StartGameRequest(
                    room_code=room_code,
                    requester_id=requester_id,
                )
            )
            return r.started
        except grpc.RpcError as e:
            raise grpc_error_to_exception(e)

    async def restart_game(
        self,
        room_code: str,
        requester_id: str,
        new_theme: Theme,
    ) -> bool:
       #RestartGame: sala deve estar FINISHED e requester deve ser o criador
        try:
            r = await self._stub.RestartGame(
                game_pb2.RestartGameRequest(
                    room_code=room_code,
                    requester_id=requester_id,
                    new_theme=new_theme.value,
                )
            )
            return r.started
        except grpc.RpcError as e:
            raise grpc_error_to_exception(e)

    async def get_room(self, room_code: str) -> GetRoomResponse:
        
        #GetRoom: usa este RPC para servir GET /rooms/{code} sem acessar o Redis diretamente
        
        try:
            r = await self._stub.GetRoom(
                game_pb2.GetRoomRequest(room_code=room_code)
            )
            return GetRoomResponse(
                room_code=r.room_code,
                status=_PROTO_TO_STATUS[r.status],
                theme=Theme(r.theme),
                max_players=r.max_players,
                num_questions=r.num_questions,
                players=[_map_player(p) for p in r.players],
                creator_id=r.creator_id,
            )
        except grpc.RpcError as e:
            raise grpc_error_to_exception(e)