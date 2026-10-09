from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.connections import manager

router = APIRouter()


@router.websocket("/ws/markets")
async def markets_socket(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Clients don't need to send anything, but waiting on receive is how we notice a disconnect.
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket)
