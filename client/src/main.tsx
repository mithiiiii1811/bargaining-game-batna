import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./ui/App";
import "./index.css";
import { io } from "socket.io-client";

const backendURL =
  import.meta.env.MODE === "development"
    ? "http://localhost:5174"
    : "https://bargaining-game-batna-2.onrender.com";

export const socket = io(backendURL, {
  transports: ["websocket"],
});

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
