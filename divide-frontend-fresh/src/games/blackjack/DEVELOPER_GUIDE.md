# Blackjack Game - API & Extension Guide

## State Management (Zustand Store)

### Accessing Game State

```typescript
import { useGameStore } from "@/games/blackjack/store";

const Component = () => {
  const {
    balance, // Current player balance
    gamePhase, // 'betting' | 'dealing' | 'playing' | 'insurance' | 'settling' | 'gameOver'
    playerHands, // Array of player hands
    dealerHand, // Dealer's hand
    message, // Current game message
    roundResults, // Last 10 hands (history)
    streakCount, // Current streak number
    streakType, // 'win' | 'loss' | null
  } = useGameStore();
};
```

### Available Actions

```typescript
// Initialize game
gameState.initGame();

// Reset between rounds
gameState.resetGame();

// Chip selection
gameState.selectChip(25); // Select $25 chip

// Betting
gameState.setBetMode("main"); // or 'perfectPairs', 'twentyPlusThree', 'blazingSevens'
gameState.placeBet(50, "main");
gameState.clearBets();

// Game flow
gameState.deal();
gameState.hit();
gameState.stand();
gameState.doubleDown();
gameState.split();

// Insurance
gameState.takeInsurance();
gameState.declineInsurance();

// Messaging
gameState.setMessage("Your turn");
```

## Game Logic Functions

All pure functions in `gameLogic.ts`:

### Deck Management

```typescript
import {
  createDeck, // Create 6-deck shoe
  shuffleDeck, // Fisher-Yates shuffle with crypto random
} from "@/games/blackjack/gameLogic";

const deck = createDeck();
const shuffled = shuffleDeck(deck);
```

### Hand Evaluation

```typescript
import {
  getHandValue, // { value: number, isSoft: boolean }
  isBust, // boolean
  isBlackjack, // boolean
  canSplit, // boolean
  canDoubleDown, // boolean
  dealerShouldHit, // boolean
} from "@/games/blackjack/gameLogic";

const handValue = getHandValue(cards);
// Returns: { value: 21, isSoft: false }

const mustHit = dealerShouldHit(dealerCards); // Dealer rules
```

### Outcome Determination

```typescript
import {
  evaluateWin, // 'win' | 'loss' | 'push' | 'blackjack'
  calculatePayout, // Accurate payout calculation
} from "@/games/blackjack/gameLogic";

const outcome = evaluateWin(playerCards, dealerCards);
const payout = calculatePayout(
  playerCards,
  dealerCards,
  betAmount,
  insuranceBet
);
```

### Side Bet Evaluation

```typescript
import {
  evaluatePerfectPairs, // Returns payout or 0
  evaluateTwentyPlusThree, // Returns (bet: number) => number
  evaluateBlazingSevens, // Returns (bet: number) => number
} from "@/games/blackjack/gameLogic";

// Perfect Pairs (check before deal second card)
const ppPayout = evaluatePerfectPairs(hand);

// 21+3 (uses player's 2 cards + dealer's 1 card)
const twentyThreeEval = evaluateTwentyPlusThree(playerCards, dealerUpCard);
const payout = twentyThreeEval(betAmount);

// 777 (Blazing Sevens)
const blazingEval = evaluateBlazingSevens(playerCards, dealerUpCard);
const payout = blazingEval(betAmount);
```

## Component Props

### BlackjackGame

No props required. Uses Zustand store internally.

```typescript
<BlackjackGame />
```

### PlayingCard

```typescript
interface PlayingCardProps {
  card: Card; // { suit, rank, id }
  isHidden?: boolean; // Show back of card
  isDealer?: boolean; // Card angle (dealer vs player)
  index?: number; // Position for animation
  delay?: number; // Animation delay
}
```

### HandDisplay

```typescript
interface HandDisplayProps {
  cards: Card[];
  label: string; // "Hand 1", "Dealer", etc.
  isCurrent?: boolean; // Highlight current hand
  isDealer?: boolean; // Dealer layout
  canAct?: boolean; // Show "Your turn" pulse
}
```

### GameControls

```typescript
interface GameControlsProps {
  gamePhase: string;
  canHit: boolean;
  canStand: boolean;
  canDouble: boolean;
  canSplit: boolean;
  canInsurance: boolean;
  onHit: () => void;
  onStand: () => void;
  onDouble: () => void;
  onSplit: () => void;
  onDeal: () => void;
  onInsuranceYes: () => void;
  onInsuranceNo: () => void;
}
```

### BettingArea

```typescript
interface BettingAreaProps {
  mainBet: number;
  perfectPairsBet: number;
  twentyPlusThreeBet: number;
  blazingSevensBet: number;
  selectedChip: number | null;
  currentMode: string | null;
  onSelectMode: (mode) => void;
  onPlaceBet: (amount) => void;
  onClearBets: () => void;
  gamePhase: string;
}
```

## TypeScript Types

### Game State

```typescript
interface GameState {
  balance: number;
  deck: Card[];
  playerHands: Hand[];
  dealerHand: Hand;
  currentHandIndex: number;
  gamePhase:
    | "betting"
    | "dealing"
    | "playing"
    | "insurance"
    | "settling"
    | "gameOver";
  message: string;
  selectedChip: number | null;
  betPlacementMode:
    | "main"
    | "perfectPairs"
    | "twentyPlusThree"
    | "blazingSevens"
    | null;
  insuranceOffered: boolean;
  insuranceBet: number;
  roundResults: RoundResult[];
  streakCount: number;
  streakType: "win" | "loss" | null;
}
```

### Card

