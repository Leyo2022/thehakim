import fs from 'fs';

// Read all parts
const part1 = fs.readFileSync('Product/V4_Chinese.md', 'utf-8');
const part2 = fs.readFileSync('Product/V4_Chinese_part2.md', 'utf-8');
const part3 = fs.readFileSync('Product/V4_Chinese_part3.md', 'utf-8');
const part4 = fs.readFileSync('Product/V4_Chinese_part4.md', 'utf-8');
const part5 = fs.readFileSync('Product/V4_Chinese_part5.md', 'utf-8');
const part6 = fs.readFileSync('Product/V4_Chinese_part6.md', 'utf-8');

// Fix format issues: replace EXT. with 外景, INT. with 内景 in parts 2-6
function fixFormat(text) {
  return text
    .replace(/EXT\. /g, '外景 ')
    .replace(/INT\. /g, '内景 ')
    .replace(/内景 · /g, '内景 ')
    .replace(/外景 · /g, '外景 ');
}

const fixedPart1 = fixFormat(part1);
const fixedPart2 = fixFormat(part2);
const fixedPart3 = fixFormat(part3);
const fixedPart4 = fixFormat(part4);
const fixedPart5 = fixFormat(part5);
const fixedPart6 = fixFormat(part6);

// Extract content from each part (skip the header from part2 onwards)
// Part 1 is the complete header + first scenes
// Parts 2-6 start from their first scene

// Remove the first scene from parts 2-6 to avoid duplicates
function getSceneContent(text) {
  // Find the first **第N场 marker
  const match = text.match(/\*\*第\d+场/);
  if (!match) return '';
  const startIdx = text.indexOf(match[0]);
  return text.substring(startIdx);
}

// Combine all parts
const combined = fixedPart1 + '\n\n' + 
  getSceneContent(fixedPart2) + '\n\n' +
  getSceneContent(fixedPart3) + '\n\n' +
  getSceneContent(fixedPart4) + '\n\n' +
  getSceneContent(fixedPart5) + '\n\n' +
  getSceneContent(fixedPart6);

// Final cleanup - ensure consistent formatting
const finalText = combined
  .replace(/\*\*第\d+场 S\d{3} (内景|外景)/g, (match) => match)  // preserve scene headers
  .replace(/\n{3,}/g, '\n\n')  // collapse multiple blank lines
  .trim();

fs.writeFileSync('Product/V4_Script.md', finalText, 'utf-8');

// Count scenes
const sceneMatches = finalText.match(/\*\*第\d+场 S\d{3}/g);
console.log(`Total scenes: ${sceneMatches ? sceneMatches.length : 0}`);
console.log('Output saved to Product/V4_Script.md');
