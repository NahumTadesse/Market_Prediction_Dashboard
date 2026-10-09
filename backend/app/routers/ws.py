from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.connections import manager
from app.quote_poller import market_status_message

router = APIRouter()


@router.websocket("/ws/quotes")
async def quotes_socket(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # New clients learn right away whether to expect live updates.
        await websocket.send_json(market_status_message())
        # Clients don't need to send anything, but waiting on receive is how we notice a disconnect.
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket)