```typescript
interface Card {
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  rank:
    | "A"
    | "2"
    | "3"
    | "4"
    | "5"
    | "6"
    | "7"
    | "8"
    | "9"
    | "10"
    | "J"
    | "Q"
    | "K";
  id: string;
}
```

### Hand

```typescript
interface Hand {
  cards: Card[];
  bet: number;
  sideBets: {
    perfectPairs: number;
    twentyPlusThree: number;
    blazingSevens: number;
  };
  isDealerHand: boolean;
}
```

### RoundResult

```typescript
interface RoundResult {
  timestamp: number;
  playerBet: number;
  playerTotal: number;
  dealerTotal: number;
  outcome: "win" | "loss" | "push" | "blackjack" | "bust";
  payout: number;
}
```

### HandValue

```typescript
interface HandValue {
  value: number; // 0-21
  isSoft: boolean; // Ace counted as 11
}
```

## Common Patterns

### Get Current Hand's Value

```typescript
const currentHand = gameState.playerHands[gameState.currentHandIndex];
const handValue = getHandValue(currentHand.cards);
console.log(`Hand value: ${handValue.value}, Soft: ${handValue.isSoft}`);
```

### Check if Action is Valid

```typescript
const hand = gameState.playerHands[gameState.currentHandIndex];

if (canDoubleDown(hand.cards) && gameState.balance >= hand.bet) {
  gameState.doubleDown();
}

if (canSplit(hand.cards) && gameState.balance >= hand.bet) {
  gameState.split();
}
```

### Calculate Total Winnings

```typescript
const totalWinnings = gameState.roundResults.reduce((sum, result) => {
  return sum + (result.payout - result.playerBet);
}, 0);

console.log(`Total net: $${totalWinnings.toFixed(2)}`);
```

## Extension Examples

### Adding Sound Effects

```typescript
// src/games/blackjack/sounds.ts
import { Howl } from "howler";

export const sounds = {
  cardFlip: new Howl({ src: ["/sounds/card-flip.mp3"], volume: 0.5 }),
  chipClink: new Howl({ src: ["/sounds/chip-clink.mp3"], volume: 0.4 }),
  win: new Howl({ src: ["/sounds/win.mp3"], volume: 0.6 }),
  bust: new Howl({ src: ["/sounds/bust.mp3"], volume: 0.5 }),
};

// In BlackjackGame.tsx
useEffect(() => {
  if (gameState.message.includes("Blackjack")) {
    sounds.win.play();
  }
}, [gameState.message]);
```

### Adding Statistics

```typescript
// src/games/blackjack/hooks/useStats.ts
import { useGameStore } from "../store";

export const useStats = () => {
  const roundResults = useGameStore((s) => s.roundResults);

  return {
    totalHands: roundResults.length,
    totalWagered: roundResults.reduce((sum, r) => sum + r.playerBet, 0),
    totalWon: roundResults.reduce(
      (sum, r) => sum + (r.payout - r.playerBet),
      0
    ),
    winRate:
      roundResults.filter((r) => r.outcome === "win").length /
      roundResults.length,
    biggestWin: Math.max(...roundResults.map((r) => r.payout - r.playerBet)),
  };
};
```

### Custom Animations

```typescript
// In any component using Framer Motion
import { motion } from "framer-motion";

<motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.6 }}>
  {/* Content */}
</motion.div>;
```

### Testing Game Logic

```typescript
import {
  getHandValue,
  isBlackjack,
  evaluateWin,
  calculatePayout,
} from "@/games/blackjack/gameLogic";

describe("Blackjack Logic", () => {
  it("should detect blackjack", () => {
    const cards = [
      { suit: "hearts", rank: "A", id: "1" },
      { suit: "spades", rank: "K", id: "2" },
    ];
    expect(isBlackjack(cards)).toBe(true);
  });

  it("should calculate correct payout", () => {
    const playerCards = [
      /* 21 */
    ];
    const dealerCards = [
      /* 20 */
    ];
    const payout = calculatePayout(playerCards, dealerCards, 100);
    expect(payout).toBe(200); // 1:1 win
  });
});
```

## Performance Optimization Tips

1. **Memoize Heavy Computations**

   ```typescript
   const handValue = useMemo(() => getHandValue(cards), [cards]);
   ```

2. **Lazy Load Rules Modal**

   ```typescript
   const RulesModal = lazy(() => import("./RulesModal"));
   ```

3. **Debounce Balance Updates**

   ```typescript
   const debouncedBalance = useDeferredValue(balance);
   ```

4. **Use useCallback for Event Handlers**
   ```typescript
   const handleHit = useCallback(() => gameState.hit(), [gameState]);
   ```

## Debugging Tips

### Check Game State

```typescript
// In browser console
window.useGameStore.getState();
```

### Log Game Actions

```typescript
// Add to store.ts
console.log("Action:", "hit", "New hand:", hand);
```

### Validate Hand Values

```typescript
const hand = /* ... */;
const { value, isSoft } = getHandValue(hand);
console.log(`Hand: ${hand.cards.map(c => c.rank).join(',')} = ${value} (soft: ${isSoft})`);
```

## Deployment Checklist

- [ ] Test all game phases thoroughly
- [ ] Verify all payouts are accurate
- [ ] Test keyboard shortcuts
- [ ] Test on mobile/tablet
- [ ] Verify deck reshuffle works
- [ ] Check balance updates correctly
- [ ] Validate side bet payouts
- [ ] Test insurance flow
- [ ] Verify split logic
- [ ] Check animation performance

---

Happy extending! The codebase is clean, well-organized, and ready for modifications. 🎉
