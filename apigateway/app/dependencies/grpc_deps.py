"""
Dependências FastAPI para injeção dos clientes gRPC.
"""

from fastapi import Depends

from app.clients.channel_factory import get_game_channel, get_user_channel
from app.clients.game_service_client import GameServiceClient
from app.clients.user_service_client import UserServiceClient


def get_game_client() -> GameServiceClient:
    return GameServiceClient(get_game_channel())


def get_user_client() -> UserServiceClient:
    return UserServiceClient(get_user_channel())