import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'data', 'rawScript.md');
let content = fs.readFileSync(filePath, 'utf-8');

// Match all scene headers in format **N ...** where N is a number
const sceneHeaderRegex = /\*\*(\d+)\s+([^*]+)\*\*/g;

let match;
let index = 1;
const replacements = [];

while ((match = sceneHeaderRegex.exec(content)) !== null) {
  const restOfHeader = match[2];

  const sceneNum = index;
  const sceneId = 'S' + String(index).padStart(3, '0');

  const newHeader = `第${sceneNum}场 ${sceneId} ${restOfHeader.trim()}`;
  const newText = `**${newHeader}**`;

  replacements.push({
    start: match.index,
    end: match.index + match[0].length,
    newText,
  });

  console.log(`Scene ${sceneNum}: ${match[0]} -> ${newText}`);
  index++;
}

// Apply replacements from end to start to preserve indices
for (let i = replacements.length - 1; i >= 0; i--) {
  const r = replacements[i];
  content = content.slice(0, r.start) + r.newText + content.slice(r.end);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log(`\nDone! Renamed ${replacements.length} scenes.`);
