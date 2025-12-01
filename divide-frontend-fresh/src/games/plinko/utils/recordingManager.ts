/**
 * Generate pre-recorded physics simulations for Plinko
 * Run this once to generate recordings, then save them
 */

import { PlinkoRecorder } from '../lib/PlinkoRecorder';
import type { Recording } from '../lib/PlinkoRecorder';

// Generate recordings for all row counts
export async function generateAllRecordings() {
  const rowCounts = [8, 12, 16] as const;
  const allRecordings: Record<string, Recording[]> = {};

  for (const rows of rowCounts) {
    console.log(`\n🎬 Recording ${rows} rows...`);
    const recorder = new PlinkoRecorder(rows);
    
    await recorder.recordAllBins((bin, totalBins) => {
      console.log(`  Bin ${bin}/${totalBins} complete`);
    });

    // Save recordings
    const recordings = recorder.getAllRecordings();
    recordings.forEach((recs, key) => {
      allRecordings[key] = recs;
    });
  }

  console.log('\n✅ All recordings complete!');
  console.log(`Total recordings: ${Object.keys(allRecordings).length} bin configurations`);

  return allRecordings;
}

// Serialize recordings to JSON
export function serializeRecordings(recordings: Map<string, Recording[]>): string {
  const obj: Record<string, Recording[]> = {};
  recordings.forEach((value, key) => {
    obj[key] = value;
  });
  return JSON.stringify(obj);
}

// Deserialize recordings from JSON
export function deserializeRecordings(json: string): Map<string, Recording[]> {
  const obj = JSON.parse(json);
  const map = new Map<string, Recording[]>();
  Object.entries(obj).forEach(([key, value]) => {
    map.set(key, value as Recording[]);
  });
  return map;
}

// Save recordings to database
export async function saveRecordingsToDatabase(rowCount: number, recordings: Map<string, Recording[]>) {
  const json = serializeRecordings(recordings);
  const obj = JSON.parse(json);
  
  console.log(`💾 Saving ${Object.keys(obj).length} recording sets for ${rowCount} rows to database...`);
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'production' ? '' : 'http://localhost:3000')}/api/plinko/recordings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        rowCount,
        recordings: obj,
      }),
    });
    
    if (response.ok) {
      console.log(`✅ Successfully saved recordings for ${rowCount} rows to database`);
      return true;
    } else {
      const errorText = await response.text();
      console.error('Failed to save recordings:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('Error saving recordings to database:', error);
    return false;
  }
}

// Load recordings from database
export async function loadRecordingsFromDatabase(rowCount: number): Promise<Map<string, Recording[]> | null> {
  console.log(`📥 Attempting to load recordings for ${rowCount} rows from database...`);
  
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'production' ? '' : 'http://localhost:3000')}/api/plinko/recordings/${rowCount}`);
    
    if (response.ok) {
      const obj = await response.json();
      const json = JSON.stringify(obj);
      const recordings = deserializeRecordings(json);
      
      // Validate we have recordings for ALL bins
      const numBins = rowCount + 1;
      let hasAllBins = true;
      for (let i = 0; i < numBins; i++) {
        const key = `${rowCount}-${i}`;
        if (!recordings.has(key) || recordings.get(key)!.length === 0) {
          console.warn(`⚠️ Missing recordings for bin ${i}`);
          hasAllBins = false;
        }
      }
      
      if (!hasAllBins) {
        console.log(`⚠️ Incomplete recordings in database for ${rowCount} rows. Regenerating...`);
        return null;
      }
      
      console.log(`✅ Loaded ${recordings.size} recording sets for ${rowCount} rows from database`);
      return recordings;
    } else {
      console.log(`⚠️ No recordings found for ${rowCount} rows (${response.status})`);
    }
  } catch (error) {
    console.log(`⚠️ Error loading recordings for ${rowCount} rows:`, error);
  }
  
  return null;
}

// Save recordings to localStorage
export function saveRecordingsToStorage(recordings: Map<string, Recording[]>) {
  const json = serializeRecordings(recordings);
  localStorage.setItem('plinko-recordings', json);
  console.log(`💾 Saved ${json.length} bytes to localStorage`);
  
  // Also log to console for committing to repo
  console.log('📦 Copy this to save as static file:');
  console.log('File: src/games/plinko/data/recordings-16.json');
  console.log(json.substring(0, 500) + '...');
  
  // Download as file
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plinko-recordings.json';
  a.click();
  URL.revokeObjectURL(url);
  
  console.log('✅ Downloaded recordings file - commit this to your repo!');
}

// Load recordings from localStorage OR static file
export async function loadRecordingsFromStorage(rows: number): Promise<Map<string, Recording[]> | null> {
  // Try localStorage first
  const json = localStorage.getItem('plinko-recordings');
  if (json) {
    return deserializeRecordings(json);
  }
  
  // Try loading from static file
  try {
    const response = await fetch(`/plinko-recordings-${rows}.json`);
    if (response.ok) {
      const json = await response.text();
      const recordings = deserializeRecordings(json);
      // Cache in localStorage
      localStorage.setItem('plinko-recordings', json);
      console.log(`✅ Loaded pre-generated recordings from static file`);
      return recordings;
    }
  } catch (error) {
    console.warn('No pre-generated recordings found');
  }
  
  return null;
}
