import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./ui/App";
import "./index.css";
import { io } from "socket.io-client";

// ✅ Create a single socket connected to your Render backend
export const socket = io("https://bargaining-game-batna-2.onrender.com", {
  transports: ["websocket"],
});

// ✅ Expose to window for debugging (optional)
(window as any).socket = socket;

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
