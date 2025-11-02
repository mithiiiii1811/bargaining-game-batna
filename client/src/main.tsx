import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./ui/App";
import "./index.css";
import { io } from "socket.io-client";

// Determine backend dynamically
const socket = io("https://bargaining-game-batna-2.onrender.com", {
  transports: ["websocket"],
});

// Export the socket globally so we can debug from the console
export const socket = io(backendURL, {
  transports: ["websocket"],
});


// Attach it to the window for debugging
// (This line ensures window.socket exists)
(window as any).socket = socket;

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
