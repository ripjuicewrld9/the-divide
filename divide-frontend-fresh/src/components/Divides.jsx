import React, { useContext, useEffect, useState, useRef } from "react";
import { isMobile } from '../utils/deviceDetect';
import { formatCurrency } from '../utils/format';
import { Link } from 'react-router-dom';
import { io } from "socket.io-client";
import DivideCard from "./DivideCard";
// Wide modal removed: no pop-out live duet card
import CreateDivideModal from './CreateDivideModal';
import VoteWithBetModal from './VoteWithBetModal';
import { AuthContext } from "../context/AuthContext";
import AuthModal from "./AuthModal.jsx";
import LiveGamesFeed from "./LiveGamesFeed";
import "../styles/Divides.css";

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000"; // use VITE_API_URL when available, fallback to dev server port 3000

// 🎨 Randomize 2 colors for each Divide
// Fixed red/blue neon color scheme: A = red, B = blue
const randomColors = () => {
  return ['#ff0044', '#00aaff'];
};

// small client-side short id generator for temporary keys
const shortId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export default function Divides() {
  const { user, refreshUser } = useContext(AuthContext);
  const [showModal, setShowModal] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [divides, setDivides] = useState([]);
  const [allExpanded, setAllExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [jackpot, setJackpot] = useState({ amount: 0, houseTotal: 0, kenoReserve: 0 });
  const [showCreateDivideModal, setShowCreateDivideModal] = useState(false);
  const [showVoteBetModal, setShowVoteBetModal] = useState(false);
  const [selectedDivideForVote, setSelectedDivideForVote] = useState(null);
  // audio pool: keep a small pool of HTMLAudioElement instances per URL to minimize latency and overlapping clipping
  const audioPoolRef = useRef(new Map()); // url -> { pool: HTMLAudioElement[], idx: number }
  const POOL_SIZE = 3;

  const resolveUrl = (p) => {
    if (!p) return null;
    if (p.startsWith('http')) return p;
    return `${API_BASE}${p.startsWith('/') ? '' : '/'}${p}`;
  };

  const preloadAudio = (p) => {
    try {
      const url = resolveUrl(p);
      if (!url) return;
      const poolMap = audioPoolRef.current;
      if (poolMap.has(url)) return poolMap.get(url).pool[0];
      const pool = [];
      for (let i = 0; i < POOL_SIZE; i++) {
        try {
          const a = new Audio(url);
          a.preload = 'auto';
          // try load (best-effort)
    try { a.load(); } catch { /* ignore */ }
          pool.push(a);
  } catch { /* ignore single audio creation failures */ }
      }
      poolMap.set(url, { pool, idx: 0 });
      return pool[0] || null;
  } catch (err) {
      console.warn('preloadAudio failed', err);
      return null;
    }
  };

  const playPooledAudio = (p) => {
    try {
      const url = resolveUrl(p);
      if (!url) return;
      const poolMap = audioPoolRef.current;
      let entry = poolMap.get(url);
      if (!entry) {
        preloadAudio(p);
        entry = audioPoolRef.current.get(url);
        if (!entry) return; // couldn't create
      }
      const { pool } = entry;
      if (!pool || pool.length === 0) return;
      // round-robin play to allow overlapping and avoid clipping
      const e = entry;
      const a = e.pool[e.idx % e.pool.length];
      e.idx = (e.idx + 1) % e.pool.length;
      try {
        a.currentTime = 0;
        const playPromise = a.play();
        if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
      } catch { /* ignore */ }
    } catch { /* ignore audio errors */ }
  };

  // 🟢 Fetch Divides from backend
  const fetchDivides = async () => {
    try {
      const res = await fetch(`${API_BASE}/Divides`);
      const data = await res.json();
      // dedupe by id/_id and ensure colors
      const map = new Map();
      for (const d of data) {
        const key = d._id || d.id || shortId();
        if (!map.has(key)) map.set(key, { ...d, colors: randomColors() });
      }
      const arr = Array.from(map.values());
      setDivides(arr);
      // preload any sounds referenced by divides
      for (const dd of arr) {
        if (dd.soundA) preloadAudio(dd.soundA);
        if (dd.soundB) preloadAudio(dd.soundB);
      }
    } catch (err) {
      console.error("Failed to load Divides:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDivides();
    fetchJackpot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchJackpot = async () => {
    try {
      const res = await fetch(`${API_BASE}/jackpot`);
      const data = await res.json();
      // Normalize server response: prefer kenoReserve when present, otherwise fall back to houseTotal
      const amount = (typeof data.amount !== 'undefined') ? data.amount : 0;
      const kenoReserve = (typeof data.kenoReserve !== 'undefined') ? data.kenoReserve : (data.houseTotal || 0);
      setJackpot({ amount: amount, houseTotal: data.houseTotal || 0, kenoReserve });
  } catch (err) {
      console.error('Failed to load jackpot', err);
    }
  };

  // ⚡ Connect live updates via Socket.IO
  useEffect(() => {
    // Use default transports (polling then websocket) so the client can
    // gracefully fall back if direct websocket handshake fails in some dev setups.
    const socket = io(API_BASE, { withCredentials: true });

    socket.on("connect", () => {
      console.log("🟢 Connected to Divide socket");
    });

    socket.on("voteUpdate", (updatedDivide) => {
      console.log("🔁 Live update:", updatedDivide);
      try {
        // compute delta vs local copy in the state updater for accurate comparison
        setDivides((prev) => {
          const id = updatedDivide._id || updatedDivide.id;
          const existing = prev.find((d) => d._id === id || d.id === id);
          const prevA = existing ? (existing.votesA || 0) : 0;
          const prevB = existing ? (existing.votesB || 0) : 0;
          console.debug('[Divides] voteUpdate payload', {
            id,
            votesA: updatedDivide.votesA,
            votesB: updatedDivide.votesB,
            delta: { A: (updatedDivide.votesA || 0) - prevA, B: (updatedDivide.votesB || 0) - prevB },
            time: new Date().toISOString()
          });
          return prev.map((d) => (d._id === id || d.id === id ? { ...d, ...updatedDivide } : d));
        });
        // preload sounds if included in update
  try { if (updatedDivide.soundA) preloadAudio(updatedDivide.soundA); if (updatedDivide.soundB) preloadAudio(updatedDivide.soundB); } catch { /* ignore */ }
  } catch (err) {
        console.error('voteUpdate handler error', err);
      }
    });

    socket.on("newDivide", (newDivide) => {
      console.log("🆕 New divide:", newDivide);
      setDivides((prev) => {
        const id = newDivide._id || newDivide.id;
        // replace if exists, otherwise append
        const exists = prev.find((d) => d._id === id || d.id === id);
        if (exists) return prev.map((d) => (d._id === id || d.id === id ? { ...d, ...newDivide, colors: d.colors || randomColors() } : d));
        return [...prev, { ...newDivide, colors: randomColors() }];
      });
  try { if (newDivide.soundA) preloadAudio(newDivide.soundA); if (newDivide.soundB) preloadAudio(newDivide.soundB); } catch { /* ignore */ }
    });

    socket.on("divideEnded", (ended) => {
      console.log("🏁 Divide ended:", ended);
      const endedId = typeof ended === 'object' ? (ended._id || ended.id) : ended;
      setDivides((prev) => prev.filter((d) => d._id !== endedId && d.id !== endedId));
      // refresh jackpot totals when a round ends
  try { fetchJackpot(); } catch { /* ignore */ }
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🗳 Handle vote action
  const handleVote = async (divideId, side, boostAmount = 1) => {
    if (!user) {
      setShowModal(true);
      return;
    }

    // ensure we have the latest divide locally before attempting to vote
    let target = divides.find((d) => d._id === divideId || d.id === divideId);
    if (!target) {
      console.log('Target divide missing locally, refreshing list...', { divideId });
      await fetchDivides();
      target = divides.find((d) => d._id === divideId || d.id === divideId);
      if (!target) {
        alert('Divide not found locally. Try refreshing the page.');
        return;
      }
    }

    // Note: play sound only after vote succeeds (avoid playing on accidental clicks)

    if (target.status && target.status !== "active") {
      console.log('Client prevented vote: target not active', { divideId, status: target.status });
      alert("This divide is no longer active");
      return;
    }

    try {
      const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/Divides/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            divideId,
            side,
            boostAmount: Number(boostAmount) || 1,
          }),
      });

      const text = await res.text();
      let updated;
  try { updated = JSON.parse(text); } catch { updated = { raw: text }; }
      if (!res.ok) {
        console.error('Vote failed response', { status: res.status, body: updated });
        // If the server indicates insufficient balance, play guncock feedback
        try {
          const errMsg = (updated && (updated.error || updated.raw)) || '';
          if (res.status === 402 || /insufficient/i.test(String(errMsg))) {
            // prefer explicit .wav, play via pooled audio so it respects preload/pooling
            playPooledAudio('/sounds/guncock.wav');
          }
  } catch { /* ignore */ }
        throw new Error(updated.error || updated.raw || 'Vote failed');
      }

      // Update divides list
      setDivides((prev) => prev.map((d) => (d._id === divideId || d.id === divideId ? { ...d, ...updated } : d)));

      // Play assigned sound after a successful vote (server may return updated sound fields)
      try {
        const soundField = side === 'A' ? 'soundA' : 'soundB';
        const soundPath = (updated && updated[soundField]) || (target && target[soundField]);
        if (soundPath) playPooledAudio(soundPath);
  } catch { /* ignore audio errors */ }

      // If server returned an updated balance, refresh local user state
      if (updated && typeof updated.balance !== 'undefined' && refreshUser) {
  try { await refreshUser(); } catch { /* ignore */ }
      }
    } catch (err) {
      console.error(err);
      const msg = err && err.message ? String(err.message) : String(err || 'Vote failed');
      // suppress native alert popup for insufficient-balance errors; play a sound and log instead
      if (/insufficient/i.test(msg)) {
  try { playPooledAudio('/sounds/guncock.wav'); } catch { /* ignore */ }
        // optionally show a non-blocking UI cue here (toast/snackbar) — omitted to keep behavior minimal
      } else {
        alert(msg || "Vote failed");
      }
    }
  };

  if (loading) return <div className="loading">Loading Divides...</div>;

  const activeDivides = divides.filter((d) => d.status === 'active');
  const previousDivides = divides.filter((d) => d.status !== 'active').sort((a,b) => {
    const ta = a.endTime ? new Date(a.endTime).getTime() : 0;
    const tb = b.endTime ? new Date(b.endTime).getTime() : 0;
    return tb - ta; // newest first
  });

  return (
    isMobile() ? (
      <div className="divides-mobile-container px-2 py-2">
        <div className="page-title text-center text-2xl font-bold text-cyan-400 mb-2">THE DIVIDE</div>
        <div className="top-stats flex justify-center mb-2">
          <div className="stat-wrapper bg-gray-900 rounded-lg px-4 py-2">
            <div className="stat-title text-sm text-gray-300">Jackpot</div>
            <div className="stat-value text-lg font-bold text-yellow-400">${formatCurrency(jackpot.amount, 2)}</div>
          </div>
        </div>
        <div className="create-divide-section flex justify-center mb-4">
          <button
            className="btn-create-divide bg-cyan-600 text-white font-bold px-4 py-2 rounded-lg shadow-lg text-lg"
            onClick={() => {
              if (!user) {
                setShowModal(true);
              } else {
                setShowCreateDivideModal(true);
              }
            }}
          >
            + Create a Divide
          </button>
        </div>
        <div className="divides-grid-mobile flex flex-col gap-4">
          {activeDivides.map((d) => (
            <DivideCard
              key={d._id || d.id}
              divideId={d._id || d.id}
              title={d.title}
              creatorUsername={d.creatorUsername}
              left={d.optionA}
              right={d.optionB}
              imageA={d.imageA}
              imageB={d.imageB}
              soundA={d.soundA}
              soundB={d.soundB}
              leftVotes={d.votesA}
              rightVotes={d.votesB}
              pot={d.pot}
              endTime={d.endTime}
              status={d.status}
              winner={d.winnerSide}
              isUserCreated={d.isUserCreated}
              onVote={(side, boostAmount) => handleVote(d.id || d._id, side, boostAmount)}
              allExpanded={allExpanded}
              onRequestExpand={() => {
                setAllExpanded((s) => !s);
              }}
              colorA={d.colors[0]}
              colorB={d.colors[1]}
              active={true}
            />
          ))}
        </div>
        {previousDivides.length > 0 && (
          <section className="previous-divides-mobile mt-6">
            <h3 className="text-lg font-bold text-gray-300 mb-2">Previous Divides</h3>
            <div className="divides-grid-mobile flex flex-col gap-2">
              {previousDivides.map((d) => (
                <DivideCard
                  key={`prev-${d._id || d.id}`}
                  title={d.title}
                  creatorUsername={d.creatorUsername}
                  left={d.optionA}
                  right={d.optionB}
                  leftVotes={d.votesA}
                  rightVotes={d.votesB}
                  pot={d.pot}
                  endTime={d.endTime}
                  status={d.status}
                  winner={d.winnerSide}
                  onVote={() => {}}
                  imageA={d.imageA}
                  imageB={d.imageB}
                  soundA={d.soundA}
                  soundB={d.soundB}
                  colorA={d.colors[0]}
                  colorB={d.colors[1]}
                  active={false}
                />
              ))}
            </div>
          </section>
        )}
        {showModal && (
          <AuthModal
            onClose={() => setShowModal(false)}
            isRegister={isRegister}
            setIsRegister={setIsRegister}
          />
        )}
        <CreateDivideModal
          isOpen={showCreateDivideModal}
          onClose={() => setShowCreateDivideModal(false)}
          onDivideCreated={() => {
            setShowCreateDivideModal(false);
          }}
        />
        <VoteWithBetModal
          isOpen={showVoteBetModal}
          onClose={() => {
            setShowVoteBetModal(false);
            setSelectedDivideForVote(null);
          }}
          divide={selectedDivideForVote}
          onVoted={() => {
            setShowVoteBetModal(false);
            setSelectedDivideForVote(null);
          }}
        />
        <div className="live-games-feed-mobile mt-6">
          <div className="bg-gray-900 rounded-xl p-4">
            <LiveGamesFeed />
          </div>
        </div>
      </div>
    ) : (
      // Desktop layout (unchanged)
      <div className="divides-container">
        ...existing code...
      </div>
    )
  );
}
