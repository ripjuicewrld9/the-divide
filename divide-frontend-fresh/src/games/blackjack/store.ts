import { create } from 'zustand';
import { GameState, Hand, Card, RoundResult } from './types';
import {
  createDeck,
  shuffleDeck,
  getHandValue,
  isBust,
  isBlackjack,
  dealerShouldHit,
  evaluateWin,
  calculatePayout,
  canSplit,
  canDoubleDown,
  evaluatePerfectPairs,
  evaluateTwentyPlusThree,
  evaluateBlazingSevens,
  getPerfectPairsRatio,
  getTwentyPlusThreeRatio,
  getBlazingSevenRatio,
} from './gameLogic';

interface GameStore extends GameState {
  // Setup actions
  initGame: () => void;
  resetGame: () => void;
  setInitialBalance: (amount: number) => void;
  getBalance: () => number;

  // Betting actions
  setBetAmount: (amount: number) => void;
  setBetMode: (mode: 'main' | 'perfectPairs' | 'twentyPlusThree' | 'blazingSevens') => void;
  placeBet: () => void;
  clearBets: () => void;
  undoBet: () => void;
  redoBet: () => void;

  // Game actions
  deal: () => void;
  hit: () => void;
  stand: () => void;
  doubleDown: () => void;
  split: () => void;
  takeInsurance: () => void;
  declineInsurance: () => void;

  // Dealer actions
  playDealer: () => void;
  settleHands: () => void;

  // UI actions
  setMessage: (message: string) => void;
}

