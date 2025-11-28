import { Card, Suit, Rank, HandValue, Hand } from './types';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  let cardId = 0;
  
  for (let deckNum = 0; deckNum < 6; deckNum++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({
          suit,
          rank,
          id: `${cardId++}`,
        });
      }
    }
  }
  
  return shuffleDeck(deck);
}

export function shuffleDeck(deck: Card[]): Card[] {
  const newDeck = [...deck];
  const array = new Uint32Array(newDeck.length);
  crypto.getRandomValues(array);
  
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor((array[i] / 0x100000000) * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  
  return newDeck;
}

export function getHandValue(cards: Card[]): HandValue {
  let value = 0;
  let aces = 0;
  
  for (const card of cards) {
    if (card.rank === 'A') {
      aces++;
      value += 11;
    } else if (['J', 'Q', 'K'].includes(card.rank)) {
      value += 10;
    } else {
      value += parseInt(card.rank);
    }
  }
  
  // Adjust for aces
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  
  return {
    value,
    isSoft: aces > 0 && value <= 11,
  };
}

export function isBust(cards: Card[]): boolean {
  return getHandValue(cards).value > 21;
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && getHandValue(cards).value === 21;
}

export function canSplit(cards: Card[]): boolean {
  if (cards.length !== 2) return false;
  
  // Only allow splitting identical ranks (pair of Kings, pair of Queens, etc.)
  // NOT splitting cards that just have the same value (e.g., King and Queen both = 10)
  return cards[0].rank === cards[1].rank;
}

export function canDoubleDown(cards: Card[]): boolean {
  if (cards.length !== 2) return false;
  
  const handValue = getHandValue(cards);
  // Restrict doubling to hard 9, 10, 11 only (house-favorable rule)
  return handValue.value >= 9 && handValue.value <= 11 && !handValue.isSoft;
}

export function dealerShouldHit(dealerCards: Card[]): boolean {
  const handValue = getHandValue(dealerCards);
  
  if (handValue.value >= 17) {
    if (handValue.value === 17 && handValue.isSoft) {
      return true; // Hit on soft 17
    }
    return false; // Stand on hard 17 or higher
  }
  
  return true; // Hit on 16 or lower
}

export function evaluateWin(playerCards: Card[], dealerCards: Card[]): 'win' | 'loss' | 'push' | 'blackjack' {
  const playerValue = getHandValue(playerCards);
  const dealerValue = getHandValue(dealerCards);
  
  const playerBJ = isBlackjack(playerCards);
  const dealerBJ = isBlackjack(dealerCards);
  
  if (playerBJ && dealerBJ) return 'push';
  if (playerBJ) return 'blackjack';
  if (dealerBJ) return 'loss';
  
  if (playerValue.value > 21) return 'loss';
  if (dealerValue.value > 21) return 'win';
  
  if (playerValue.value === dealerValue.value) return 'push';
  if (playerValue.value > dealerValue.value) return 'win';
  
  return 'loss';
}

export function calculatePayout(
  playerCards: Card[],
  dealerCards: Card[],
  baseBet: number,
  insuranceBet?: number,
  insuranceLost?: boolean
): number {
  const outcome = evaluateWin(playerCards, dealerCards);
  let payout = 0;
  
  console.log('[calculatePayout] baseBet:', baseBet, 'outcome:', outcome);
  
  switch (outcome) {
    case 'blackjack':
      payout = baseBet * 2.2; // 6:5 blackjack
      break;
    case 'win':
      payout = baseBet * 2; // 1:1 win
      break;
    case 'push':
      payout = baseBet; // return bet
      break;
    case 'loss':
      payout = 0;
      break;
  }
  
  console.log('[calculatePayout] calculated payout:', payout);
  
  // Handle insurance
  if (insuranceBet) {
    if (isBlackjack(dealerCards) && !insuranceLost) {
      payout += insuranceBet * 3; // 2:1 insurance win (insure $X, win $2X + $X return)
    }
  }
  
  return payout;
}

// Side bet evaluations
export function evaluatePerfectPairs(hand: Hand): number {
  // Only evaluate first 2 cards (Perfect Pairs resolves at deal time)
  if (hand.cards.length < 2 || hand.sideBets.perfectPairs === 0) return 0;
  
  const card1 = hand.cards[0];
  const card2 = hand.cards[1];
  
  if (card1.rank !== card2.rank) return 0;
  
  const isRedSuit = (suit: Suit) => suit === 'hearts' || suit === 'diamonds';
  
  // Perfect Pair: same rank, same suit
  if (card1.suit === card2.suit) {
    console.log('[PerfectPairs] PERFECT PAIR hit:', card1.rank + card1.suit, card2.rank + card2.suit, 'payout:', hand.sideBets.perfectPairs * 26);
    return hand.sideBets.perfectPairs * 26; // 25:1 payout (includes original bet)
  }
  
  // Colored Pair: same rank, same color (red/red or black/black), but different suits
  if (isRedSuit(card1.suit) === isRedSuit(card2.suit)) {
    console.log('[PerfectPairs] COLORED PAIR hit:', card1.rank + card1.suit, card2.rank + card2.suit, 'payout:', hand.sideBets.perfectPairs * 13);
    return hand.sideBets.perfectPairs * 13; // 12:1 payout
  }
  
  // Mixed Pair: same rank, different color
  console.log('[PerfectPairs] MIXED PAIR hit:', card1.rank + card1.suit, card2.rank + card2.suit, 'payout:', hand.sideBets.perfectPairs * 6);
  return hand.sideBets.perfectPairs * 6; // 5:1 payout
}

export function evaluateTwentyPlusThree(
  playerCards: Card[],
  dealerUpCard: Card
): (bet: number) => number {
  if (playerCards.length !== 2 || !dealerUpCard) {
    return (bet: number) => 0;
  }
  
  const threeCards = [...playerCards, dealerUpCard];
  
  // Check for suited three of a kind
  if (
    threeCards[0].rank === threeCards[1].rank &&
    threeCards[1].rank === threeCards[2].rank &&
    threeCards[0].suit === threeCards[1].suit &&
    threeCards[1].suit === threeCards[2].suit
  ) {
    return (bet: number) => bet * 101; // 100:1 payout
  }
  
  // Check for three of a kind
  if (
    threeCards[0].rank === threeCards[1].rank &&
    threeCards[1].rank === threeCards[2].rank
  ) {
    return (bet: number) => bet * 31; // 30:1 payout
  }
  
  // Check for straight flush
  const isStraightFlush = (cards: Card[]): boolean => {
    if (cards[0].suit !== cards[1].suit || cards[1].suit !== cards[2].suit) return false;
    
    const getRankOrder = (rank: Rank): number => {
      if (rank === 'A') return 1;
      if (rank === 'K') return 13;
      if (rank === 'Q') return 12;
      if (rank === 'J') return 11;
      return parseInt(rank);
    };
    
    const ranks = cards.map(c => getRankOrder(c.rank)).sort((a, b) => a - b);
    return ranks[1] === ranks[0] + 1 && ranks[2] === ranks[1] + 1;
  };
  
  if (isStraightFlush(threeCards)) {
    return (bet: number) => bet * 41; // 40:1 payout
  }
  
  // Check for flush
  if (
    threeCards[0].suit === threeCards[1].suit &&
    threeCards[1].suit === threeCards[2].suit
  ) {
    return (bet: number) => bet * 6; // 5:1 payout
  }
  
  // Check for straight
  const isStraight = (cards: Card[]): boolean => {
    const getRankOrder = (rank: Rank): number => {
      if (rank === 'A') return 1;
      if (rank === 'K') return 13;
      if (rank === 'Q') return 12;
      if (rank === 'J') return 11;
      return parseInt(rank);
    };
    
    const ranks = cards.map(c => getRankOrder(c.rank)).sort((a, b) => a - b);
    return ranks[1] === ranks[0] + 1 && ranks[2] === ranks[1] + 1;
  };
  
  if (isStraight(threeCards)) {
    return (bet: number) => bet * 11; // 10:1 payout
  }
  
  return (bet: number) => 0;
}

export function evaluateBlazingSevens(
  playerCards: Card[],
  dealerUpCard: Card
): (bet: number) => number {
  if (playerCards.length !== 2 || !dealerUpCard) {
    return (bet: number) => 0;
  }
  
  const playerSevens = playerCards.filter(c => c.rank === '7').length;
  const dealerHasSeven = dealerUpCard.rank === '7';
  
  // Three 7s with same suit, all matching dealer's 7
  if (
    playerSevens === 2 &&
    playerCards[0].suit === playerCards[1].suit &&
    dealerHasSeven &&
    playerCards[0].suit === dealerUpCard.suit
  ) {
    return (bet: number) => bet * 1001; // 1000:1 progressive jackpot
  }
  
  // Three 7s with same suit
  if (playerSevens === 2 && playerCards[0].suit === playerCards[1].suit && dealerHasSeven) {
    return (bet: number) => bet * 501; // 500:1 payout
  }
  
  // Three 7s (any suit)
  if (playerSevens === 2 && dealerHasSeven) {
    return (bet: number) => bet * 201; // 200:1 payout
  }
  
  // Two 7s with same suit
  if (playerSevens === 2 && playerCards[0].suit === playerCards[1].suit) {
    return (bet: number) => bet * 101; // 100:1 payout
  }
  
  // Two 7s (any suit)
  if (playerSevens === 2) {
    return (bet: number) => bet * 51; // 50:1 payout
  }
  
  // Any 7
  if (playerSevens === 1) {
    return (bet: number) => bet * 4; // 3:1 payout
  }
  
  return (bet: number) => 0;
}

// Helper functions to get payout ratio labels
export function getPerfectPairsRatio(hand: Hand): string {
  // Only evaluate first 2 cards (Perfect Pairs resolves at deal time)
  if (hand.cards.length < 2 || hand.sideBets.perfectPairs === 0) return '';
  
  const card1 = hand.cards[0];
  const card2 = hand.cards[1];
  
  if (card1.rank !== card2.rank) return '';
  
  // Perfect Pair: same rank, same suit
  if (card1.suit === card2.suit) {
    return '25:1';
  }
  
  // Colored Pair: same rank, same color
  const isRedSuit = (suit: Suit) => suit === 'hearts' || suit === 'diamonds';
  if (isRedSuit(card1.suit) === isRedSuit(card2.suit)) {
    return '12:1';
  }
  
  // Mixed Pair: same rank, different color
  return '5:1';
}

export function getTwentyPlusThreeRatio(playerCards: Card[], dealerUpCard: Card): string {
  if (playerCards.length !== 2 || !dealerUpCard) return '';
  
  const threeCards = [...playerCards, dealerUpCard];
  
  // Check for suited three of a kind
  if (threeCards.every(c => c.suit === threeCards[0].suit) && 
      threeCards.every(c => c.rank === threeCards[0].rank)) {
    return '100:1';
  }
  
  // Check for straight flush
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const rankValues = threeCards.map(c => ranks.indexOf(c.rank === 'A' ? 'A' : c.rank === '10' ? '10' : c.rank));
  const sorted = [...rankValues].sort((a, b) => a - b);
  const isStraight = (sorted[1] === sorted[0] + 1 && sorted[2] === sorted[1] + 1) ||
                     (sorted[0] === 0 && sorted[1] === 9 && sorted[2] === 12); // A-10-K
  
  if (isStraight && threeCards.every(c => c.suit === threeCards[0].suit)) {
    return '40:1';
  }
  
  // Check for three of a kind
  if (threeCards[0].rank === threeCards[1].rank && threeCards[1].rank === threeCards[2].rank) {
    return '30:1';
  }
  
  // Check for flush
  if (threeCards.every(c => c.suit === threeCards[0].suit)) {
    return '5:1';
  }
  
  // Check for straight
  if (isStraight) {
    return '10:1';
  }
  
  return '';
}

export function getBlazingSevenRatio(playerCards: Card[], dealerUpCard: Card): string {
  if (playerCards.length !== 2 || !dealerUpCard) return '';
  
  const playerSevens = playerCards.filter(c => c.rank === '7').length;
  const dealerSeven = dealerUpCard.rank === '7' ? 1 : 0;
  const totalSevens = playerSevens + dealerSeven;
  
  // Three suited 7s
  if (totalSevens === 3 && 
      playerCards[0].suit === playerCards[1].suit && 
      playerCards[0].suit === dealerUpCard.suit &&
      playerCards[0].rank === '7' && playerCards[1].rank === '7') {
    return '500:1';
  }
  
  // Three 7s (not all suited)
  if (totalSevens === 3) {
    return '50:1';
  }
  
  // Two suited 7s
  if (playerSevens === 2 && playerCards[0].suit === playerCards[1].suit) {
    return '50:1';
  }
  
  // Two 7s (not suited)
  if (playerSevens === 2) {
    return '10:1';
  }
  
  // Any 7
  if (playerSevens === 1) {
    return '3:1';
  }
  
  return '';
}
