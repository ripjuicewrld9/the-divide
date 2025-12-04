// Node.js script to remove all game-related code from server.js
const fs = require('fs');
const path = require('path');

const inputFile = 'server.js';
const outputFile = 'server-cleaned.js';

console.log('Reading server.js...');
const content = fs.readFileSync(inputFile, 'utf8');
const lines = content.split('\n');

console.log(`Total lines: ${lines.length}`);

// Define sections to remove (line ranges are 0-indexed)
const sectionsToRemove = [
  // Keno rate limiter
  { start: 275, end: 293, name: 'Keno rate limiter' },
  
  // Rugged constants and Keno provably fair helpers  
  { start: 2593, end: 2662, name: 'Rugged constants and Keno helpers' },
  
  // Keno play route
  { start: 3289, end: 3547, name: 'Keno /play route' },
  
  // Keno rounds route
  { start: 3548, end: 3558, name: 'Keno /rounds route' },
  
  // Keno leaderboard
  { start: 4053, end: 4091, name: 'Keno leaderboard route' },
  
  // Plinko leaderboard
  { start: 4091, end: 4129, name: 'Plinko leaderboard route' },
  
  // Blackjack leaderboard
  { start: 4129, end: 4167, name: 'Blackjack leaderboard route' },
  
  // Keno odds route
  { start: 4183, end: 4226, name: 'Keno /odds route' },
  
  // Keno paytables route
  { start: 4227, end: 4241, name: 'Keno /paytables route' },
  
  // Keno RTP route
  { start: 4242, end: 4253, name: 'Keno /rtp route' },
  
  // Wheel routes registration
  { start: 4301, end: 4308, name: 'Wheel routes registration' },
  
  // ensureRuggedInit function
  { start: 4309, end: 4365, name: 'ensureRuggedInit function' },
  
  // Wheel Socket.IO namespace
  { start: 4580, end: 4662, name: 'Wheel Socket.IO namespace' },
  
  // Rugged helper functions
  { start: 4720, end: 4881, name: 'Rugged helper functions' },
  
  // Admin rugged consolidate route
  { start: 4984, end: 4990, name: 'Admin /rugged/consolidate route' },
];

// Create a set of line numbers to skip
const linesToSkip = new Set();
sectionsToRemove.forEach(section => {
  for (let i = section.start; i <= section.end; i++) {
    linesToSkip.add(i);
  }
  console.log(`Marking lines ${section.start}-${section.end} for removal: ${section.name}`);
});

// Filter out lines
const outputLines = [];
let inGameSection = false;
let gameSectionName = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Skip marked lines
  if (linesToSkip.has(i)) {
    continue;
  }
  
  // Additional pattern-based filtering for game content in /api/recent-games and similar endpoints
  // Check if we're entering a game-specific section
  if (line.includes('// Fetch Keno games') || line.includes('const kenoGames =')) {
    inGameSection = true;
    gameSectionName = 'Keno';
    continue;
  }
  if (line.includes('// Fetch Plinko games') || line.includes('const plinkoGames =')) {
    inGameSection = true;
    gameSectionName = 'Plinko';
    continue;
  }
  if (line.includes('// Fetch Blackjack games') || line.includes('const blackjackGames =')) {
    inGameSection = true;
    gameSectionName = 'Blackjack';
    continue;
  }
  if (line.includes('// Fetch Rugged buys') || line.includes('const ruggedBuys =') || 
      line.includes('// Fetch user\'s Rugged') || line.includes('const ruggedSells =')) {
    inGameSection = true;
    gameSectionName = 'Rugged';
    continue;
  }
  if (line.includes('// Fetch top Keno games')) {
    inGameSection = true;
    gameSectionName = 'Keno Top';
    continue;
  }
  if (line.includes('// Fetch top Plinko games')) {
    inGameSection = true;
    gameSectionName = 'Plinko Top';
    continue;
  }
  if (line.includes('// Fetch top Blackjack games')) {
    inGameSection = true;
    gameSectionName = 'Blackjack Top';
    continue;
  }
  if (line.includes('// Fetch user\'s Keno games')) {
    inGameSection = true;
    gameSectionName = 'User Keno';
    continue;
  }
  if (line.includes('// Fetch user\'s Plinko games')) {
    inGameSection = true;
    gameSectionName = 'User Plinko';
    continue;
  }
  if (line.includes('// Fetch user\'s Blackjack games')) {
    inGameSection = true;
    gameSectionName = 'User Blackjack';
    continue;
  }
  
  // Check if we're exiting a game section (usually followed by Case Battles or sorting)
  if (inGameSection) {
    if (line.includes('// Fetch Case Battles') || 
        line.includes('// Sort all games by time') ||
        line.includes('games.sort((a, b)')) {
      inGameSection = false;
      outputLines.push(line);
      continue;
    }
    // Skip all lines while in game section
    continue;
  }
  
  outputLines.push(line);
}

// Write output
const outputContent = outputLines.join('\n');
fs.writeFileSync(outputFile, outputContent, 'utf8');

console.log(`\n✅ Cleanup complete!`);
console.log(`Original lines: ${lines.length}`);
console.log(`Cleaned lines: ${outputLines.length}`);
console.log(`Removed lines: ${lines.length - outputLines.length}`);
console.log(`Output written to: ${outputFile}`);
console.log(`\nPlease review ${outputFile} and if satisfied, run:`);
console.log(`  mv ${outputFile} ${inputFile}`);
