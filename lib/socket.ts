import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const connectSocket = (userId: number) => {
  if (!socket) {
    socket = io("https://studentapp-dwvm.onrender.com", {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("Socket connected:", socket?.id);
      socket?.emit("join", userId);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });
    socket.on("connect_error", (err) => {
  console.log("Socket error:", err.message);
});

  }

  return socket;
};

export const getSocket = () => socket;
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

