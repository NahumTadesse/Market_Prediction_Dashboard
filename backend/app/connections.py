from fastapi import WebSocket


class ConnectionManager:
    """Keeps the set of open WebSocket connections and sends messages to all of them."""

    def __init__(self) -> None:
        self.active: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self.active.discard(websocket)

    async def broadcast(self, message: dict) -> None:
        # Iterate over a copy: clients can disconnect while we are awaiting a send.
        for websocket in list(self.active):
            try:
                await websocket.send_json(message)
            except Exception:
                # The client went away without a clean close; stop sending to it.
                self.disconnect(websocket)


# One shared instance for the whole app, used by the WebSocket route and the simulator.
manager = ConnectionManager()
