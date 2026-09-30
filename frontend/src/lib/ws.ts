import { useStore } from './store';
export function connect(role: 'hud' | 'control') {
  let socket: WebSocket;
  let stopped = false, retry = 0, seq = -1, lastPong = Date.now();
  let reconnect: ReturnType<typeof setTimeout>;
  let heartbeat: ReturnType<typeof setInterval>;
  function open() {
    socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws?role=${role}`);
    socket.onopen = () => {
      retry = 0; seq = -1; lastPong = Date.now();
      heartbeat = setInterval(() => {
        if (Date.now() - lastPong > 30000) { socket.close(); return; }
        if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'ping', payload: {} }));
      }, 10000);
    };
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.seq < seq) return;
      seq = message.seq;
      const payload = message.payload;
      // Server timestamps remove queued/snapshot age without relying on synchronized clocks.
      const receivedAt = performance.now() - Math.max(0, message.ts - (payload.state?.last_update_ms ?? payload.last_update_ms ?? message.ts));
      switch (message.type) {
        case 'snapshot': useStore.setState({ ...payload, connected: true, receivedAt }); break;
        case 'state': useStore.setState({ state: payload, receivedAt }); break;
        case 'layout': useStore.setState({ layout: payload }); break;
        case 'teams': useStore.setState({ teams: payload }); break;
        case 'clients': useStore.setState({ clients: payload }); break;
        case 'gsi_status': useStore.setState(s => ({ state: s.state ? { ...s.state, gsi_online: payload.online, last_update_ms: payload.last_update_ms } : null })); break;
        case 'pong': lastPong = Date.now(); break;
      }
    };
    socket.onerror = () => socket.close();
    socket.onclose = () => {
      clearInterval(heartbeat);
      useStore.setState({ connected: false });
      if (!stopped) reconnect = setTimeout(open, Math.min(1000 * 2 ** retry++, 5000));
    };
  }
  open();
  return () => { stopped = true; clearTimeout(reconnect); clearInterval(heartbeat); socket.close(); useStore.setState({ connected: false }); };
}
