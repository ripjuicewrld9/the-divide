/**
 * WINNER SCREEN COMPONENT
 * Displays battle results with cinematic 3D text animation
 * Includes shockwave effects, screen shake, and particle bursts
 */

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import './WinnerScreen.css';
import { createSeededRng } from '../../utils/seededRng';

export const WinnerScreen = ({ 
  winners = [], 
  totalPot = 0, 
  onPlayAgain = () => {},
  onClose = () => {}
}) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const shockwaveRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Animate in the winner screen with cinematic effect
    const timeline = gsap.timeline();

    // Background fade in
    timeline.fromTo(
      containerRef.current,
      { opacity: 0, backdropFilter: 'blur(0px)' },
      { opacity: 1, backdropFilter: 'blur(5px)', duration: 0.5 },
      0
    );

    // Title text fly in with 3D perspective
    if (textRef.current) {
      timeline.fromTo(
        textRef.current,
        {
          opacity: 0,
          scale: 0.5,
          rotationX: 180,
          rotationZ: -45,
          y: -200,
        },
        {
          opacity: 1,
          scale: 1,
          rotationX: 0,
          rotationZ: 0,
          y: 0,
          duration: 0.8,
          ease: 'back.out',
        },
        0.2
      );

      // Add text glow pulse
      timeline.to(
        textRef.current,
        {
          textShadow: '0 0 40px #00f0ff, 0 0 80px #8b5cf6',
          duration: 0.6,
          repeat: -1,
          yoyo: true,
        },
        0.5
      );
    }

    // Shockwave animation
    if (shockwaveRef.current) {
      timeline.to(
        shockwaveRef.current,
        {
          width: 800,
          height: 800,
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out',
        },
        0.5
      );
    }

    // Screen shake effect
    timeline.to(
      containerRef.current,
      {
        x: 5,
        duration: 0.05,
        repeat: 5,
        yoyo: true,
      },
      0.5
    );

    // Cleanup
    return () => {
      timeline.kill();
    };
  }, []);

  const winnerNames = winners.map(w => w.username || w.name).join(' & ');
  const winAmount = totalPot ? (totalPot / winners.length).toFixed(2) : '0.00';

  return (
    <div className="winner-screen-overlay" ref={containerRef}>
      {/* Shockwave effect */}
      <div className="shockwave-ring" ref={shockwaveRef} />

      {/* Winner content */}
      <div className="winner-screen-content">
        {/* Main title */}
        <div className="winner-title-section" ref={textRef}>
          <h1 className="winner-title-main">VICTORY!</h1>
          <div className="winner-names">{winnerNames}</div>
        </div>

        {/* Pot display */}
        <div className="pot-display">
          <div className="pot-label">Total Pot</div>
          <div className="pot-value">${totalPot?.toFixed(2) || '0.00'}</div>
        </div>

        {/* Winner cards */}
        <div className="winner-cards-list">
          {winners.map((winner, idx) => (
            <div key={winner.id || idx} className="winner-detail-card">
              <div className="winner-rank-badge">{idx + 1}</div>
              <div className="winner-info">
                <div className="winner-username">{winner.username || winner.name}</div>
                <div className="winner-winnings">${winAmount}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="winner-actions">
          <button className="btn-primary" onClick={onPlayAgain}>
            Play Again
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {/* Particle burst background */}
      <div className="particle-burst-container">
        {(() => {
          // Deterministic particle positions based on winners and pot
          const seedString = (winners || []).map(w => w.username || w.name).join('|') + `::${totalPot}`;
          return [...Array(20)].map((_, i) => {
            const rng = createSeededRng(seedString, i);
            const left = Math.floor(rng() * 100) + '%';
            const top = Math.floor(rng() * 100) + '%';
            const delay = (rng() * 0.5).toFixed(2) + 's';
            return (
              <div
                key={i}
                className="particle"
                style={{ left, top, '--delay': delay }}
              />
            );
          });
        })()}
      </div>
    </div>
  );
};
