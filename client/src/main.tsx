import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./ui/App";
import "./index.css";
import { io } from "socket.io-client";

const socket = io(
  import.meta.env.MODE === "development"
    ? "http://localhost:5174"
    : "https://bargaining-game-batna-2.onrender.com",
  {
    transports: ["websocket"],
  }
);

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

export { socket };
