/**
 * Generate recordings for all row counts (8-16)
 * Run this script to generate all recordings at once
 */

import { PlinkoRecorder } from '../lib/PlinkoRecorder';
import { saveRecordingsToStorage, serializeRecordings } from './recordingManager';

export async function generateAllRowCounts(onProgress?: (row: number, totalRows: number) => void) {
  const rowCounts = [8, 9, 10, 11, 12, 13, 14, 15, 16];
  
  for (let i = 0; i < rowCounts.length; i++) {
    const rows = rowCounts[i];
    console.log(`\n🎬 Generating recordings for ${rows} rows...`);
    
    const recorder = new PlinkoRecorder(rows);
    const numBins = rows + 1;
    
    for (let binIndex = 0; binIndex < numBins; binIndex++) {
      await recorder.recordBin(binIndex, undefined, true);
    }
    
    // Save this row count
    const recordings = recorder.getAllRecordings();
    const json = serializeRecordings(recordings);
    
    // Download individual file
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plinko-recordings-${rows}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log(`✅ ${rows} rows complete - downloaded plinko-recordings-${rows}.json`);
    onProgress?.(i + 1, rowCounts.length);
  }
  
  console.log('\n🎉 All row counts generated! Place files in public/ folder');
}
