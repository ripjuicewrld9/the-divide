export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
}

export interface Hand {
  cards: Card[];
  bet: number;
  sideBets: {
    perfectPairs: number;
    twentyPlusThree: number;
    blazingSevens: number;
  };
  betPlacementOrder: Array<[mode: 'main' | 'perfectPairs' | 'twentyPlusThree' | 'blazingSevens', amount: number]>;
  isDealerHand: boolean;
}

export interface GameState {
  balance: number;
  deck: Card[];
  playerHands: Hand[];
  dealerHand: Hand;
  currentDealRatios?: {
    perfectPairsRatio?: string;
    twentyPlusThreeRatio?: string;
    blazingSevenRatio?: string;
  };
  currentHandIndex: number;
  gamePhase: 'betting' | 'dealing' | 'playing' | 'insurance' | 'settling' | 'gameOver';
  message: string;
  betAmount: number;
  betPlacementMode: 'main' | 'perfectPairs' | 'twentyPlusThree' | 'blazingSevens' | null;
  insuranceOffered: boolean;
  insuranceBet: number;
  roundResults: RoundResult[];
  streakCount: number;
  streakType: 'win' | 'loss' | null;
  lastBets?: {
    mainBet: number;
    perfectPairs: number;
    twentyPlusThree: number;
    blazingSevens: number;
  };
}

export interface RoundResult {
  timestamp: number;
  playerBet: number;
  playerTotal: number;
  dealerTotal: number;
  outcome: 'win' | 'loss' | 'push' | 'blackjack' | 'bust';
  payout: number;
  perfectPairsBet?: number;
  perfectPairsResult?: 'win' | 'loss' | null;
  perfectPairsPayout?: number;
  perfectPairsRatio?: string; // e.g., "25:1", "12:1", "5:1"
  twentyPlusThreeBet?: number;
  twentyPlusThreeResult?: 'win' | 'loss' | null;
  twentyPlusThreePayout?: number;
  twentyPlusThreeRatio?: string; // e.g., "3:1", "2:1", "1:1"
  blazingSevensBet?: number;
  blazingSevenResult?: 'win' | 'loss' | null;
  blazingSevensPayout?: number;
  blazingSevenRatio?: string; // e.g., "500:1", "50:1", "3:1"
}

export interface HandValue {
  value: number;
  isSoft: boolean;
}
