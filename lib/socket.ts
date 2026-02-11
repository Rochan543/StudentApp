import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const connectSocket = (userId: number) => {
  if (!socket) {
    socket = io("http://localhost:5000", {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("Socket connected:", socket?.id);
      socket?.emit("join", userId);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });
  }

  return socket;
};

export const getSocket = () => socket;
