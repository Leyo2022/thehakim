import fs from 'fs';

// ============================================================
// 1. Parse English original scene numbers (source of truth)
// ============================================================
const enRaw = fs.readFileSync('Product/V4_English_Original.txt', 'utf-8');
const enLines = enRaw.split('\n');
const enSceneNums = [];

for (let i = 0; i < enLines.length; i++) {
  const line = enLines[i].trim();
  if (line.startsWith('INT.') || line.startsWith('EXT.') || line.startsWith('INT./EXT.')) {
    const nextLine = enLines[i + 1]?.trim() || '';
    let enNum = nextLine.match(/^([0-9]+[A-Z]*)/)?.[1] || '?';
    // Handle "1010" → "10", "1111" → "11"
    if (enNum.length >= 2 && !/[A-Z]/.test(enNum) && enNum.length % 2 === 0) {
      const half = enNum.length / 2;
      if (enNum.substring(0, half) === enNum.substring(half)) {
        enNum = enNum.substring(0, half);
      }
    }
    // Handle "10A10A" → "10A"
    if (/[A-Z]/.test(enNum) && enNum.length >= 4) {
      const m2 = enNum.match(/^([0-9]+[A-Z]+)\1$/);
      if (m2) enNum = m2[1];
    }
    enSceneNums.push(enNum);
  }
}

console.log(`English original: ${enSceneNums.length} scene numbers`);

// ============================================================
// 2. Build mapping: V4 position (1-based) → new S-code
//    English has 140 scenes. V4 has 145 scene headers (due to 
//    duplicate S027 in original). 
//    Positions 1-140 map to English, 141-145 are extras.
// ============================================================
function enToNewS(enNum) {
  const m = enNum.match(/^(\d+)([A-Z]*)$/);
  if (!m) return null;
  return `S${m[1].padStart(3, '0')}${m[2]}`;
}

const TOTAL_V4_HEADERS = 145;
const positionToNewS = {}; // position → new S-code
for (let pos = 1; pos <= TOTAL_V4_HEADERS; pos++) {
  if (pos <= enSceneNums.length) {
    positionToNewS[pos] = enToNewS(enSceneNums[pos - 1]);
  } else {
    const suffixIdx = pos - enSceneNums.length - 1; // 0, 1, 2, 3, 4
    positionToNewS[pos] = `S138${String.fromCharCode(65 + suffixIdx)}`;
  }
}

console.log(`\nMapping (${TOTAL_V4_HEADERS} V4 positions → new S-codes):`);
for (let pos = 1; pos <= TOTAL_V4_HEADERS; pos++) {
  console.log(`  Position ${pos} → ${positionToNewS[pos]}`);
}

// ============================================================
// 3. Apply renumbering by position (not by old S-code)
//    This handles duplicates correctly.
// ============================================================
function applyRenumbering(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP (not found): ${filePath}`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf-8');

  // Find all scene headers: **第N场 SXXX ...
  // Scene number field may have letters (e.g., 10A场) after renumbering
  const headerRegex = /\*\*第(\d+[A-Z]*)场\s+(S\d+[A-Z]*)\s+/g;
  const matches = [];
  let match;
  while ((match = headerRegex.exec(content)) !== null) {
    matches.push({
      index: match.index,
      fullMatch: match[0],
      sceneNum: match[1],
      oldS: match[2],
      endIndex: match.index + match[0].length,
    });
  }

  console.log(`\n${filePath}: Found ${matches.length} scene headers`);

  // Replace from end to beginning to preserve indices
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    const pos = i + 1; // 1-based position
    const newS = positionToNewS[pos];
    if (!newS) {
      console.log(`  WARNING: No mapping for position ${pos}`);
      continue;
    }
    // newS format: S010A → display as "10A"
    const newDisplay = newS.replace('S', '').replace(/^0+/, '');
    const newHeader = `**第${newDisplay}场 ${newS} `;
    
    if (m.fullMatch !== newHeader) {
      content = content.substring(0, m.index) + newHeader + content.substring(m.endIndex);
      console.log(`  Position ${pos}: ${m.oldS} → ${newS} (${m.fullMatch.trim()} → ${newHeader.trim()})`);
    }
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Updated: ${filePath}`);
}

applyRenumbering('Product/V4_Script.md');
applyRenumbering('src/data/v4Script.md');
applyRenumbering('src/data/v4EnglishScript.md');

console.log('\nDone! All scene numbers renumbered with insertion naming strategy.');