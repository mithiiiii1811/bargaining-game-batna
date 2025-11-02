
import React, { useEffect, useMemo, useRef, useState } from "react";
import { socket } from "../main"; // ✅ Use the shared socket instance
import type { Socket } from "socket.io-client";
import { motion } from "framer-motion";
import { Info } from "lucide-react";

type Role = "seller" | "buyer";
type GroupId = 1 | 2 | 3;

/**
 * Optional: get the API URL from query string (?api=...)
 * or use .env fallback for any REST fetch calls.
 * (Note: Socket itself is imported from ../main, not recreated here.)
 */
const params = new URLSearchParams(window.location.search);
const apiFromQuery = params.get("api");

export const SERVER_URL =
  apiFromQuery ||
  import.meta.env.VITE_SERVER_URL ||
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5174"
    : "https://bargaining-game-batna-2.onrender.com");



function MidpointCard() {
  return (
    <div className="p-4 bg-white rounded-2xl shadow border">
      <div className="flex items-center gap-2 mb-2">
        <Info className="w-5 h-5" />
        <h2 className="font-semibold">Midpoint (Splitting the pie)</h2>
      </div>
      <p className="text-sm leading-6">
        Each side has a BATNA (best alternative to a negotiated agreement).
        The negotiable surplus is <code>100 - (BATNA_S + BATNA_B)</code>.
        The midpoint is the center of the ZOPA:
      </p>
      <pre className="bg-gray-50 p-3 rounded-lg mt-2 overflow-auto text-xs">
        {'Midpoint price = ( BATNA_S + (100 - BATNA_B) ) / 2'}
      </pre>
      <p className="text-sm mt-2">
        It is a reference point, not a rule. Your result may be higher or lower depending
        on strategies and information.
      </p>
    </div>
  );
}

type Assignment = { pairId: string; group: GroupId; role: Role; batna: number };

export function App() {
  const [step, setStep] = useState<"intro"|"lobby"|"waiting"|"play"|"debrief">("intro");
  const [group, setGroup] = useState<GroupId>(1);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [offers, setOffers] = useState<{t:number; role:Role; price:number}[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | "">("");
  const [deal, setDeal] = useState<{deal:boolean; price?:number} | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const TIMER_MS = 45000;

  useEffect(()=>{
    if (step === "play" && deadline===null) {
      setDeadline(Date.now()+TIMER_MS);
      const int = setInterval(()=>{
        if (deadline && Date.now() > deadline) {
          socket?.emit("timeout");
        }
      }, 200);
      return ()=>clearInterval(int);
    }
  },[step, deadline, socket]);

  const timeLeft = useMemo(()=>{
    if (!deadline) return TIMER_MS;
    return Math.max(0, deadline - Date.now());
  },[deadline, deal]);

  function connectAndJoin() {
    const s = io(SERVER_URL, { transports: ["websocket"] });
    setSocket(s);
    s.on("connect", ()=>{
      s.emit("joinGroup", group);
      setStep("waiting");
    });
    s.on("assigned", (data: Assignment)=>{
      setAssignment(data);
      setStep("play");
    });
    s.on("status", (_)=>{});
    s.on("offer", (o:any)=>{
      setOffers(prev=>[...prev, { t:o.t, role:o.role, price:o.price }]);
    });
    s.on("done", (r:any)=>{
      setDeal(r);
      setStep("debrief");
    });
  }

  function sendOffer() {
    if (currentPrice === "" || !socket) return;
    socket.emit("offer", { price: currentPrice });
    setCurrentPrice("");
  }

  function accept(price:number) {
    socket?.emit("accept", { price });
  }

  // compute midpoint after match using true BATNAs for the assigned group
  function computeMidpoint(a: Assignment) {
    const bats = a.group===1? {seller:50,buyer:50} : a.group===2? {seller:70,buyer:30} : {seller:30,buyer:70};
    const pstar = (bats.seller + (100 - bats.buyer)) / 2;
    return { bats, pstar };
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">Bargaining Game: BATNA</h1>

        {step==="intro" && (
          <div className="space-y-4">
            <p>
              Welcome! You will be randomly matched with another player and assigned a role:
              <b> Verkäufer (Seller)</b> or <b>Käufer (Buyer)</b>. You will only see <b>your own BATNA</b>.
            </p>
            <MidpointCard />
            <div className="p-4 bg-white rounded-2xl shadow border">
              <h3 className="font-semibold mb-2">Choose Group</h3>
              <div className="flex gap-2">
                {[1,2,3].map((g)=> (
                  <button key={g}
                    onClick={()=>setGroup(g as GroupId)}
                    className={`px-3 py-2 rounded-xl border ${group===g? 'bg-black text-white':'bg-white'}`}>
                    Group {g}
                  </button>
                ))}
              </div>
              <div className="mt-4">
                <button onClick={()=>setStep("lobby")} className="px-4 py-2 rounded-xl bg-blue-600 text-white">
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {step==="lobby" && (
          <div className="p-4 bg-white rounded-2xl shadow border">
            <p className="mb-3">Click join to be matched with another player in Group {group}.</p>
            <button onClick={connectAndJoin} className="px-4 py-2 rounded-xl bg-green-600 text-white">Join matchmaking</button>
          </div>
        )}

        {step==="waiting" && (
          <div className="p-4 bg-white rounded-2xl shadow border">
            <p>Waiting for another player to join Group {group}…</p>
          </div>
        )}

        {step==="play" && assignment && (
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-2xl shadow border">
              <p><b>Role:</b> {assignment.role.toUpperCase()}</p>
              <p><b>Your BATNA:</b> {assignment.batna}</p>
              <p><b>Time left:</b> {(timeLeft/1000).toFixed(1)}s</p>
            </div>

            <div className="p-4 bg-white rounded-2xl shadow border">
              <h3 className="font-semibold mb-2">Offers</h3>
              <div className="space-y-2">
                {offers.map((o,idx)=>(
                  <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span>{o.role}</span>
                    <span>{o.price}</span>
                    <button className="px-3 py-1 rounded-md border" onClick={()=>accept(o.price)}>Accept</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <input type="number" className="border rounded-lg px-3 py-2 w-40"
                  placeholder="Enter price" value={currentPrice}
                  onChange={(e)=>setCurrentPrice(e.target.value===""? "": Number(e.target.value))} />
                <button onClick={sendOffer} className="px-4 py-2 rounded-xl bg-blue-600 text-white">Send offer</button>
              </div>
            </div>
          </div>
        )}

        {step==="debrief" && assignment && (
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-2xl shadow border">
              <h3 className="font-semibold mb-2">Result</h3>
              <p>Deal: {deal?.deal ? "Yes" : "No"}</p>
              {deal?.deal && <p>Price: {deal.price}</p>}
            </div>
            <div className="p-4 bg-white rounded-2xl shadow border">
              <h3 className="font-semibold mb-2">Midpoint analysis</h3>
              {(() => {
                const { bats, pstar } = computeMidpoint(assignment);
                const p = deal?.price ?? null;
                return (
                  <div className="text-sm space-y-1">
                    <p>True BATNAs (revealed now): Seller {bats.seller}, Buyer {bats.buyer}</p>
                    <p>Midpoint price: <b>{pstar.toFixed(2)}</b></p>
                    {p!==null && <p>Distance from midpoint: <b>{(p - pstar).toFixed(2)}</b></p>}
                  </div>
                )
              })()}
            </div>
            <div className="p-4 bg-white rounded-2xl shadow border">
              <a className="px-4 py-2 rounded-xl bg-emerald-600 text-white"
                href="http://localhost:5174/admin/export" target="_blank">Download CSV (all sessions)</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
