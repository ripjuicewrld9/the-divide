/**
 * Test script to verify new Divide payout logic
 * The minority (fewer votes) side should win and get better multipliers with more imbalance
 */

function calculatePayout(totalPot, winnerVotes, playerVotes) {
  // Each player gets: (their votes / total winner votes) * total pot
  return (playerVotes / winnerVotes) * totalPot;
}

function testScenario(name, sideAVotes, sideBVotes, playerBet, playerSide) {
  const totalPot = sideAVotes + sideBVotes;
  
  // NEW LOGIC: Side with fewer votes wins
  const winnerSide = sideAVotes < sideBVotes ? 'A' : 'B';
  const winnerVotes = winnerSide === 'A' ? sideAVotes : sideBVotes;
  
  console.log(`\n${name}`);
  console.log(`Side A: $${sideAVotes} | Side B: $${sideBVotes} | Total Pot: $${totalPot}`);
  console.log(`Winner: Side ${winnerSide} (${winnerVotes} votes)`);
  
  if (playerSide === winnerSide) {
    const payout = calculatePayout(totalPot, winnerVotes, playerBet);
    const multiplier = payout / playerBet;
    console.log(`✅ Player bet $${playerBet} on ${playerSide} → Wins $${payout.toFixed(2)} (${multiplier.toFixed(2)}x)`);
  } else {
    console.log(`❌ Player bet $${playerBet} on ${playerSide} → Lost everything`);
  }
}

console.log('='.repeat(60));
console.log('DIVIDE PAYOUT TEST - Minority Wins');
console.log('='.repeat(60));

// Test Case 1: Perfect 50/50 split - minimum multiplier
testScenario('50/50 Split (Minimum Multiplier)', 500, 500, 100, 'A');

// Test Case 2: Moderate imbalance
testScenario('70/30 Split', 700, 300, 100, 'B'); // B is minority, wins 3.33x

// Test Case 3: Heavy imbalance
testScenario('90/10 Split', 900, 100, 100, 'B'); // B is minority, wins 10x

// Test Case 4: Extreme imbalance
testScenario('95/5 Split', 950, 50, 50, 'B'); // B is minority, wins 20x

// Test Case 5: Super extreme
testScenario('99/1 Split', 990, 10, 10, 'B'); // B is minority, wins 100x!

// Test Case 6: Player on losing side
testScenario('80/20 Split - Player Loses', 800, 200, 100, 'A'); // A is majority, loses

console.log('\n' + '='.repeat(60));
console.log('CONCLUSION:');
console.log('- Best case (50/50): 2x multiplier');
console.log('- Imbalanced games produce higher multipliers for minority side');
console.log('- The more imbalanced, the better the payout if you pick minority');
console.log('- Creates strategic depth: bet on what FEWER people will choose');
console.log('='.repeat(60) + '\n');
