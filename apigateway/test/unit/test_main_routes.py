from starlette.routing import WebSocketRoute

from main import app


def test_gateway_registers_room_websocket_route():
    websocket_paths = {
        route.path
        for route in app.routes
        if isinstance(route, WebSocketRoute)
    }

    assert "/ws/rooms/{code}" in websocket_paths
