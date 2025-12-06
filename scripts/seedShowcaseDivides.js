// scripts/seedShowcaseDivides.js
// Run with: node scripts/seedShowcaseDivides.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Divide from '../models/Divide.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/divide';

// Helper to generate realistic vote history
function generateVoteHistory(optionA, optionB, finalShortsA, finalShortsB, votes = 50) {
    const history = [];
    let runningA = 0;
    let runningB = 0;
    const startTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

    for (let i = 0; i < votes; i++) {
        const targetA = finalShortsA * ((i + 1) / votes);
        const targetB = finalShortsB * ((i + 1) / votes);
        const addA = Math.max(0, targetA - runningA + (Math.random() - 0.5) * 20);
        const addB = Math.max(0, targetB - runningB + (Math.random() - 0.5) * 20);

        // Randomly pick A or B
        const side = Math.random() > (finalShortsA / (finalShortsA + finalShortsB)) ? 'B' : 'A';
        const amount = side === 'A' ? addA : addB;

        if (side === 'A') runningA += amount;
        else runningB += amount;

        history.push({
            timestamp: new Date(startTime + (i * (24 * 60 * 60 * 1000 / votes))),
            username: `player${Math.floor(Math.random() * 9000) + 1000}`,
            userId: `user_${Math.random().toString(36).substr(2, 9)}`,
            side,
            amount: Math.round(amount * 100) / 100,
            shortsA: Math.round(runningA * 100) / 100,
            shortsB: Math.round(runningB * 100) / 100,
            pot: Math.round((runningA + runningB) * 100) / 100,
        });
    }

    return history;
}

const showcaseDivides = [
    {
        title: "The eternal tech debate",
        optionA: "iPhone",
        optionB: "Android",
        imageA: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
        imageB: "https://upload.wikimedia.org/wikipedia/commons/d/d7/Android_robot.svg",
        category: "Entertainment",
        shortsA: 8472.50,  // More people shorted iPhone
        shortsB: 1893.25,  // Fewer shorted Android = ANDROID WINS!
        pot: 10365.75,
        status: "ended",
        winnerSide: "B",  // Android wins (minority)
        loserSide: "A",
        paidOut: 10054.78,
        houseCut: 310.97,
        likes: 847,
        dislikes: 23,
        isUserCreated: false,
    },
    {
        title: "The gaming wars continue",
        optionA: "PC",
        optionB: "Console",
        imageA: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Windows_logo_-_2012_%28dark_blue%29.svg/1024px-Windows_logo_-_2012_%28dark_blue%29.svg.png",
        imageB: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/PlayStation_logo.svg/1280px-PlayStation_logo.svg.png",
        category: "Entertainment",
        shortsA: 12847.00,  // PC gamers went hard
        shortsB: 845.50,    // Tiny minority on console = CONSOLE WINS HUGE
        pot: 13692.50,
        status: "ended",
        winnerSide: "B",  // Console wins (15x multiplier!)
        loserSide: "A",
        paidOut: 13281.73,
        houseCut: 410.77,
        likes: 1203,
        dislikes: 156,
        isUserCreated: false,
    },
    {
        title: "2024 Election: Who wins?",
        optionA: "Trump",
        optionB: "Kamala",
        imageA: "https://upload.wikimedia.org/wikipedia/commons/5/56/Donald_Trump_official_portrait.jpg",
        imageB: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Kamala_Harris_Vice_Presidential_Portrait.jpg/800px-Kamala_Harris_Vice_Presidential_Portrait.jpg",
        category: "Politics",
        shortsA: 15234.00,  // Most shorted Trump (expected him to lose)
        shortsB: 31847.50,  // Even more shorted Kamala
        pot: 47081.50,
        status: "ended",
        winnerSide: "A",  // Trump wins (fewer shorts = minority = winner)
        loserSide: "B",
        paidOut: 45669.06,
        houseCut: 1412.44,
        likes: 3421,
        dislikes: 892,
        isUserCreated: false,
    },
    {
        title: "Was it the Salute?",
        optionA: "Yes",
        optionB: "No",
        imageA: "https://media.cnn.com/api/v1/images/stellar/prod/gettyimages-2194760984.jpg?c=16x9&q=h_438,w_780,c_fill",
        imageB: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/X_Corporate_Logo.svg/1200px-X_Corporate_Logo.svg.png",
        category: "Politics",
        shortsA: 2341.00,   // Few said yes
        shortsB: 24567.75,  // Most said no
        pot: 26908.75,
        status: "ended",
        winnerSide: "A",  // YES wins (minority!) - controversial outcome
        loserSide: "B",
        paidOut: 26101.49,
        houseCut: 807.26,
        likes: 5678,
        dislikes: 2341,
        isUserCreated: false,
    },
    {
        title: "Best fast food",
        optionA: "McDonald's",
        optionB: "Chick-fil-A",
        imageA: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/McDonald%27s_Golden_Arches.svg/1200px-McDonald%27s_Golden_Arches.svg.png",
        imageB: "https://upload.wikimedia.org/wikipedia/en/thumb/0/02/Chick-fil-A_Logo.svg/1200px-Chick-fil-A_Logo.svg.png",
        category: "Entertainment",
        shortsA: 3421.25,
        shortsB: 7823.50,
        pot: 11244.75,
        status: "ended",
        winnerSide: "A",  // McDonald's wins (minority)
        loserSide: "B",
        paidOut: 10907.41,
        houseCut: 337.34,
        likes: 432,
        dislikes: 67,
        isUserCreated: false,
    },
    {
        title: "Will BTC hit $100k in 2024?",
        optionA: "Yes",
        optionB: "No",
        imageA: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/1200px-Bitcoin.svg.png",
        imageB: "https://upload.wikimedia.org/wikipedia/commons/e/e6/Negative-sign-in-circle.svg",
        category: "Crypto",
        shortsA: 18923.00,  // Most bet yes
        shortsB: 67234.50,  // Majority bet no
        pot: 86157.50,
        status: "ended",
        winnerSide: "A",  // YES WINS - Bitcoin did hit $100k!
        loserSide: "B",
        paidOut: 83572.78,
        houseCut: 2584.72,
        likes: 8934,
        dislikes: 234,
        isUserCreated: false,
    },
];

async function seedShowcaseDivides() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        for (const divideData of showcaseDivides) {
            // Check if already exists
            const existing = await Divide.findOne({ title: divideData.title, status: 'ended' });
            if (existing) {
                console.log(`Skipping "${divideData.title}" - already exists`);
                continue;
            }

            // Generate vote history
            const voteHistory = generateVoteHistory(
                divideData.optionA,
                divideData.optionB,
                divideData.shortsA,
                divideData.shortsB,
                Math.floor(40 + Math.random() * 60) // 40-100 votes
            );

            // Compute totals
            const totalShorts = divideData.shortsA + divideData.shortsB;

            const divide = new Divide({
                ...divideData,
                totalShorts,
                voteHistory,
                endTime: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)), // Random time in last 7 days
                createdAt: new Date(Date.now() - Math.floor(7 + Math.random() * 7) * 24 * 60 * 60 * 1000), // 7-14 days ago
                likedBy: [],
                dislikedBy: [],
                shorts: [], // Don't expose individual shorts
            });

            await divide.save();
            console.log(`✅ Created: "${divideData.title}" | Winner: ${divideData.winnerSide} | Pot: $${divideData.pot.toLocaleString()}`);
        }

        console.log('\n🎉 Showcase divides seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding divides:', error);
        process.exit(1);
    }
}

seedShowcaseDivides();
