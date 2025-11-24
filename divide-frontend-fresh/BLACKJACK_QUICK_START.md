# Blackjack Game - Quick Reference Card

## 🎮 Playing Right Now

Visit: **http://localhost:5174/blackjack**

## 📁 All Game Files

```
src/games/blackjack/
├── 🎮 components/        (9 React components)
├── 📜 gameLogic.ts       (all game rules)
├── 💾 store.ts           (state management)
├── 🎨 styles.css         (animations)
├── 📖 README.md          (player guide)
└── 🔧 DEVELOPER_GUIDE.md (API reference)
```

## ⌨️ Keyboard Controls

| Key   | Action                            |
| ----- | --------------------------------- |
| **H** | Hit (take another card)           |
| **S** | Stand (keep current hand)         |
| **D** | Double Down (double bet + 1 card) |
| **P** | Split (split matching pairs)      |

## 💰 Chip Denominations

- $1 (Red)
- $5 (Blue)
- $25 (Green)
- $100 (Gray)
- $500 (Purple)

## 🎯 Betting Areas

1. **Main**: Your main bet (required)
2. **Perfect Pairs**: Optional (pairs pay 5:1-25:1)
3. **21+3**: Optional (flush/straight/trips pay 5:1-100:1)
4. **777**: Optional (sevens pay 3:1-1000:1 JACKPOT!)

## 🎲 Game Rules

### Dealer

- Stands on hard 17+
- Hits on soft 17 (Ace + 6)

### You Can

- Hit, Stand, Double Down, Split
- Re-split unlimited times
- Double down after split
- Take insurance (if dealer shows Ace)

### Payouts

- Blackjack: 3:2 (pays $1.50 per $1 bet)
- Win: 1:1 (pays $1 per $1 bet)
- Push: 1:1 (get bet back)
- Bust: Lose your bet
- Insurance: 2:1 (if dealer has blackjack)

## 📊 Side Bet Payouts

### Perfect Pairs

- Any pair (different color): 5:1
- Same color pair: 12:1
- Perfect pair (same card): 25:1

### 21+3

- Flush (all same suit): 5:1
- Straight (consecutive): 10:1
- Three of a Kind: 30:1
- Straight Flush: 40:1
- Suited Three of a Kind: 100:1

### 777 Blazing Sevens

- Any 7 in your hand: 3:1
- Two 7s: 50:1
- Two 7s (same suit): 100:1
- Three 7s: 200:1
- Three 7s (same suit): 500:1
- **THREE 7s SAME SUIT + DEALER 7 SAME SUIT: 1000:1** 🎰

## 🎊 Game Flow

1. **Place Bets** → 2. **Click Deal** → 3. **Play Hands** → 4. **See Results** → 5. **Click Next Hand**

## 💡 Tips

- Start with $1 chips to learn
- Basic strategy: Double 11, Split 8s/Aces, Hit 16 vs dealer 7+
- Side bets are fun but optional
- Insurance is usually a bad bet (mathematically)
- Watch your balance!

## 🔗 Documentation Files

- **README.md** - How to play (detailed)
- **DEVELOPER_GUIDE.md** - API for extending
- **BLACKJACK_IMPLEMENTATION_SUMMARY.md** - Feature checklist

## 🛠️ Building & Running

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Visit game
http://localhost:5174/blackjack
```

## 🎯 Game States

| State     | What Happens                           |
| --------- | -------------------------------------- |
| Betting   | Place bets and click Deal              |
| Dealing   | Cards are dealt                        |
| Playing   | Hit/Stand/Double/Split                 |
| Insurance | Choose to insure (if dealer shows Ace) |
| Settling  | Dealer plays, results calculated       |
| Game Over | View results, click Next Hand          |

## 📱 Screen Sizes

- **Desktop**: 4-column layout (controls + game table)
- **Tablet**: 2-column layout
- **Mobile**: Single column (responsive)

## ✨ Features

- ✅ Full 6-deck shoe
- ✅ Unlimited re-splitting
- ✅ Insurance
- ✅ 3 side bets
- ✅ Game history (last 10)
- ✅ Streak tracker
- ✅ Smooth animations
- ✅ Keyboard shortcuts
- ✅ Rules modal
- ✅ Responsive design

## 🎰 Fun Facts

- House edge: ~0.5% (same as real casinos)
- Deck shuffles every game with crypto random
- Rules match professional casino Blackjack
- $10,000 starting balance
- Unlimited playing time!

## 🐛 Something Wrong?

Check browser console (F12) for errors and report them. All code is TypeScript-safe so errors are unlikely.

## 📞 Need Help?

1. Check the **README.md** in `/src/games/blackjack/`
2. Read **DEVELOPER_GUIDE.md** for technical details
3. Review **BLACKJACK_IMPLEMENTATION_SUMMARY.md** for features

## 🚀 That's It!

You have a complete, professional Blackjack game ready to play!

Enjoy! 🃏♠️♥️♣️♦️
