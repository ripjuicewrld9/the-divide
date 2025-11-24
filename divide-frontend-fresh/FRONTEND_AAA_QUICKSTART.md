/\*\*

- FRONTEND AAA SYSTEM - QUICK START GUIDE
-
- This document explains how to integrate the cinematic battle arena
- into your app and customize it for your needs.
  \*/

# AAA Case Battle Frontend - Quick Start

## 📦 What You Have

### Core Components

- ✅ **DarkNeon Theme** - Cyberpunk glassmorphism + 60fps animations
- ✅ **Sound Manager** - Web Audio API with procedural SFX
- ✅ **Particle Engine** - Three.js with rarity-based effects
- ✅ **3D Case Models** - Rotating 3D cases with lock mechanics
- ✅ **Hexagonal Arena** - 3v3 battle layout with player pods
- ✅ **Reveal Sequencer** - Complete animation choreography
- ✅ **Item Cards** - Rarity-based glowing cards with counters

### File Structure

```
src/
├── components/
│   ├── BattleArena/
│   │   ├── UniversalBattleArena.jsx (Main component)
│   │   ├── HexagonalArena.jsx (Arena layout)
│   │   └── BattleArena.css (Styling + responsive)
│   ├── CaseModel/
│   │   └── CaseModel3D.jsx (Three.js 3D case)
│   └── ParticleEffects/
│       └── (Reserved for advanced particles)
├── systems/
│   ├── soundManager.jsx (Web Audio API SFX)
│   ├── particleEngine.jsx (Three.js particles)
│   └── revealSequencer.jsx (Animation orchestration)
├── styles/
│   ├── themes/
│   │   └── darkNeon.css (Master theme)
│   └── ItemReveal.css (Card animations)
└── assets/
    ├── sounds/ (For future audio files)
    └── particles/ (For future textures)
```

---

## 🚀 Integration Steps

### Step 1: Install Dependencies

```bash
npm install three seedrandom axios
```

### Step 2: Import Main Component

```jsx
import UniversalBattleArena from "@/components/BattleArena/UniversalBattleArena";
import "@/styles/themes/darkNeon.css";
import "@/styles/ItemReveal.css";
```

### Step 3: Create Battle Page

```jsx
import React, { useState, useEffect } from "react";
import UniversalBattleArena from "@/components/BattleArena/UniversalBattleArena";

export const BattlePage = () => {
  const [battleData, setBattleData] = useState(null);

  useEffect(() => {
    // Fetch from backend: GET /api/battles/:battleId
    const fetchBattle = async () => {
      const response = await fetch("/api/battles/abc123");
      const data = await response.json();
      setBattleData(data);
    };

    fetchBattle();
  }, []);

  if (!battleData) return <div>Loading...</div>;

  return (
    <UniversalBattleArena
      battleData={battleData}
      autoStart={true}
      onBattleComplete={() => {
        console.log("Battle complete!");
      }}
    />
  );
};
```

### Step 4: Expected battleData Format

```javascript
{
  id: 'battle-abc123',
  mode: '3v3',
  case: 'case-items-premium',
  teams: [
    {
      teamId: 'team-1',
      name: 'Team Cyan',
      players: [
        {
          id: 'player-1',
          name: 'Player One',
          avatar: 'https://...',
          team: 1,
          totalValue: 0
        },
        // ...
      ]
    },
    {
      teamId: 'team-2',
      name: 'Team Magenta',
      players: [
        // ...
      ]
    }
  ],
  results: [
    {
      round: 0,
      items: [
        {
          playerId: 'player-1',
          itemId: 'item-xyz',
          name: 'Premium Blanket',
          value: 2500,
          rarity: 'legendary',
          emoji: '🎁'
        },
        // ...
      ]
    }
  ],
  winners: ['player-1', 'player-2'],
  status: 'complete',
  createdAt: '2024-11-12T...'
}
```

---

## 🎨 Customization

### Change Theme Colors

Edit `darkNeon.css` root variables:

```css
:root {
  --primary-cyan: #00ffff; /* Change to your brand color */
  --primary-magenta: #ff0099; /* Change to your accent */
  --rarity-legendary: #ffd700; /* Change legendary glow */
  /* ... etc */
}
```

### Customize 3D Case Model

In `UniversalBattleArena.jsx`:

```javascript
const caseModel = new CaseModel3D(caseContainer, {
  caseName: "Your Case Name",
  caseColor: 0xff0000, // Hex color
  glowColor: 0x00ff00, // Glow color
  rotating: true, // Auto-rotate
});
```

### Add Custom Sounds

In `soundManager.jsx`, add new methods:

```javascript
async playCustomSound() {
  await this.playTone(440, 200, 'sine', {
    attack: 20,
    decay: 100,
    sustain: 0.2,
    release: 50,
    volume: 0.5
  });
}
```

### Modify Particle Effects

In `particleEngine.jsx`, create new burst types:

```javascript
createCustomBurst(position, count = 50) {
  // Create geometry, material, mesh
  // Add to particles array
}
```

---

## 🎯 Usage Examples

### Example 1: Create and Display Battle

```jsx
const handleStartBattle = async () => {
  // Call backend to create battle
  const response = await fetch("/api/battles/create", {
    method: "POST",
    body: JSON.stringify({
      mode: "3v3",
      caseId: "case-premium",
      players: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
        // ...
      ],
    }),
  });

  const battle = await response.json();

  // Navigate to battle page
  navigate(`/battle/${battle.id}`, { state: { battle } });
};
```

