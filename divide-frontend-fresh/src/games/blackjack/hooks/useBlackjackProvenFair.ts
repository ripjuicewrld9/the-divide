import { useState, useCallback } from 'react';

/**
 * Hook: useBlackjackProvenFair
 * Manages provably fair game sessions and verification
 */
export function useBlackjackProvenFair() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [serverHash, setServerHash] = useState<string | null>(null);
  const [blockHash, setBlockHash] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const apiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000';
  const token = localStorage.getItem('token');

  /**
   * Start a new game session
   * Generates server seed and block hash, publishes server hash
   */
  const startSession = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/api/blackjack/session/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to start session');

      const data = await response.json();
      setGameId(data.gameId);
      setServerHash(data.serverHash);
      setBlockHash(data.blockHash);

      console.log(`[ProvenFair] Session started: ${data.gameId}`);
      console.log(`[ProvenFair] Server Hash: ${data.serverHash.substring(0, 16)}...`);

      return {
        gameId: data.gameId,
        serverHash: data.serverHash,
        blockHash: data.blockHash,
      };
    } catch (error) {
      console.error('[ProvenFair] Error starting session:', error);
      throw error;
    }
  }, [apiUrl, token]);

  /**
   * Save game result to backend with RNG data
   */
  const saveGameResult = useCallback(
    async (
      mainBet: number,
      perfectPairsBet: number,
      twentyPlusThreeBet: number,
      blazingSevensBet: number,
      playerCards: string[],
      dealerCards: string[],
      playerTotal: number,
      dealerTotal: number,
      mainResult: string,
      mainPayout: number,
      perfectPairsResult: string,
      perfectPairsPayout: number,
      twentyPlusThreeResult: string,
      twentyPlusThreePayout: number,
      blazingSevenResult: string,
      blazingSevensPayout: number,
      balance: number
    ) => {
      if (!gameId) throw new Error('No active game session');

      try {
        const response = await fetch(`${apiUrl}/api/blackjack/game/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            gameId,
            mainBet,
            perfectPairsBet,
            twentyPlusThreeBet,
            blazingSevensBet,
            playerCards,
            dealerCards,
            playerTotal,
            dealerTotal,
            mainResult,
            mainPayout,
            perfectPairsResult,
            perfectPairsPayout,
            twentyPlusThreeResult,
            twentyPlusThreePayout,
            blazingSevenResult,
            blazingSevensPayout,
            balance,
          }),
        });

        if (!response.ok) throw new Error('Failed to save game');

        const data = await response.json();
        console.log(`[ProvenFair] Game saved: ${data.gameId}`);
        return data;
      } catch (error) {
        console.error('[ProvenFair] Error saving game:', error);
        throw error;
      }
    },
    [gameId, apiUrl, token]
  );

  /**
   * Verify game fairness
   * Reveals seeds and verifies all rolls match expected outcomes
   */
  const verifyGame = useCallback(
    async (gameIdToVerify?: string) => {
      const id = gameIdToVerify || gameId;
      if (!id) throw new Error('No game to verify');

      setIsVerifying(true);
      try {
        const response = await fetch(`${apiUrl}/api/blackjack/game/${id}/verify`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error('Failed to verify game');

        const data = await response.json();
        setVerificationResult(data);

        console.log(`[ProvenFair] Verification Result:`, data);

        if (data.valid) {
          console.log(
            `%c✅ GAME VERIFIED - All rolls are fair!`,
            'color: green; font-weight: bold; font-size: 14px'
          );
        } else {
          console.warn(`%c⚠️ VERIFICATION FAILED - ${data.message}`, 'color: red; font-weight: bold');
        }

        return data;
      } catch (error) {
        console.error('[ProvenFair] Error verifying game:', error);
        throw error;
      } finally {
        setIsVerifying(false);
      }
    },
    [gameId, apiUrl, token]
  );

  /**
   * Fetch game history with stats
   */
  const getGameHistory = useCallback(
    async (limit = 50, skip = 0) => {
      try {
        const response = await fetch(
          `${apiUrl}/api/blackjack/games?limit=${limit}&skip=${skip}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) throw new Error('Failed to fetch game history');

        const data = await response.json();
        return data;
      } catch (error) {
        console.error('[ProvenFair] Error fetching history:', error);
        throw error;
      }
    },
    [apiUrl, token]
  );

  return {
    // State
    gameId,
    serverHash,
    blockHash,
    verificationResult,
    isVerifying,

    // Methods
    startSession,
    saveGameResult,
    verifyGame,
    getGameHistory,

    // Reset for next session
    resetSession: () => {
      setGameId(null);
      setServerHash(null);
      setBlockHash(null);
      setVerificationResult(null);
    },
  };
}

export default useBlackjackProvenFair;
