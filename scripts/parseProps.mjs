import fs from 'fs';
import path from 'path';

const mdContent = fs.readFileSync(path.resolve('Product', '元素资产对应场次.md'), 'utf-8');
const lines = mdContent.split('\n').filter(l => l.startsWith('|') && !l.includes('资产类型') && !l.includes('---'));

const propMap = {};
const fakeData = [];

for (const line of lines) {
  const parts = line.split('|').map(s => s.trim()).filter(Boolean);
  if (parts.length >= 3) {
    const name = parts[1];
    const scenes = parts[2].split(';').map(s => s.trim()).filter(Boolean);
    
    if (!propMap[name]) {
      propMap[name] = [];
    }
    propMap[name].push(...scenes);
  }
}

const filteredPropMap = {};

for (const [name, scenes] of Object.entries(propMap)) {
  const uniqueScenes = [...new Set(scenes)];
  
  if (uniqueScenes.length === 1 && uniqueScenes[0] === 'Sc001') {
    fakeData.push({ name, scenes: uniqueScenes });
    continue;
  }
  
  filteredPropMap[name] = uniqueScenes;
}

console.log('// Filtered propMap (fake data removed):');
console.log('const propMap: Record<string, string[]> = {');
for (const [name, scenes] of Object.entries(filteredPropMap)) {
  console.log(`  '${name}': [${scenes.map(s => `'${s}'`).join(',')}],`);
}
console.log('};');

console.log('\n// Fake data (only Sc001):');
for (const item of fakeData) {
  console.log(`// ${item.name}: ${item.scenes.join(', ')}`);
}

console.log(`\n// Total props after filtering: ${Object.keys(filteredPropMap).length}`);
console.log(`// Fake props removed: ${fakeData.length}`);
