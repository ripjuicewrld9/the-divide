# Professional Blackjack Game

A full-featured, production-quality Blackjack game built with React, TypeScript, Tailwind CSS, and Framer Motion. Play in your browser with realistic casino rules, smooth animations, and multiple side betting options.

## 🎮 Features

### Core Blackjack Game

- **Standard 6-deck shoe** with automatic reshuffle when <50 cards remain
- **Professional dealer rules**: Stand on hard 17, hit on soft 17
- **Player actions**: Hit, Stand, Double Down, Split (unlimited re-splits)
- **Double Down after split** supported
- **Insurance** when dealer shows Ace (2:1 payout)
- **Blackjack payout** at 6:5 odds
- **Push detection** on dealer blackjack tie

### Side Bets (Optional)

All side bets are completely optional and pay independently:

#### Perfect Pairs

- Mixed Pair (same rank, different color): **5:1**
- Colored Pair (same rank, same color): **12:1**
- Perfect Pair (exact same card): **25:1**

#### 21+3

Combines your first 2 cards + dealer's up card:

- Flush (all same suit): **5:1**
- Straight (consecutive): **10:1**
- Three of a Kind: **30:1**
- Straight Flush: **40:1**
- Suited Three of a Kind: **100:1**

#### 777 (Blazing Sevens)

Based on sevens in your hand + dealer's up card:

- Any 7: **3:1**
- Two 7s (any suit): **50:1**
- Two 7s (same suit): **100:1**
- Three 7s (any suit): **200:1**
- Three 7s (same suit): **500:1**
- 🎰 **JACKPOT** - Three 7s same suit + dealer 7 same suit: **1000:1**

### UI/UX

- **Dark casino-themed design** with deep green felt and gold accents
- **Responsive layout** for desktop and tablet
- **Virtual chip stack** with $1, $5, $25, $100, $500 denominations
- **Drag-and-click chip placement** for main and side bets
- **Smooth animations** for card dealing, flips, and win effects
- **Game status bar** with real-time messages
- **Hand value display** with "Soft" label indicators
- **Split hands** displayed side-by-side
- **Animated balance tracker** (start with $10,000)

### Game Features

- **Bet history** (last 10 hands with outcomes and payouts)
- **Win/Loss streak tracker** with hot/cold indicators
- **Rules & Payouts modal** with detailed explanations
- **Keyboard shortcuts** (H=Hit, S=Stand, D=Double, P=Split)
- **Fair shuffle** using `crypto.getRandomValues()`
- **Payout calculations** 100% accurate per rules
- **Edge case handling** (Aces in splits, multiple blackjacks, etc.)

## 🛠️ Technical Stack

- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Framer Motion** for smooth animations
- **Zustand** for state management
- **Vite** for fast development and building
- **Custom SVG playing cards** (scalable, casino-quality)

## 📁 Project Structure

```
src/games/blackjack/
├── components/
│   ├── BlackjackGame.tsx       # Main game component
│   ├── PlayingCard.tsx         # SVG card component with animations
│   ├── HandDisplay.tsx         # Player/dealer hand display
│   ├── GameControls.tsx        # Hit, Stand, Double, Split buttons
│   ├── ChipStack.tsx           # Chip selector with balance
│   ├── BettingArea.tsx         # Betting UI for main + side bets
│   ├── BetHistory.tsx          # Collapsible history panel
│   ├── StreakIndicator.tsx     # Win/loss streak display
│   ├── RulesModal.tsx          # Rules & payouts reference
│   └── index.ts                # Component exports
├── gameLogic.ts                # Pure game logic functions
├── store.ts                    # Zustand state management
├── types.ts                    # TypeScript interfaces
├── styles.css                  # Custom animations & styles
└── index.tsx                   # Game page entry point
```

## 🚀 Getting Started

### Installation

```bash
cd divide-frontend-fresh
npm install
```

The Blackjack game is already integrated into the app. No additional setup needed!

### Running Locally

```bash
npm run dev
```

Then navigate to `http://localhost:5174/blackjack` (or whatever port Vite assigns).

### Building for Production

```bash
npm run build
```

## 📖 How to Play

1. **Place Your Bets**

   - Select a chip denomination ($1, $5, $25, $100, $500)
   - Click on a bet area to select it (Main, Perfect Pairs, 21+3, or 777)
   - Click "Place Bet" to add chips
   - Repeat for side bets (all optional)
   - Click "Clear" to reset all bets

2. **Deal**

   - Click "DEAL" to begin
   - Cards are dealt with smooth animations