const INITIAL_STATE: GameState = {
  balance: 0, // Must be set from user balance via setInitialBalance - never use hardcoded default
  deck: [],
  playerHands: [],
  dealerHand: { cards: [], bet: 0, sideBets: { perfectPairs: 0, twentyPlusThree: 0, blazingSevens: 0 }, betPlacementOrder: [], isDealerHand: true },
  currentDealRatios: {},
  currentHandIndex: 0,
  gamePhase: 'betting',
  message: 'Place your bets',
  betAmount: 5.0,
  betPlacementMode: 'main',
  insuranceOffered: false,
  insuranceBet: 0,
  roundResults: [],
  streakCount: 0,
  streakType: null,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...INITIAL_STATE,

  initGame: () => {
    set({
      ...INITIAL_STATE,
      deck: createDeck(),
    });
  },

  resetGame: () => {
    const state = get();
    let newDeck = state.deck;
    // Reshuffle if less than 50 cards remain
    if (newDeck.length < 50) {
      newDeck = createDeck();
    }
    set({
      playerHands: [],
      dealerHand: { cards: [], bet: 0, sideBets: { perfectPairs: 0, twentyPlusThree: 0, blazingSevens: 0 }, betPlacementOrder: [], isDealerHand: true },
      currentHandIndex: 0,
      gamePhase: 'betting',
      message: 'Place your bets',
      betPlacementMode: 'main',
      insuranceOffered: false,
      insuranceBet: 0,
      deck: newDeck,
      roundResults: [],
      currentDealRatios: {
        perfectPairsRatio: undefined,
        twentyPlusThreeRatio: undefined,
        blazingSevenRatio: undefined,
      },
      lastBets: state.lastBets // preserve lastBets for redo
    });
  },

  setInitialBalance: (amount) => {
    set({ balance: amount });
  },

  getBalance: () => {
    return get().balance;
  },

  setBetAmount: (amount) => {
    set({ betAmount: amount });
  },

  setBetMode: (mode) => {
    set({ betPlacementMode: mode, betAmount: 5.0 });
  },

  placeBet: () => {
    const state = get();
    const amount = state.betAmount;
    const mode = state.betPlacementMode;

    if (!mode) {
      set({ message: 'Select a bet type first' });
      return;
    }

    // Balance is already in dollars from AuthContext
    console.log('[placeBet] amount:', amount, 'mode:', mode, 'balance before:', state.balance);

    if (state.balance < amount) {
      console.log('[placeBet] insufficient balance:', state.balance, '<', amount);
      set({ message: 'Insufficient balance' });
      return;
    }

    if (mode === 'main') {
      if (state.playerHands.length === 0) {
        const newHand: Hand = {
          cards: [],
          bet: amount,
          sideBets: { perfectPairs: 0, twentyPlusThree: 0, blazingSevens: 0 },
          betPlacementOrder: [['main', amount]],
          isDealerHand: false,
        };
        set({
          playerHands: [newHand],
          balance: state.balance - amount,
        });
      } else {
        const hands = [...state.playerHands];
        hands[0].bet += amount;
        hands[0].betPlacementOrder.push(['main', amount]);
        set({
          playerHands: hands,
          balance: state.balance - amount,
        });
      }
    } else if (state.playerHands.length > 0) {
      const hands = [...state.playerHands];
      if (mode === 'perfectPairs') {
        hands[0].sideBets.perfectPairs += amount;
      } else if (mode === 'twentyPlusThree') {
        hands[0].sideBets.twentyPlusThree += amount;
      } else if (mode === 'blazingSevens') {
        hands[0].sideBets.blazingSevens += amount;
      }
      hands[0].betPlacementOrder.push([mode as 'perfectPairs' | 'twentyPlusThree' | 'blazingSevens', amount]);
      set({
        playerHands: hands,
        balance: state.balance - amount,
      });
    } else {
      // Need main bet first before side bets
      set({ message: 'Place main bet first' });
    }
  },

  clearBets: () => {
    const state = get();

    // Calculate total bets to return to balance (already in dollars)
    let totalBetsToReturn = 0;
    if (state.playerHands.length > 0) {
      const hand = state.playerHands[0];
      totalBetsToReturn = hand.bet +
        hand.sideBets.perfectPairs +
        hand.sideBets.twentyPlusThree +
        hand.sideBets.blazingSevens;
    }

    set({
      playerHands: [],
      dealerHand: { cards: [], bet: 0, sideBets: { perfectPairs: 0, twentyPlusThree: 0, blazingSevens: 0 }, betPlacementOrder: [], isDealerHand: true },
      balance: state.balance + totalBetsToReturn,
    });
  },

  undoBet: () => {
    const state = get();

    if (state.playerHands.length === 0) return;

    const hand = state.playerHands[0];

    if (hand.betPlacementOrder.length === 0) return;

    // Pop the last placed bet from the order array (create new array to avoid mutation)
    const newPlacementOrder = [...hand.betPlacementOrder];
    const lastPlacement = newPlacementOrder.pop();
    if (!lastPlacement) return;

    const [mode, amount] = lastPlacement;
    const hands = [...state.playerHands];
    const updatedHand = { ...hand, betPlacementOrder: newPlacementOrder };

    if (mode === 'main') {
      updatedHand.bet -= amount;
    } else if (mode === 'perfectPairs') {
      updatedHand.sideBets = { ...updatedHand.sideBets, perfectPairs: updatedHand.sideBets.perfectPairs - amount };
    } else if (mode === 'twentyPlusThree') {
      updatedHand.sideBets = { ...updatedHand.sideBets, twentyPlusThree: updatedHand.sideBets.twentyPlusThree - amount };
    } else if (mode === 'blazingSevens') {
      updatedHand.sideBets = { ...updatedHand.sideBets, blazingSevens: updatedHand.sideBets.blazingSevens - amount };
    }

    hands[0] = updatedHand;

    set({
      playerHands: hands,
      balance: state.balance + amount,
    });
  },

  redoBet: () => {
    const state = get();

    if (!state.lastBets) return;
    // Allow redo in gameOver phase (playerHands exist but game is over)
    // Don't redo if we're in betting phase and bets have already been placed
    if (state.gamePhase === 'betting' && state.playerHands.length > 0 && state.playerHands[0].betPlacementOrder.length > 0) return;

    const totalBetAmount = state.lastBets.mainBet + state.lastBets.perfectPairs + state.lastBets.twentyPlusThree + state.lastBets.blazingSevens;

    if (state.balance < totalBetAmount) {
      set({ message: 'Insufficient balance for redo' });
      return;
    }

    const betPlacementOrder: Array<[mode: 'main' | 'perfectPairs' | 'twentyPlusThree' | 'blazingSevens', amount: number]> = [];

    if (state.lastBets.mainBet > 0) betPlacementOrder.push(['main', state.lastBets.mainBet]);
    if (state.lastBets.perfectPairs > 0) betPlacementOrder.push(['perfectPairs', state.lastBets.perfectPairs]);
    if (state.lastBets.twentyPlusThree > 0) betPlacementOrder.push(['twentyPlusThree', state.lastBets.twentyPlusThree]);
    if (state.lastBets.blazingSevens > 0) betPlacementOrder.push(['blazingSevens', state.lastBets.blazingSevens]);

    const hand: Hand = {
      cards: [],
      bet: state.lastBets.mainBet,
      sideBets: {
        perfectPairs: state.lastBets.perfectPairs,
        twentyPlusThree: state.lastBets.twentyPlusThree,
        blazingSevens: state.lastBets.blazingSevens,
      },
      betPlacementOrder,
      isDealerHand: false,
    };

    set({
      playerHands: [hand],
      balance: state.balance - totalBetAmount,
      message: 'Bets placed',
    });
  },

  deal: () => {
    const state = get();

    if (state.playerHands.length === 0 || state.playerHands[0].bet === 0) {
      set({ message: 'Place a bet first' });
      return;
    }

    // Save current bets for redo functionality
    const currentHand = state.playerHands[0];
    const lastBets = {
      mainBet: currentHand.bet,
      perfectPairs: currentHand.sideBets.perfectPairs,
      twentyPlusThree: currentHand.sideBets.twentyPlusThree,
      blazingSevens: currentHand.sideBets.blazingSevens,
    };

    let deck = [...state.deck];
    const hands: Hand[] = [];
    const dealerHand: Hand = {
      cards: [],
      bet: 0,
      sideBets: { perfectPairs: 0, twentyPlusThree: 0, blazingSevens: 0 },
      betPlacementOrder: [],
      isDealerHand: true,
    };

    // Deal 2 cards to each player hand
    for (let i = 0; i < state.playerHands.length; i++) {
      const hand: Hand = { ...state.playerHands[i], cards: [] };
      const card1 = deck.pop();
      const card2 = deck.pop();
      if (card1) hand.cards.push(card1);
      if (card2) hand.cards.push(card2);
      hands.push(hand);
    }

    // Evaluate Perfect Pairs immediately after initial deal (before any hits)
    let perfectPairsBalance = 0;
    // Also prepare twentyPlusThree and blazingSevens ratios to show immediately after deal
    let currentPerfectPairsRatio: string | undefined = undefined;
    let currentTwentyPlusThreeRatio: string | undefined = undefined;
    let currentBlazingSevenRatio: string | undefined = undefined;
    for (let i = 0; i < hands.length; i++) {
      if (hands[i].sideBets.perfectPairs > 0) {
        const perfectPairsPayout = evaluatePerfectPairs(hands[i]);
        if (perfectPairsPayout > 0) {
          perfectPairsBalance += perfectPairsPayout;
        }
        // compute ratio label for UI
        currentPerfectPairsRatio = getPerfectPairsRatio(hands[i]);
      }
    }

    // Deal 2 cards to dealer
    const dealerCard1 = deck.pop();
    const dealerCard2 = deck.pop();
    if (dealerCard1) dealerHand.cards.push(dealerCard1);
    if (dealerCard2) dealerHand.cards.push(dealerCard2);

    // After dealer up-card is available, compute 21+3 and blazing 7s ratios for UI
    const dealerUp = dealerHand.cards[0];
    if (dealerUp) {
      for (let i = 0; i < hands.length; i++) {
        const h = hands[i];
        if (h.sideBets.twentyPlusThree > 0 && !currentTwentyPlusThreeRatio) {
          currentTwentyPlusThreeRatio = getTwentyPlusThreeRatio(h.cards, dealerUp);
        }
        if (h.sideBets.blazingSevens > 0 && !currentBlazingSevenRatio) {
          currentBlazingSevenRatio = getBlazingSevenRatio(h.cards, dealerUp);
        }
        // If perfect pairs wasn't computed earlier (no sideBets when loop ran), compute now
        if (h.sideBets.perfectPairs > 0 && !currentPerfectPairsRatio) {
          currentPerfectPairsRatio = getPerfectPairsRatio(h);
        }
      }
    }

    set({
      deck,
      playerHands: hands,
      dealerHand,
      currentDealRatios: {
        perfectPairsRatio: currentPerfectPairsRatio,
        twentyPlusThreeRatio: currentTwentyPlusThreeRatio,
        blazingSevenRatio: currentBlazingSevenRatio,
      },
      lastBets,
      gamePhase: 'playing',
      currentHandIndex: 0,
      message: 'Your turn',
    });

    // Check for blackjacks and insurance
    const playerBJ = hands.some(h => isBlackjack(h.cards));
    const dealerUpCard = dealerHand.cards[0];

    if (dealerUpCard && dealerUpCard.rank === 'A') {
      set({ gamePhase: 'insurance', message: 'Insurance offered', insuranceOffered: true });
    } else if (playerBJ && dealerUpCard && dealerUpCard.rank !== 'A') {
      set({ gamePhase: 'settling', message: 'Blackjack!' });
      get().settleHands();
    }
  },

  hit: () => {
    const state = get();
    if (state.gamePhase !== 'playing') return;

    let deck = [...state.deck];
    const hands = [...state.playerHands];
    const hand = hands[state.currentHandIndex];

    const card = deck.pop();
    if (card) hand.cards.push(card);

    set({ deck, playerHands: hands });

    const handValue = getHandValue(hand.cards).value;

    if (isBust(hand.cards)) {
      if (state.currentHandIndex < hands.length - 1) {
        set({ currentHandIndex: state.currentHandIndex + 1, message: 'Bust! Next hand' });
      } else {
        set({ gamePhase: 'settling', message: 'Dealer\'s turn' });
        setTimeout(() => get().playDealer(), 500);
      }
    } else if (handValue === 21) {
      // Auto-stand on 21
      if (state.currentHandIndex < hands.length - 1) {
        set({ currentHandIndex: state.currentHandIndex + 1, message: '21! Next hand' });
      } else {
        set({ gamePhase: 'settling', message: 'Dealer\'s turn' });
        setTimeout(() => get().playDealer(), 500);
      }
    }
  },

  stand: () => {
    const state = get();
    if (state.gamePhase !== 'playing') return;

    if (state.currentHandIndex < state.playerHands.length - 1) {
      set({ currentHandIndex: state.currentHandIndex + 1, message: 'Next hand' });
    } else {
      set({ gamePhase: 'settling', message: 'Dealer\'s turn' });
      setTimeout(() => get().playDealer(), 500);
    }
  },

  doubleDown: () => {
    const state = get();
    if (state.gamePhase !== 'playing') return;

    const hand = state.playerHands[state.currentHandIndex];

    if (!canDoubleDown(hand.cards) || state.balance < hand.bet) {
      set({ message: 'Cannot double down' });
      return;
    }

    let deck = [...state.deck];
    const hands = [...state.playerHands];
    const currentHand = hands[state.currentHandIndex];

    const card = deck.pop();
    if (card) currentHand.cards.push(card);

    // Create a new hand object with doubled bet to ensure Zustand detects the change
    const newBet = currentHand.bet * 2;
    const updatedHand: Hand = {
      ...currentHand,
      bet: newBet,
      cards: currentHand.cards,
    };
    hands[state.currentHandIndex] = updatedHand;
    set({ deck, playerHands: hands, balance: state.balance - hand.bet });

    if (isBust(updatedHand.cards)) {
      if (state.currentHandIndex < hands.length - 1) {
        set({ currentHandIndex: state.currentHandIndex + 1, message: 'Bust! Next hand' });
      } else {
        set({ gamePhase: 'settling', message: 'Dealer\'s turn' });
        setTimeout(() => get().playDealer(), 500);
      }
    } else {
      get().stand();
    }
  },

  split: () => {
    const state = get();
    if (state.gamePhase !== 'playing') return;

    const hand = state.playerHands[state.currentHandIndex];

    if (!canSplit(hand.cards) || state.balance < hand.bet || state.playerHands.length >= 2) {
      set({ message: 'Cannot split' });
      return;
    }

    let deck = [...state.deck];
    const hands = [...state.playerHands];

    const card1 = hand.cards[0];
    const card2 = hand.cards[1];

    const card1New = deck.pop();
    const card2New = deck.pop();

    // Create two new hands
    const newHand1: Hand = {
      cards: card1New ? [card1, card1New] : [card1],
      bet: hand.bet,
      sideBets: hand.sideBets,
      betPlacementOrder: hand.betPlacementOrder,
      isDealerHand: false,
    };

    const newHand2: Hand = {
      cards: card2New ? [card2, card2New] : [card2],
      bet: hand.bet,
      sideBets: { perfectPairs: 0, twentyPlusThree: 0, blazingSevens: 0 },
      betPlacementOrder: hand.betPlacementOrder,
      isDealerHand: false,
    };

    hands.splice(state.currentHandIndex, 1, newHand1, newHand2);

    set({
      deck,
      playerHands: hands,
      balance: state.balance - hand.bet,
      message: 'Hand split',
    });
  },

  takeInsurance: () => {
    const state = get();
    const insuranceAmount = state.playerHands[0].bet / 2;

    set({
      insuranceBet: insuranceAmount,
      balance: state.balance - insuranceAmount,
      insuranceOffered: false,
      message: 'Insurance taken',
    });

    // Check if dealer has blackjack
    if (isBlackjack(state.dealerHand.cards)) {
      set({ gamePhase: 'settling', message: 'Dealer has Blackjack!' });
      setTimeout(() => get().settleHands(), 500);
    } else {
      set({ gamePhase: 'playing', message: 'Your turn' });
    }
  },

  declineInsurance: () => {
    const state = get();

    // Check if dealer has blackjack
    if (isBlackjack(state.dealerHand.cards)) {
      set({ gamePhase: 'settling', message: 'Dealer has Blackjack!', insuranceOffered: false });
      setTimeout(() => get().settleHands(), 500);
    } else {
      set({
        gamePhase: 'playing',
        insuranceOffered: false,
        message: 'Your turn',
      });
    }
  },

  playDealer: () => {
    const state = get();

    // Check if any player hand is not busted - if all busted, dealer doesn't need to play
    const allBusted = state.playerHands.every(hand => isBust(hand.cards));

    let deck = [...state.deck];
    const dealerHand = { ...state.dealerHand, cards: [...state.dealerHand.cards] };

    // Only dealer draws if at least one player hand is still alive
    if (!allBusted) {
      while (dealerShouldHit(dealerHand.cards)) {
        const card = deck.pop();
        if (card) dealerHand.cards.push(card);
      }
    }

    set({
      deck,
      dealerHand,
      gamePhase: 'settling',
      message: 'Settling hands',
    });

    setTimeout(() => get().settleHands(), 500);
  },

  settleHands: () => {
    const state = get();
    let balance = state.balance;
    const results: RoundResult[] = [];

    for (let i = 0; i < state.playerHands.length; i++) {
      const hand = state.playerHands[i];
      const outcome = evaluateWin(hand.cards, state.dealerHand.cards);
      let payout = 0;
      let finalOutcome: 'win' | 'loss' | 'push' | 'blackjack' | 'bust' = outcome as any;

      if (isBust(hand.cards)) {
        finalOutcome = 'bust';
        payout = 0;
      } else {
        payout = calculatePayout(hand.cards, state.dealerHand.cards, hand.bet, state.insuranceBet);
      }

      // Deduct bet, then add payout (handles win/loss/push correctly)
      // balance -= hand.bet; // REMOVED: Bet is already deducted when placed
      balance += payout;

      // Calculate side bet payouts
      let perfectPairsPayout = 0;
      let perfectPairsResult: 'win' | 'loss' | null = null;
      if (hand.sideBets.perfectPairs > 0) {
        perfectPairsPayout = evaluatePerfectPairs(hand);
        perfectPairsResult = perfectPairsPayout > 0 ? 'win' : 'loss';
        balance += perfectPairsPayout;
      }

      let twentyPlusThreePayout = 0;
      let twentyPlusThreeResult: 'win' | 'loss' | null = null;
      if (hand.sideBets.twentyPlusThree > 0) {
        const tp3Eval = evaluateTwentyPlusThree(hand.cards, state.dealerHand.cards[0]);
        twentyPlusThreePayout = tp3Eval(hand.sideBets.twentyPlusThree);
        twentyPlusThreeResult = twentyPlusThreePayout > 0 ? 'win' : 'loss';
        balance += twentyPlusThreePayout;
      }

      let blazingSevensPayout = 0;
      let blazingSevenResult: 'win' | 'loss' | null = null;
      if (hand.sideBets.blazingSevens > 0) {
        const bsEval = evaluateBlazingSevens(hand.cards, state.dealerHand.cards[0]);
        blazingSevensPayout = bsEval(hand.sideBets.blazingSevens);
        blazingSevenResult = blazingSevensPayout > 0 ? 'win' : 'loss';
        balance += blazingSevensPayout;
      }

      results.push({
        timestamp: Date.now(),
        playerBet: hand.bet,
        playerTotal: getHandValue(hand.cards).value,
        dealerTotal: getHandValue(state.dealerHand.cards).value,
        outcome: finalOutcome,
        payout,
        perfectPairsBet: hand.sideBets.perfectPairs,
        perfectPairsResult,
        perfectPairsPayout,
        perfectPairsRatio: hand.sideBets.perfectPairs > 0 ? getPerfectPairsRatio(hand) : undefined,
        twentyPlusThreeBet: hand.sideBets.twentyPlusThree,
        twentyPlusThreeResult,
        twentyPlusThreePayout,
        twentyPlusThreeRatio: hand.sideBets.twentyPlusThree > 0 ? getTwentyPlusThreeRatio(hand.cards, state.dealerHand.cards[0]) : undefined,
        blazingSevensBet: hand.sideBets.blazingSevens,
        blazingSevenResult,
        blazingSevensPayout,
        blazingSevenRatio: hand.sideBets.blazingSevens > 0 ? getBlazingSevenRatio(hand.cards, state.dealerHand.cards[0]) : undefined,
      });
    }

    // Update streak
    const wins = results.filter(r => r.outcome === 'win' || r.outcome === 'blackjack').length;
    const losses = results.filter(r => r.outcome === 'loss' || r.outcome === 'bust').length;

    let streakCount = state.streakCount;
    let streakTypeValue = state.streakType;

    if (wins > losses) {
      if (streakTypeValue === 'win') {
        streakCount++;
      } else {
        streakCount = 1;
        streakTypeValue = 'win';
      }
    } else if (losses > wins) {
      if (streakTypeValue === 'loss') {
        streakCount++;
      } else {
        streakCount = 1;
        streakTypeValue = 'loss';
      }
    } else {
      streakCount = 0;
      streakTypeValue = null;
    }

    const newRoundResults = [...results, ...state.roundResults].slice(0, 10);

    set({
      balance: Math.max(0, balance),
      roundResults: newRoundResults,
      streakCount,
      streakType: streakTypeValue,
      gamePhase: 'gameOver',
      message: `Round over. Balance: $${balance.toFixed(2)}`,
    });
  },

  setMessage: (message) => {
    set({ message });
  },
}));
