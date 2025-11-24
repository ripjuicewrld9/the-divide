/**
 * ITEM CARD REVEAL ANIMATION SYSTEM
 * Handles the complete animation sequence:
 * 1. Case spin → Lock click → Light beam
 * 2. Item card flies out, spins 360°
 * 3. Rarity glow + particle burst
 * 4. Value counter animates up
 * 5. Sound effects triggered
 */

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { soundManager } from './soundManager';
import '../styles/ItemReveal.css';

/**
 * Item Reveal Controller
 * Orchestrates timing of all animations
 */
export class RevealSequencer {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.isAnimating = false;
  }

  /**
   * Start complete reveal sequence
   */
  async playRevealSequence(playerId, item, caseModel) {
    if (this.isAnimating) return;
    this.isAnimating = true;

    try {
      // 1. CASE SPIN (2 seconds)
      await this.playCaseSpin(playerId, caseModel);

      // 2. LOCK CLICK
      await this.playLockClick(playerId, caseModel);

      // 3. LIGHT BEAM
      await this.playLightBeam(playerId, caseModel);

      // 4. ITEM CARD REVEAL with animations
      await this.playItemReveal(playerId, item);

      // 5. PARTICLE BURST based on rarity
      await this.playParticleBurst(playerId, item);

      // 6. VALUE COUNTER
      await this.playValueCounter(playerId, item);

    } finally {
      this.isAnimating = false;
    }
  }

  async playCaseSpin(playerId, caseModel) {
    return new Promise(resolve => {
      // Start spinning with GSAP
      if (caseModel) {
        caseModel.startRotating();
        soundManager.playSpinLoop(2000);

        // GSAP timeline for spin acceleration/deceleration
        const spinTimeline = gsap.timeline();
        spinTimeline.to(
          { rotation: 0 },
          {
            rotation: 1080, // 3 full rotations
            duration: 2,
            ease: 'power2.inOut',
            onUpdate: function () {
              // Can apply visual effects based on rotation progress
            },
          }
        );
      }

      this.callbacks.onCaseSpinStart?.(playerId);

      // Spin for 2 seconds
      setTimeout(() => {
        if (caseModel) caseModel.stopRotating();
        this.callbacks.onCaseSpinEnd?.(playerId);
        resolve();
      }, 2000);
    });
  }

  async playLockClick(playerId, caseModel) {
    return new Promise(resolve => {
      soundManager.playLockClick();
      if (caseModel) caseModel.openLock();
      this.callbacks.onLockOpen?.(playerId);
      setTimeout(resolve, 300);
    });
  }

  async playLightBeam(playerId, caseModel) {
    return new Promise(resolve => {
      if (caseModel) caseModel.createLightBeam();
      soundManager.playWoosh();
      this.callbacks.onLightBeam?.(playerId);
      setTimeout(resolve, 400);
    });
  }

  async playItemReveal(playerId, item) {
    return new Promise(resolve => {
      soundManager.playDing();
      this.callbacks.onItemRevealStart?.(playerId, item);

      // GSAP timeline for item reveal: fly-in + rotation + scale
      const revealTimeline = gsap.timeline();
      
      // Get the player pod element (assuming it has data-player-id attribute)
      const podElement = document.querySelector(`[data-player-id="${playerId}"] .item-card`);
      
      if (podElement) {
        // Cinematic fly-in sequence
        revealTimeline
          // Start from off-screen, tiny
          .fromTo(
            podElement,
            { opacity: 0, scale: 0.1, y: 100, rotationZ: -180 },
            {
              opacity: 1,
              scale: 1,
              y: 0,
              rotationZ: 0,
              duration: 0.8,
              ease: 'back.out',
            }
          )
          // Add subtle bounce/emphasis
          .to(
            podElement,
            {
              scale: 1.05,
              duration: 0.2,
              ease: 'power2.out',
            },
            '-=0.2'
          )
          // Scale back to normal
          .to(
            podElement,
            {
              scale: 1,
              duration: 0.2,
              ease: 'elastic.out',
            }
          );
      }

      setTimeout(() => {
        this.callbacks.onItemRevealEnd?.(playerId, item);
        resolve();
      }, 600);
    });
  }

  async playParticleBurst(playerId, item) {
    return new Promise(resolve => {
      // Play rarity-specific sound + particle effect
      soundManager.playRarityGlow(item.rarity);
      this.callbacks.onParticleBurst?.(playerId, item);

      // Duration varies by rarity
      const durations = {
        common: 500,
        uncommon: 700,
        rare: 900,
        epic: 1100,
        legendary: 1500,
      };

      setTimeout(resolve, durations[item.rarity] || 800);
    });
  }

  async playValueCounter(playerId, item) {
    return new Promise(resolve => {
      this.callbacks.onValueCountStart?.(playerId, item);
      
      // Find the value display element
      const valueElement = document.querySelector(`[data-player-id="${playerId}"] .item-value`);
      
      if (valueElement && item.value) {
        const counter = { value: 0 };
        
        // GSAP counter animation with pulse
        gsap.to(counter, {
          value: item.value,
          duration: 1.2,
          ease: 'power2.out',
          onUpdate: () => {
            valueElement.textContent = '$' + Math.round(counter.value).toLocaleString();
          },
        });

        // Add a subtle scale pulse as the number counts
        gsap.to(valueElement, {
          scale: 1.2,
          duration: 0.3,
          ease: 'back.out',
        });
      }

      setTimeout(() => {
        this.callbacks.onValueCountEnd?.(playerId, item);
        resolve();
      }, 1200);
    });
  }
}