### Example 2: Custom Arena Layout

Modify `HexagonalArena.jsx` to support different player counts:

```jsx
const positions = {
  1: ["center"],
  2: ["center-left", "center-right"],
  3: ["top-center", "bottom-left", "bottom-right"],
  4: ["top-left", "top-right", "bottom-left", "bottom-right"],
  5: ["top-left", "top-right", "middle-left", "middle-right", "bottom"],
  6: [
    "top-left",
    "top-right",
    "center-left",
    "center-right",
    "bottom-left",
    "bottom-right",
  ],
};
```

### Example 3: Handle Winner Announcement

```jsx
<UniversalBattleArena
  battleData={battleData}
  onBattleComplete={() => {
    // Play celebration effect
    soundManager.playSuccess();

    // Show confetti
    const position = new THREE.Vector3(0, 2, 0);
    particleEngine.createConfettiBurst(position, 100);

    // Navigate to results
    setTimeout(() => {
      navigate("/battle-results", { state: { battle: battleData } });
    }, 2000);
  }}
/>
```

---

## 🔧 Advanced Customization

### Add Custom Battle Mode Indicator

```jsx
// In HexagonalArena.jsx
<div className="battle-mode-badge">{battleMode} BATTLE</div>
```

Add to CSS:

```css
.battle-mode-badge {
  position: fixed;
  top: 80px;
  right: 20px;
  background: var(--glass-bg);
  border: 2px solid var(--primary-cyan);
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 700;
  letter-spacing: 1px;
}
```

### Customize Card Reveal Timing

In `revealSequencer.jsx`, adjust durations:

```javascript
const durations = {
  common: 500, // Reveal time in ms
  uncommon: 700,
  rare: 900,
  epic: 1100,
  legendary: 1500,
  mythic: 1800,
};
```

### Add Statistics Display

```jsx
<div className="battle-stats">
  <div className="stat">
    <span>Round:</span> {currentRound} / {totalRounds}
  </div>
  <div className="stat">
    <span>Total Pot:</span> ${totalPot.toFixed(2)}
  </div>
</div>
```

---

## 📱 Mobile Optimization

The entire system is **fully responsive** and optimized for mobile:

- ✅ Touch-friendly buttons
- ✅ Responsive hexagon layout
- ✅ Font sizes scale down appropriately
- ✅ Reduced animations on low-power devices

For very low-end devices, disable 3D:

```javascript
const useWebGL = () => {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2");
  return gl !== null;
};

const shouldUse3D = useWebGL();
```

---

## 🎬 Animation Timings

Complete reveal sequence breakdown:

| Stage          | Duration         | What Happens              |
| -------------- | ---------------- | ------------------------- |
| Case Spin      | 2000ms           | Case rotates with sound   |
| Lock Click     | 300ms            | Lock opens with sound     |
| Light Beam     | 400ms            | Beam shoots out           |
| Item Reveal    | 600ms            | Card flies in, spins 360° |
| Particle Burst | 500-1800ms       | Rarity-based particles    |
| Value Counter  | 1200ms           | $ amount counts up        |
| **Total**      | **~5-6 seconds** | Complete sequence         |

---

## 🐛 Troubleshooting

### Issue: 3D Models Not Rendering

```
Check: Is Three.js installed? npm install three
Check: Does container element exist?
Check: Is WebGL enabled in browser?
Fallback: System auto-disables 3D on WebGL2 unavailable
```

### Issue: Sounds Not Playing

```
Check: Has user interacted with page? (Browser policy)
Check: Is soundManager initialized? (Auto on first click)
Check: Master volume > 0? (soundManager.masterVolume)
Fix: Call soundManager.init() on click
```

### Issue: Low FPS on Mobile

```
Reduce particles: burstFromRarity() defaults
Disable 3D cases: Remove CaseModel3D usage
Enable GPU acceleration: Already done via CSS
Use `will-animate` class: Already applied
```

### Issue: Large Bundle Size

```
Three.js is ~150KB minified
seedrandom is ~15KB
Total impact: ~165KB gzipped

To optimize:
- Use Three.js CDN instead of npm
- Tree-shake unused features
- Lazy-load particle engine
```

---

## 🚢 Deployment Checklist

- [ ] All Three.js assets loaded
- [ ] Sound system tested on mobile
- [ ] Responsive layout tested on all breakpoints
- [ ] Performance: 60fps maintained
- [ ] Fallbacks working (WebGL unavailable, etc)
- [ ] Environment variables set (API URL, etc)
- [ ] Analytics tracking added
- [ ] Error logging configured
- [ ] Deploy to production

---

## 📚 Learning Resources

### Recommended Reading Order

1. `darkNeon.css` - Understand theme system
2. `soundManager.jsx` - Learn audio
3. `HexagonalArena.jsx` - Learn layout
4. `UniversalBattleArena.jsx` - Tie it together

### Three.js Resources

- https://threejs.org/docs/
- https://threejs.org/examples/

### Web Audio API

- https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- https://www.html5rocks.com/en/tutorials/webaudio/intro/

---

## 💬 API Endpoints Expected

Your backend should provide:

```
GET  /api/battles/:id          - Get battle data
POST /api/battles/create       - Create new battle
GET  /api/battles/:id/verify   - Verify fairness
GET  /api/battles/:id/results  - Get detailed results
POST /api/battles/:id/replay   - Replay battle animation
```

See `IMPLEMENTATION_GUIDE.md` for backend details.

---

**You're all set! Build something amazing! 🎮✨**
