// socket.io-client is loaded on demand (only for signed-in users), keeping it out of the first page load.
let socket = null;
let pending = null;

/** One shared Socket.IO connection per signed-in session. The session cookie authenticates it. */
export function connectSocket() {
  if (socket) return Promise.resolve(socket);
  if (!pending) {
    pending = import('socket.io-client').then(({ io }) => {
      socket = io({ path: '/socket.io', withCredentials: true, transports: ['websocket', 'polling'], reconnectionDelayMax: 8000 });
      return socket;
    });
  }
  return pending;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }
  socket = null;
  pending = null;
}