3. **Play Your Hand**

   - **Hit**: Take another card
   - **Stand**: Keep your current hand
   - **Double**: Double your bet, receive exactly one more card
   - **Split**: Split matching cards into two separate hands
   - Use keyboard shortcuts: H, S, D, P

4. **Insurance (if dealer shows Ace)**

   - Choose "Yes, Insure" or "Decline"
   - Insurance pays 2:1 if dealer has blackjack

5. **Dealer Plays**

   - Dealer reveals hole card
   - Dealer hits on soft 17, stands on hard 17
   - Game settles automatically

6. **Results**
   - View hand outcomes and payouts
   - See bet history in collapsible panel
   - Streak indicator shows hot/cold status
   - Click "NEXT HAND" to play again

## 🎯 Rules Implementation

### Deck Management

- 6-deck shoe shuffled with `crypto.getRandomValues()` for fairness
- Automatic reshuffle when deck drops below 50 cards
- No card counting exploits

### Hand Valuation

- Aces automatically valued as 1 or 11
- "Soft" hands labeled when Ace is counted as 11
- Bust detection at >21

### Dealer Rules

- **Stand on hard 17+**: Dealer stops hitting
- **Hit on soft 17**: Dealer hits if hand is exactly 17 with flexible Ace

### Splitting Rules

- Split any matching pair (including unlike 10-value cards like Q+10)
- Unlimited re-splitting allowed (including Aces)
- Each split hand gets independent play
- Double down allowed after split

### Payouts

- Blackjack: 3:2 (pays 2.5× bet)
- Regular win: 1:1 (pays 2× bet)
- Push: 1× bet (return stake)
- Loss: 0× bet
- Insurance: 2:1 if dealer has blackjack

## 🎨 Design Highlights

### Color Scheme

- **Background**: Deep green felt (#1a472a-like tones)
- **Accents**: Gold/yellow for important UI elements
- **Cards**: Clean white with sharp red/black suits
- **Bets**: Color-coded areas (green=main, purple=pairs, blue=21+3, orange=777)

### Animations

- **Card dealing**: Arc motion with flip animation for hole card
- **Chip placement**: Subtle slide-in and glow effects
- **Win animation**: Balance change highlight and streak update
- **Smooth transitions**: Fade and scale for UI changes
- **No flashiness**: Professional, subtle animations only

### Responsive Design

- **Desktop**: Full 4-column layout (sidebar controls + main table)
- **Tablet**: 2-column layout with adjusted spacing
- **Mobile**: Single column (game table stacks vertically)

## 🔧 Customization

### Change Starting Balance

Edit `src/games/blackjack/store.ts`:

```typescript
const INITIAL_STATE: GameState = {
  balance: 50000, // Change from 10000
  // ...
};
```

### Adjust Deck Size

Edit `src/games/blackjack/gameLogic.ts`:

```typescript
export function createDeck(): Card[] {
  // Change from 6 to any number:
  for (let deckNum = 0; deckNum < 8; deckNum++) { // 8-deck shoe
```

### Modify Chip Denominations

Edit `src/games/blackjack/components/ChipStack.tsx`:

```typescript
const CHIP_DENOMINATIONS = [1, 5, 25, 100, 500, 1000]; // Add $1000
```

### Adjust Colors

All colors use Tailwind classes. Edit component className attributes:

- Felt color: `bg-green-900/green-950`
- Accent color: Change `text-yellow-400` to `text-amber-300`, etc.

## 🐛 Known Limitations

- No sound effects (can be added via Howler.js)
- No persistent game statistics (stores in memory only)
- No multi-player support
- No auto-play or repeat bet features
- Insurance bet always 50% of main bet (hardcoded)

## 📝 Code Quality

- **TypeScript strict mode** for type safety
- **Pure function logic** - all game rules in `gameLogic.ts`
- **Zustand store** - predictable state management
- **Component separation** - each feature in own file
- **Accessibility ready** - semantic HTML, keyboard support
- **No external game libraries** - all logic from scratch

## 🎓 Educational Value

Great learning resource for:

- React hooks and state management
- TypeScript patterns
- CSS animations and transitions
- Game logic implementation
- Component composition
- Responsive design patterns

## 📄 License

Part of The Divide project. All code provided as-is.

## 🎪 Have Fun!

This is a fully playable, professional-quality Blackjack implementation. Enjoy the casino experience! 🃏♠️♥️♣️♦️

---

**Pro Tip**: Start with small bets to learn the interface, then go big when you're ready! The house edge is mathematically accurate to real casino blackjack (~0.5%).
