import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function connectSocket(token: string) {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000", {
      autoConnect: false,
    });
  }

  socket.auth = {
    token,
  };

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
