
import express, { Request, Response } from "express";
const app = express();


//import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { stringify } from "csv-stringify/sync";

const PORT = 5174;

type GroupId = 1 | 2 | 3;
type Role = "seller" | "buyer";

type BATNAs = { seller: number; buyer: number };
const GROUPS: Record<GroupId, BATNAs> = {
  1: { seller: 50, buyer: 50 },
  2: { seller: 70, buyer: 30 },
  3: { seller: 30, buyer: 70 },
};

// In-memory state (demo purposes)
const waitingQueues: Record<GroupId, string[]> = { 1: [], 2: [], 3: [] };
const socketsGroup: Map<string, GroupId> = new Map();
const socketsRoom: Map<string, string> = new Map();
const socketsRole: Map<string, Role> = new Map();

type OfferEvent = { t: number; actor: Role; price: number };
type SessionLog = {
  pairId: string;
  group: GroupId;
  startTs: number;
  endTs?: number;
  sellerSocket: string;
  buyerSocket: string;
  result?: {
    deal: boolean;
    price?: number;
    timeout: boolean;
    sellerPayoff?: number;
    buyerPayoff?: number;
  };
  offers: OfferEvent[];
};

const sessions: Record<string, SessionLog> = {};

const app = express();
app.use(cors());

app.get("/", (_req: Request, res: Response) => {
  res.send("Server running");
});


app.get("/admin/export", (_req, res) => {
  // Export all sessions to CSV
  const rows: any[] = [[
    "pair_id","group","start_ts","end_ts","deal","price","timeout",
    "seller_payoff","buyer_payoff","offers_json"
  ]];
  for (const sess of Object.values(sessions)) {
    const deal = sess.result?.deal ?? false;
    const price = sess.result?.price ?? "";
    const timeout = sess.result?.timeout ?? false;
    const sp = sess.result?.sellerPayoff ?? "";
    const bp = sess.result?.buyerPayoff ?? "";
    rows.push([
      sess.pairId, sess.group, sess.startTs, sess.endTs ?? "", deal, price, timeout, sp, bp,
      JSON.stringify(sess.offers)
    ]);
  }
  const csv = stringify(rows);
  res.header("Content-Type","text/csv");
  res.attachment("batna_sessions.csv");
  res.send(csv);
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

function pairPlayers(group: GroupId) {
  const q = waitingQueues[group];
  if (q.length >= 2) {
    const a = q.shift()!;
    const b = q.shift()!;
    const pairId = `pair_${group}_${Date.now()}_${Math.floor(Math.random()*9999)}`;

    // Randomly assign roles
    const roles: Role[] = Math.random() < 0.5 ? ["seller","buyer"] : ["buyer","seller"];
    const [roleA, roleB] = roles;

    const room = pairId;
    (io.sockets.sockets.get(a)!).join(room);
    (io.sockets.sockets.get(b)!).join(room);
    socketsRoom.set(a, room);
    socketsRoom.set(b, room);
    socketsRole.set(a, roleA);
    socketsRole.set(b, roleB);

    const sellerSock = roleA === "seller" ? a : b;
    const buyerSock  = roleA === "seller" ? b : a;

    const sess: SessionLog = {
      pairId, group, startTs: Date.now(),
      sellerSocket: sellerSock, buyerSocket: buyerSock, offers: []
    };
    sessions[pairId] = sess;

    // Send private BATNAs
    const bats = GROUPS[group];
    io.to(a).emit("assigned", { pairId, group, role: roleA, batna: roleA === "seller" ? bats.seller : bats.buyer });
    io.to(b).emit("assigned", { pairId, group, role: roleB, batna: roleB === "seller" ? bats.seller : bats.buyer });

    io.to(room).emit("status", { msg: "paired", pairId });
  }
}

io.on("connection", (socket) => {
  // Client selects a group then waits
  socket.on("joinGroup", (group: GroupId) => {
    socketsGroup.set(socket.id, group);
    waitingQueues[group].push(socket.id);
    pairPlayers(group);
  });

  socket.on("offer", (payload: { price: number }) => {
    const room = socketsRoom.get(socket.id);
    if (!room) return;
    const role = socketsRole.get(socket.id);
    if (!role) return;
    const sess = sessions[room];
    if (!sess) return;
    const evt: OfferEvent = { t: Date.now(), actor: role, price: payload.price };
    sess.offers.push(evt);
    io.to(room).emit("offer", { role, price: payload.price, t: evt.t });
  });

  socket.on("accept", (payload: { price: number }) => {
    const room = socketsRoom.get(socket.id);
    if (!room) return;
    const sess = sessions[room];
    if (!sess || sess.result) return;
    const bats = GROUPS[sess.group];
    // Price that was accepted decides payoffs
    const p = payload.price;
    sess.result = {
      deal: true,
      price: p,
      timeout: false,
      sellerPayoff: p,
      buyerPayoff: 100 - p,
    };
    sess.endTs = Date.now();
    io.to(room).emit("done", { deal: true, price: p });
  });

  socket.on("timeout", () => {
    const room = socketsRoom.get(socket.id);
    if (!room) return;
    const sess = sessions[room];
    if (!sess || sess.result) return;
    const bats = GROUPS[sess.group];
    sess.result = {
      deal: false,
      timeout: true,
      sellerPayoff: bats.seller,
      buyerPayoff: bats.buyer,
    };
    sess.endTs = Date.now();
    io.to(room).emit("done", { deal: false });
  });

  socket.on("disconnect", () => {
    const group = socketsGroup.get(socket.id);
    if (group) {
      // remove from queue if waiting
      const q = waitingQueues[group];
      const idx = q.indexOf(socket.id);
      if (idx >= 0) q.splice(idx, 1);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server on http://localhost:${PORT}`);
});
