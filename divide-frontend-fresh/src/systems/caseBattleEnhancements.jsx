/**
 * Case Battle Visual & Audio Enhancements
 * Provides premium animations, particles, and sound effects for case battles
 */

// Create enhanced audio context with advanced sound design
export const createEnhancedAudioContext = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  const playWhoosh = (volume = 0.6) => {
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    
    // Whoosh effect: frequency sweep from high to low
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
    
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.3);
    
    osc.type = 'triangle';
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);
    
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    osc.start(now);
    osc.stop(now + 0.3);
  };

  const playVictory = (volume = 0.7) => {
    const now = audioContext.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 chord
    
    notes.forEach((freq, i) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      osc.frequency.value = freq;
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(audioContext.destination);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.8, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      
      osc.start(now + i * 0.05);
      osc.stop(now + 0.6);
    });
  };

  const playDefeat = (volume = 0.5) => {
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.frequency.setValueAtTime(392, now); // G4
    osc.frequency.exponentialRampToValueAtTime(196, now + 0.5); // G3
    
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    gain.gain.setValueAtTime(volume * 0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    
    osc.start(now);
    osc.stop(now + 0.5);
  };

  const playSpinTick = (frequency = 800, volume = 0.3) => {
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.frequency.value = frequency;
    osc.type = 'square';
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
    
    osc.start(now);
    osc.stop(now + 0.04);
  };

  const playPop = (volume = 0.6) => {
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    osc.start(now);
    osc.stop(now + 0.1);
  };

  return { audioContext, playWhoosh, playVictory, playDefeat, playSpinTick, playPop };
};

// Particle effect system for battle animations
export class ParticleSystem {
  constructor(container) {
    this.container = container;
    this.particles = [];
  }

  createParticles(x, y, count = 15, type = 'confetti') {
    for (let i = 0; i < count; i++) {
      const particle = {
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8 - 3,
        life: 1,
        size: Math.random() * 8 + 4,
        type,
      };
      this.particles.push(particle);
    }
  }

  update() {
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // gravity
      p.life -= 0.02;
      return p.life > 0;
    });
  }

  render() {
    const canvas = document.createElement('canvas');
    canvas.width = this.container.offsetWidth;
    canvas.height = this.container.offsetHeight;
    const ctx = canvas.getContext('2d');

    this.particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.type === 'confetti' ? `hsl(${Math.random() * 360}, 100%, 50%)` : '#00ffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    return canvas;
  }
}

// Enhanced animation utilities
export const animationUtils = {
  // Dramatic spin entrance
  spinEntrance: (element, duration = 0.6) => {
    return new Promise(resolve => {
      const startTime = performance.now();
      
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / (duration * 1000), 1);
        
        const rotation = progress * 720; // Two full rotations
        const scale = 0.5 + progress * 0.5; // Scale from 50% to 100%
        const opacity = progress;
        
        element.style.transform = `rotateY(${rotation}deg) scale(${scale})`;
        element.style.opacity = opacity;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(animate);
    });
  },

  // Victory pulse animation
  victoryPulse: (element, duration = 0.8) => {
    return new Promise(resolve => {
      const startTime = performance.now();
      
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / (duration * 1000), 1);
        
        // Pulse effect
        const scale = 1 + Math.sin(progress * Math.PI * 2) * 0.2;
        const glow = Math.sin(progress * Math.PI * 2) * 0.5 + 0.5;
        
        element.style.transform = `scale(${scale})`;
        element.style.boxShadow = `0 0 ${30 * glow}px rgba(0, 255, 255, ${glow * 0.8})`;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(animate);
    });
  },

  // Item reveal flash
  itemRevealFlash: (element) => {
    return new Promise(resolve => {
      element.style.animation = 'none';
      setTimeout(() => {
        element.style.animation = 'itemRevealFlash 0.6s ease-out';
        setTimeout(resolve, 600);
      }, 10);
    });
  },

  // Shake effect for impact
  shake: (element, intensity = 5, duration = 0.3) => {
    return new Promise(resolve => {
      const startTime = performance.now();
      const originalTransform = element.style.transform;
      
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = elapsed / (duration * 1000);
        
        if (progress < 1) {
          const amount = intensity * (1 - progress);
          const x = (Math.random() - 0.5) * amount * 2;
          const y = (Math.random() - 0.5) * amount * 2;
          
          element.style.transform = `${originalTransform} translate(${x}px, ${y}px)`;
          requestAnimationFrame(animate);
        } else {
          element.style.transform = originalTransform;
          resolve();
        }
      };
      
      requestAnimationFrame(animate);
    });
  },
};

// CSS animations to add to stylesheet
export const ENHANCEMENT_STYLES = `
@keyframes itemRevealFlash {
  0% {
    background: rgba(255, 255, 0, 0.8);
    transform: scale(0.95);
  }
  50% {
    background: rgba(0, 255, 255, 0.4);
  }
  100% {
    background: rgba(255, 255, 255, 0);
    transform: scale(1);
  }
}

@keyframes spinWhoosh {
  0% {
    opacity: 0.5;
    filter: blur(2px);
  }
  50% {
    opacity: 1;
    filter: blur(0px);
  }
  100% {
    opacity: 0.5;
    filter: blur(2px);
  }
}

@keyframes victoryGlow {
  0%, 100% {
    filter: drop-shadow(0 0 10px rgba(0, 255, 100, 0.5));
  }
  50% {
    filter: drop-shadow(0 0 30px rgba(0, 255, 100, 1));
  }
}

@keyframes defeatDim {
  0%, 100% {
    filter: drop-shadow(0 0 10px rgba(255, 0, 0, 0.5));
  }
  50% {
    filter: drop-shadow(0 0 5px rgba(255, 0, 0, 0.2));
  }
}

@keyframes spinAccelerate {
  0% {
    animation-timing-function: linear;
  }
}
`;
