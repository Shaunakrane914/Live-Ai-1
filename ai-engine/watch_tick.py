"""
AegisGrid Pulse Check — watch_tick.py
Lightweight mock frontend that subscribes to the Node.js gateway (port 8000)
to verify the AI fee is dynamically adjusting before wiring to React.
"""
import asyncio
import socketio

sio = socketio.AsyncClient()


@sio.event
async def connect():
    print("✅ Connected to Node Gateway (Port 8000)")


@sio.event
async def simulation_tick(data):
    swap_fee_pct = data.get("swapFee", 0)
    imbalance = data.get("gridImbalance", 0)
    fee_bps = int(swap_fee_pct * 100)
    print(f"[LIVE TICK] Grid Imbalance: {imbalance:>8.2f} kW | AI Swap Fee: {fee_bps:>4} bps ({swap_fee_pct:.2f}%)")


@sio.event
async def disconnect():
    print("❌ Disconnected from Gateway")


async def main():
    await sio.connect("http://localhost:8000")
    await sio.wait()


if __name__ == "__main__":
    asyncio.run(main())
