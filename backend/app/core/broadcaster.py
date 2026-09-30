import asyncio
import time
from dataclasses import dataclass, field
from fastapi import WebSocket


@dataclass(eq=False)
class Client:
    socket: WebSocket
    role: str
    queue: asyncio.Queue = field(default_factory=lambda: asyncio.Queue(maxsize=128))
    task: asyncio.Task | None = None


class Broadcaster:
    """Each socket has its own bounded writer; slow consumers never stall GSI."""
    def __init__(self):
        self.clients: set[Client] = set()
        self.seq = 0

    def envelope(self, kind, payload):
        self.seq += 1
        return {'type': kind, 'seq': self.seq, 'ts': int(time.time() * 1000), 'payload': payload}

    def counts(self):
        return {role: sum(c.role == role for c in self.clients) for role in ('hud', 'control')}

    async def writer(self, client):
        try:
            while True:
                await asyncio.wait_for(client.socket.send_json(await client.queue.get()), timeout=2)
        except (Exception, asyncio.CancelledError):
            self.clients.discard(client)
            try:
                await client.socket.close()
            except Exception:
                pass

    def add(self, socket, role, snapshot):
        client = Client(socket, role)
        client.queue.put_nowait(self.envelope('snapshot', snapshot))
        self.clients.add(client)
        client.task = asyncio.create_task(self.writer(client))
        self.broadcast('clients', self.counts())
        return client

    def send(self, client, kind, payload):
        self.enqueue(client, self.envelope(kind, payload))

    def enqueue(self, client, message):
        try:
            client.queue.put_nowait(message)
        except asyncio.QueueFull:
            self.remove(client)

    def broadcast(self, kind, payload):
        message = self.envelope(kind, payload)
        for client in tuple(self.clients):
            self.enqueue(client, message)

    def remove(self, client):
        self.clients.discard(client)
        if client.task:
            client.task.cancel()

    async def close(self):
        tasks = [c.task for c in self.clients if c.task]
        for client in tuple(self.clients):
            self.remove(client)
        await asyncio.gather(*tasks, return_exceptions=True)
