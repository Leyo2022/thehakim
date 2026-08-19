import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'data', 'rawScript.md');
let content = fs.readFileSync(filePath, 'utf-8');

// Find all scene headers
// Some already have format: **第N场 SNNN ...**
// Some are missing (85, 94) with format: N 内景/外景 ...

const lines = content.split('\n');
const sceneHeaders = [];

// Patterns to detect scene headers
const sceneRegex1 = /^\*\*第(\d+)场\s+S(\d{3})\s+(.+?)\*\*/;  // Already renamed
const sceneRegex2 = /^(\d+)\s+(内景|外景|内外景)/;  // Not renamed yet (like 85, 94)

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  // Try already renamed format
  let match = line.match(sceneRegex1);
  if (match) {
    sceneHeaders.push({
      lineIndex: i,
      sequentialNumber: parseInt(match[1]),
      sceneId: match[2],
      restOfHeader: match[3].trim(),
      hasBold: true,
      isRenamed: true,
    });
    continue;
  }
  
  // Try not-yet-renamed format
  match = line.match(sceneRegex2);
  if (match && !line.startsWith('**')) {
    // Check if this looks like a scene header (内景/外景 at start)
    const sceneType = match[2];
    const headerText = line.replace(/^\d+\s+/, '').trim();
    
    sceneHeaders.push({
      lineIndex: i,
      sequentialNumber: null,  // Will be assigned
      sceneId: null,
      restOfHeader: headerText,
      hasBold: false,
      isRenamed: false,
    });
  }
}

console.log(`Found ${sceneHeaders.length} scene headers`);

// Sort by line index
sceneHeaders.sort((a, b) => a.lineIndex - b.lineIndex);

// Check if any scenes are missing (should be 138)
// The original had scenes with gaps (85, 94 missing from ** format)
// Now we should have all of them

// Assign sequential numbers
const replacements = [];

for (let i = 0; i < sceneHeaders.length; i++) {
  const header = sceneHeaders[i];
  const sceneNum = i + 1;
  const sceneId = 'S' + String(sceneNum).padStart(3, '0');
  
  const newHeader = `**第${sceneNum}场 ${sceneId} ${header.restOfHeader}**`;
  
  replacements.push({
    lineIndex: header.lineIndex,
    oldText: lines[header.lineIndex],  // Get original line
    newText: newHeader,
  });
  
  console.log(`Scene ${sceneNum}: ${header.restOfHeader.substring(0, 50)}...`);
}

// Apply replacements (in reverse order)
for (let i = replacements.length - 1; i >= 0; i--) {
  lines[replacements[i].lineIndex] = replacements[i].newText;
}

content = lines.join('\n');
fs.writeFileSync(filePath, content, 'utf-8');

console.log(`\nDone! Renamed ${replacements.length} scenes.`);
console.log(`Expected: 138 scenes`);