/**
 * Item Card Component with reveal animation
 */
export const ItemCard = ({
  item,
  isRevealing = false,
  displayValue = 0,
  rarity = 'common'
}) => {
  return (
    <div className={`item-card card-${rarity} ${isRevealing ? 'revealing' : ''}`}>
      {/* RARITY BORDER GLOW */}
      <div className={`card-rarity-glow rarity-${rarity}`} />

      {/* SHINE EFFECT */}
      <div className="card-shine" />

      {/* FRONT FACE - ITEM DISPLAY */}
      <div className="card-front">
        {/* ITEM EMOJI/ICON */}
        <div className="card-icon">{item.emoji || '⭐'}</div>

        {/* ITEM NAME */}
        <div className="card-name">{item.name}</div>

        {/* RARITY TIER DISPLAY */}
        <div className={`card-tier tier-${rarity}`}>
          {rarity.toUpperCase()}
        </div>

        {/* VALUE DISPLAY WITH COUNTER */}
        <div className="card-value-display">
          <span className="value-currency">$</span>
          <span className="value-amount">
            {displayValue.toFixed(2)}
          </span>
        </div>

        {/* ITEM DESCRIPTION */}
        {item.description && (
          <div className="card-description">{item.description}</div>
        )}
      </div>

      {/* PARALLAX TILT EFFECT */}
      <div className="card-tilt-inner" />
    </div>
  );
};

/**
 * Reveal Animation Container
 * Manages full sequence with timing
 */
export const RevealAnimationContainer = ({
  onRevealComplete = () => {},
  onSequenceComplete = () => {},
  caseModels = {}
}) => {
  const [revealingPlayers, setRevealingPlayers] = useState({});
  const [displayValues, setDisplayValues] = useState({});
  const [revealedItems, setRevealedItems] = useState({});
  const sequencerRef = useRef(null);

  // Initialize sequencer with callbacks
  useEffect(() => {
    sequencerRef.current = new RevealSequencer({
      onCaseSpinStart: () => {
        // Add spinning indicator
      },
      onCaseSpinEnd: () => {
        // Remove spinning indicator
      },
      onLockOpen: () => {
        // Play lock open effect
      },
      onLightBeam: () => {
        // Light effect already in 3D
      },
      onItemRevealStart: (playerId, item) => {
        setRevealingPlayers(prev => ({ ...prev, [playerId]: true }));
        setRevealedItems(prev => ({ ...prev, [playerId]: item }));
      },
      onItemRevealEnd: (playerId) => {
        setRevealingPlayers(prev => ({ ...prev, [playerId]: false }));
      },
      onParticleBurst: () => {
        // Particle effect trigger (to 3D scene)
      },
      onValueCountStart: (playerId) => {
        setDisplayValues(prev => ({ ...prev, [playerId]: 0 }));
      },
      onValueCountEnd: (playerId, item) => {
        setDisplayValues(prev => ({ ...prev, [playerId]: item.value }));
        onRevealComplete(playerId, item);
      }
    });
  }, [onRevealComplete]);

  /**
   * Trigger reveal for a player
   */
  const triggerReveal = async (playerId, item) => {
    const caseModel = caseModels[playerId];
    await sequencerRef.current.playRevealSequence(playerId, item, caseModel);
  };

  /**
   * Trigger reveal for all players (battle sequence)
   */
  const triggerBattleReveal = async (playerItems) => {
    // Stagger reveals for visual effect (150ms apart)
    for (let i = 0; i < playerItems.length; i++) {
      const { playerId, item } = playerItems[i];
      setTimeout(() => {
        triggerReveal(playerId, item);
      }, i * 150);
    }

    // Wait for all reveals to complete
    const maxDuration = 2000 + 300 + 400 + 600 + 1500 + 1200; // Total sequence time
    setTimeout(() => {
      onSequenceComplete?.();
    }, maxDuration + (playerItems.length * 150));
  };

  return {
    triggerReveal,
    triggerBattleReveal,
    revealingPlayers,
    displayValues,
    revealedItems,
    ItemCard: (playerId) => (
      <ItemCard
        key={`item-${playerId}`}
        item={revealedItems[playerId] || {}}
        isRevealing={revealingPlayers[playerId]}
        displayValue={displayValues[playerId] || 0}
        rarity={revealedItems[playerId]?.rarity || 'common'}
      />
    )
  };
};

export default RevealAnimationContainer;
