import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'data', 'rawScript.md');
let content = fs.readFileSync(filePath, 'utf-8');

// First, let's find all scene headers with their original numbers
// Format 1: **N ...** (with bold markers)
// Format 2: N ... (without bold markers, for scenes 85, 94, etc.)

const sceneHeaders = [];

// Find all lines that match scene header patterns
const lines = content.split('\n');
const sceneLineRegex1 = /^\*\*(\d+)\s+([^*]+)\*\*/;
const sceneLineRegex2 = /^(\d+)\s+(内景|外景|内外景|内景\s*\/\s*外景|外景\s*\/\s*内景)/;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  // Try format with **...**
  let match = line.match(sceneLineRegex1);
  if (match) {
    sceneHeaders.push({
      lineIndex: i,
      originalNumber: parseInt(match[1]),
      text: match[0],
      restOfHeader: match[2].trim(),
      hasBold: true,
    });
    continue;
  }
  
  // Try format without **...** (but only for lines that look like scene headers)
  match = line.match(sceneLineRegex2);
  if (match && !line.startsWith('**') && line.length < 100) {
    // Make sure it's not a dialogue line or something else
    // Scene headers typically start with a number followed by 内景/外景
    sceneHeaders.push({
      lineIndex: i,
      originalNumber: parseInt(match[1]),
      text: line,
      restOfHeader: line.replace(/^\d+\s+/, '').trim(),
      hasBold: false,
    });
  }
}

console.log(`Found ${sceneHeaders.length} scene headers`);

// Sort by line index
sceneHeaders.sort((a, b) => a.lineIndex - b.lineIndex);

// Now rename them sequentially
const replacements = [];

for (let i = 0; i < sceneHeaders.length; i++) {
  const header = sceneHeaders[i];
  const sceneNum = i + 1;
  const sceneId = 'S' + String(sceneNum).padStart(3, '0');
  
  let newHeader;
  if (header.hasBold) {
    newHeader = `**第${sceneNum}场 ${sceneId} ${header.restOfHeader}**`;
  } else {
    newHeader = `**第${sceneNum}场 ${sceneId} ${header.restOfHeader}**`;
  }
  
  replacements.push({
    lineIndex: header.lineIndex,
    oldText: header.text,
    newText: newHeader,
  });
  
  console.log(`Scene ${sceneNum} (was ${header.originalNumber}): ${header.text} -> ${newHeader}`);
}

// Apply replacements (in reverse order to preserve line indices)
for (let i = replacements.length - 1; i >= 0; i--) {
  const r = replacements[i];
  lines[r.lineIndex] = lines[r.lineIndex].replace(r.oldText, r.newText);
}

// Rejoin and write
content = lines.join('\n');
fs.writeFileSync(filePath, content, 'utf-8');

console.log(`\nDone! Renamed ${replacements.length} scenes.`);
