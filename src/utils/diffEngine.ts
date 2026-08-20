import { diffLines, Change } from 'diff';

export interface DiffLine {
  type: 'unchanged' | 'added' | 'removed' | 'modified';
  left?: string;
  right?: string;
  leftZh?: string;  // Chinese translation for left side
  rightZh?: string; // Chinese translation for right side
  leftLineNum?: number;
  rightLineNum?: number;
  isNormalizedMatch?: boolean; // 标记为归一化后实质相同
}

export interface SceneDiff {
  sceneNum?: number;
  sceneId?: string;
  title?: string;
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  lines: DiffLine[];
  // Pre-computed change counts (available without expanding the scene)
  addedLines?: number;
  removedLines?: number;
  modifiedLines?: number;
}

export interface VersionDiff {
  stats: {
    totalChanges: number;
    added: number;
    removed: number;
    modified: number;
  };
  scenes: SceneDiff[];
}

// Normalize line for comparison - remove formatting noise
// This handles cases like "巴林 麦纳麦 1861" vs "麦纳麦/巴林 — 1861"
export function normalizeLine(line: string): string {
  return line
    .toLowerCase()
    // Normalize Unicode quotes/apostrophes to ASCII
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    // Normalize dashes
    .replace(/[\u2013\u2014\u2015]/g, '-')
    // Remove all punctuation characters
    .replace(/[\/—\-–－－_—+*#@!$%^&()=\[\]{}|\\:;"'`<>,.~?]/g, ' ')
    // Remove English punctuation
    .replace(/[.,;:!?'"()[\]{}\-_—\/\\]/g, ' ')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    // Remove leading/trailing spaces
    .trim();
}

// Normalize line with word order sorted - handles "巴林 麦纳麦" vs "麦纳麦 巴林"
export function normalizeLineSorted(line: string): string {
  const normalized = normalizeLine(line);
  if (!normalized) return '';
  // Split into words and sort
  const words = normalized.split(' ').sort();
  return words.join(' ');
}

// Calculate Jaccard similarity between two strings (as character sets)
export function calculateSimilarity(left: string, right: string): number {
  const normLeft = normalizeLine(left);
  const normRight = normalizeLine(right);
  
  if (!normLeft && !normRight) return 1;
  if (!normLeft || !normRight) return 0;
  
  // Use sorted word comparison for better matching
  const sortedLeft = normalizeLineSorted(left);
  const sortedRight = normalizeLineSorted(right);
  
  if (sortedLeft === sortedRight) return 1;
  
  // Calculate character-level Jaccard similarity
  const leftChars = new Set(sortedLeft.split(''));
  const rightChars = new Set(sortedRight.split(''));
  
  const intersection = new Set([...leftChars].filter(c => rightChars.has(c)));
  const union = new Set([...leftChars, ...rightChars]);
  
  if (union.size === 0) return 1;
  
  return intersection.size / union.size;
}

// Check if two lines are semantically the same after normalization
function isNormalizedMatch(left: string, right: string): boolean {
  const normLeft = normalizeLine(left);
  const normRight = normalizeLine(right);
  
  // Exact match after basic normalization
  if (normLeft === normRight && normLeft !== '') {
    return true;
  }
  
  // Sorted word match (handles word order differences)
  const sortedLeft = normalizeLineSorted(left);
  const sortedRight = normalizeLineSorted(right);
  if (sortedLeft === sortedRight && sortedLeft !== '') {
    return true;
  }
  
  // Similarity check - if > 0.85 (85% similar), consider it a format change
  const similarity = calculateSimilarity(left, right);
  if (similarity >= 0.85) {
    return true;
  }
  
  return false;
}

// Parse scenes from script text
// Supports three formats (priority order):
// 1. Explicit scene marker: <!-- SCENE: Sxxx --> followed by INT./EXT. heading
// 2. Chinese marked format: **第X场 S<digits>[letters] 内景/外景 ...**
// 3. English original format: lines starting with INT. or EXT. (standard screenplay format)
// Examples: S1, S001, S001A, S001AA, S001B, S001C, S002
export function parseScenes(text: string) {
  const lines = text.split('\n');
  const scenes: {
    sceneNum: number;
    sceneId: string;
    title: string;
    locationKey: string; // Normalized location for fuzzy matching
    content: string[];
  }[] = [];

  let currentScene: typeof scenes[0] | null = null;
  let pendingSceneId: string | null = null; // Scene ID from <!-- SCENE: --> marker waiting for heading

  // Regex for explicit scene marker: <!-- SCENE: Sxxx -->
  const sceneMarkerRegex = /^<!--\s*SCENE:\s*(S\d+[A-Z]*)\s*-->$/i;
  
  // Regex for Chinese marked format: **第X场 SXXX 内景/外景 ...**
  const chineseSceneRegex = /\*\*第(\d+[A-Z]*)场\s+S(\d+[A-Z]*)\s+(内景|外景|闪回|内景\s*\/\s*外景|外景\s*\/\s*内景|内\s*\/\s*外景|外\s*\/\s*内景)\s*(.+?)\*\*/;
  
  // Regex for English original format: lines starting with INT. or EXT.
  // Allow optional whitespace after dot (handles PDF artifacts like "EXT.HMS")
  const englishSceneRegex = /^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.)\s*(.+)$/i;
  
  let englishSceneCounter = 0;

  // Normalize a location string for fuzzy matching
  const normalizeLocation = (loc: string): string => {
    return loc
      .toLowerCase()
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
      .replace(/[\u2013\u2014\u2015]/g, '-')
      .replace(/[.,;:!?'"()[\]{}\-_—\/\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Parse scene ID into numeric part for sceneNum
  const parseSceneIdNum = (sid: string): number => {
    const m = sid.match(/^S(\d+)/);
    return m ? parseInt(m[1]) : englishSceneCounter;
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 1. Check for explicit scene marker: <!-- SCENE: Sxxx -->
    const markerMatch = trimmedLine.match(sceneMarkerRegex);
    if (markerMatch) {
      pendingSceneId = markerMatch[1];
      continue; // Don't add marker line to content
    }
    
    // 2. Check for Chinese marked format
    const chineseMatch = trimmedLine.match(chineseSceneRegex);
    if (chineseMatch) {
      if (currentScene) {
        scenes.push(currentScene);
      }
      const numMatch = chineseMatch[1].match(/^(\d+)/);
      const sceneNum = numMatch ? parseInt(numMatch[1]) : scenes.length + 1;
      const location = chineseMatch[4];
      currentScene = {
        sceneNum: sceneNum,
        sceneId: 'S' + chineseMatch[2],
        title: trimmedLine.replace(/\*\*/g, ''),
        locationKey: normalizeLocation(location),
        content: [line],
      };
      pendingSceneId = null;
      continue;
    }
    
    // 3. Check for English scene heading (INT./EXT.)
    if (trimmedLine) {
      const englishMatch = trimmedLine.match(englishSceneRegex);
      if (englishMatch) {
        englishSceneCounter++;
        if (currentScene) {
          scenes.push(currentScene);
        }
        const fullHeading = englishMatch[2];
        // Extract location by stripping time-of-day suffixes
        const timeSuffixRegex = /\s*[—\-–]\s*(?:DAY|NIGHT|MORNING|EVENING|CONTINUOUS|SAME|LATER|DAWN|DUSK|AFTERNOON|MOMENTS|CUT|SUNRISE|SUNSET|DAYS|NIGHTS|RESUME|FIRST\s+LIGHT)\s*.*$/i;
        const location = fullHeading.replace(timeSuffixRegex, '').trim();
        
        // Use pending scene ID from marker if available, otherwise generate sequential
        const sceneId = pendingSceneId || ('S' + String(englishSceneCounter).padStart(3, '0'));
        
        currentScene = {
          sceneNum: parseSceneIdNum(sceneId),
          sceneId: sceneId,
          title: trimmedLine,
          locationKey: normalizeLocation(location),
          content: [line],
        };
        pendingSceneId = null;
        continue;
      }
    }
    
    if (currentScene) {
      currentScene.content.push(line);
    }
  }

  if (currentScene) {
    scenes.push(currentScene);
  }

  return scenes;
}

// Sort scenes by their IDs using the custom insertion-sort rule:
// 1. First by the numeric part (e.g., S001 < S002)
// 2. Then by the letter suffix:
//    - AA (or any multi-letter suffix starting with A) comes BEFORE no suffix (S001AA < S001)
//    - Single letter suffixes A, B, C, etc. come AFTER no suffix (S001 < S001A < S001B)
//
// Rule: if two IDs have the same numeric part:
// - Empty suffix "" (S001) comes AFTER all AA... forms
// - "AA" (S001AA) comes BEFORE empty
// - Single letters A, B, C come AFTER empty
// This ensures: S001AA < S001 < S001A < S001B
export function sortScenesById<T extends { sceneId: string }>(scenes: T[]): T[] {
  return [...scenes].sort((a, b) => {
    const idA = a.sceneId;
    const idB = b.sceneId;
    
    // Parse numeric and suffix parts
    const matchA = idA.match(/^S(\d+)([A-Z]*)$/);
    const matchB = idB.match(/^S(\d+)([A-Z]*)$/);
    
    if (!matchA || !matchB) return 0;
    
    const numA = parseInt(matchA[1]);
    const numB = parseInt(matchB[1]);
    const suffixA = matchA[2]; // "" for no suffix, "A", "AA", "B", etc.
    const suffixB = matchB[2];
    
    // First compare numeric parts
    if (numA !== numB) {
      return numA - numB;
    }
    
    // Same numeric part: apply custom suffix ordering
    // Key insight: shorter suffixes that are prefixes of longer ones
    // AA < "" (empty) < A < B < C
    // AA < AAA < AAB < "" < A < B
    
    // Determine sort key for suffix
    const suffixKey = (suffix: string): number => {
      if (suffix === '') {
        // Empty suffix: S001 comes after AA/AAA but before A/B/C
        return 2;
      }
      // Multi-letter suffix starting with A (AA, AAA, AAB, etc.)
      if (suffix.startsWith('A') && suffix.length >= 2) {
        // AA < AAA < AAB, etc. Sort by length then lexicographically
        return 0 + suffix.length * 0.001;
      }
      // Single letter or other multi-letter suffix (A, B, C, AB, etc.)
      // These come after empty
      return 3 + suffix.charCodeAt(0);
    };
    
    const keyA = suffixKey(suffixA);
    const keyB = suffixKey(suffixB);
    
    if (keyA !== keyB) {
      return keyA - keyB;
    }
    
    // Tiebreaker: lexicographic comparison for same sort group
    // AA < AAA < AAB (all in group 0)
    // A < B < C (all in group 3)
    if (suffixA !== '' && suffixB !== '') {
      return suffixA.localeCompare(suffixB);
    }
    
    return 0;
  });
}

// Validate scene ID format
// Valid: S<digits>[<uppercase_letters>]
// Examples: S1, S001, S001A, S001AA, S001B
// Invalid: S001a (lowercase), S001aA, S1.5, S-1
export function isValidSceneId(sceneId: string): boolean {
  return /^S\d+[A-Z]*$/.test(sceneId);
}

// Check if scene ID violates insertion-sort naming convention
// Returns warning message if invalid, or null if valid
export function validateSceneIdConvention(sceneId: string): string | null {
  if (!isValidSceneId(sceneId)) {
    return `场景编号 "${sceneId}" 格式不正确。正确格式为 S<数字>[大写字母]，例如 S1、S001、S001A、S001AA、S001B`;
  }
  
  const match = sceneId.match(/^S(\d+)([A-Z]*)$/);
  if (!match) return null;
  
  const numericPart = match[1];
  const suffixPart = match[2];
  
  // Warn if numeric part has leading zeros (optional, but suggests inconsistency)
  if (numericPart.length > 1 && numericPart.startsWith('0')) {
    // This is OK for padding, just informational
  }
  
  return null;
}

// Compute line diff using the `diff` npm package (Myers algorithm)
// With normalization to detect semantic matches
// Optionally maps Chinese translation lines to each English line by line number
function computeLineDiff(
  leftLines: string[], 
  rightLines: string[], 
  zhLeftLines?: string[], 
  zhRightLines?: string[]
): DiffLine[] {
  // Normalize lines: trim trailing whitespace (common PDF vs manual formatting difference)
  const normLeft = leftLines.map(l => l.replace(/\s+$/, ''));
  const normRight = rightLines.map(l => l.replace(/\s+$/, ''));

  const leftText = normLeft.join('\n');
  const rightText = normRight.join('\n');
  
  const changes: Change[] = diffLines(leftText, rightText);
  
  const diff: DiffLine[] = [];
  let leftLineNum = 0;
  let rightLineNum = 0;
  
  for (const change of changes) {
    const parts = change.value.split('\n');
    // Remove trailing empty string from split
    if (parts.length > 0 && parts[parts.length - 1] === '') {
      parts.pop();
    }
    
    if (change.removed) {
      for (const part of parts) {
        leftLineNum++;
        diff.push({
          type: 'removed',
          left: part,
          leftZh: zhLeftLines ? zhLeftLines[leftLineNum - 1] : undefined,
          leftLineNum,
        });
      }
    } else if (change.added) {
      for (const part of parts) {
        rightLineNum++;
        diff.push({
          type: 'added',
          right: part,
          rightZh: zhRightLines ? zhRightLines[rightLineNum - 1] : undefined,
          rightLineNum,
        });
      }
    } else {
      for (const part of parts) {
        leftLineNum++;
        rightLineNum++;
        diff.push({
          type: 'unchanged',
          left: part,
          right: part,
          leftZh: zhLeftLines ? zhLeftLines[leftLineNum - 1] : undefined,
          rightZh: zhRightLines ? zhRightLines[rightLineNum - 1] : undefined,
          leftLineNum,
          rightLineNum,
        });
      }
    }
  }
  
  // Post-process: match removed lines to added lines within a sliding window
  // This handles cases where extra/missing lines cause adjacent removed+added pairs
  // to be separated by other lines, but the lines are actually the same content.
  const result: DiffLine[] = [];
  let i = 0;
  while (i < diff.length) {
    if (diff[i].type === 'removed') {
      // Look ahead up to 10 lines for a matching added line
      const removedLine = diff[i];
      let matchIdx = -1;
      const windowEnd = Math.min(i + 10, diff.length);
      for (let j = i + 1; j < windowEnd; j++) {
        if (diff[j].type === 'added') {
          if (isNormalizedMatch(removedLine.left!, diff[j].right!)) {
            matchIdx = j;
            break;
          }
        } else if (diff[j].type === 'unchanged') {
          // Stop searching if we hit an unchanged line that's likely a real anchor
          // But only if the unchanged line isn't just after a small gap
          if (j > i + 3) break;
        }
      }
      
      if (matchIdx !== -1) {
        const addedLine = diff[matchIdx];
        const same = isNormalizedMatch(removedLine.left!, addedLine.right!);
        result.push({
          type: same ? 'unchanged' : 'modified',
          left: removedLine.left,
          right: addedLine.right,
          leftZh: removedLine.leftZh,
          rightZh: addedLine.rightZh,
          leftLineNum: removedLine.leftLineNum,
          rightLineNum: addedLine.rightLineNum,
          isNormalizedMatch: same,
        });
        // Emit any lines between i and matchIdx as added lines (they were skipped)
        // These are genuinely new lines in V4
        for (let j = i + 1; j < matchIdx; j++) {
          if (diff[j].type === 'added') {
            result.push(diff[j]);
          } else if (diff[j].type === 'removed') {
            // These removed lines didn't match - emit as removed
            // But check if they match an earlier added line
            result.push(diff[j]);
          }
        }
        i = matchIdx + 1;
      } else {
        result.push(diff[i]);
        i++;
      }
    } else if (diff[i].type === 'added') {
      // Check if this added line matches a previous unmatched removed within window
      result.push(diff[i]);
      i++;
    } else {
      result.push(diff[i]);
      i++;
    }
  }
  
  return result;
}

// Calculate similarity between two location strings (0 to 1)
function locationSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 2));
  
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  
  let intersection = 0;
  wordsA.forEach(w => {
    if (wordsB.has(w)) intersection++;
  });
  
  const union = wordsA.size + wordsB.size - intersection;
  return intersection / union;
}

// Calculate content similarity between two scenes (0 to 1)
// Uses bag-of-words on the scene body (excluding the heading line itself)
function contentSimilarity(
  v3Content: string[],
  v4Content: string[]
): number {
  // Skip the first line (it's the scene heading itself, which we already compare via location)
  // Take up to first 15 lines of body content for fingerprinting
  const bodyA = v3Content.slice(1, Math.min(v3Content.length, 16));
  const bodyB = v4Content.slice(1, Math.min(v4Content.length, 16));
  
  const getWords = (lines: string[]) => {
    const words = new Set<string>();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // Extract dialogue/action words, skip character names in ALL CAPS
      const isAllCaps = /^[A-Z\s\(\)'\.\-]+$/.test(trimmed) && trimmed.length > 3;
      if (isAllCaps && !trimmed.includes(' ')) continue; // Skip standalone character names
      
      const lineWords = trimmed
        .toLowerCase()
        .replace(/[.,;:!?'"()\[\]{}\-_—\/\\]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3); // Only significant words (length > 3)
      lineWords.forEach(w => words.add(w));
    }
    return words;
  };
  
  const wordsA = getWords(bodyA);
  const wordsB = getWords(bodyB);
  
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  
  let intersection = 0;
  wordsA.forEach(w => {
    if (wordsB.has(w)) intersection++;
  });
  
  const union = wordsA.size + wordsB.size - intersection;
  return intersection / union;
}

// Count change types in diff lines
function countLineChanges(lines: DiffLine[]): { added: number; removed: number; modified: number } {
  let added = 0, removed = 0, modified = 0;
  for (const line of lines) {
    if (line.isNormalizedMatch) continue; // Skip normalized matches (not real changes)
    switch (line.type) {
      case 'added': added++; break;
      case 'removed': removed++; break;
      case 'modified': modified++; break;
    }
  }
  return { added, removed, modified };
}

// Helper to create a SceneDiff with pre-computed stats from matched scenes
function createSceneDiff(
  v3Scene: ReturnType<typeof parseScenes>[0] | null,
  v4Scene: ReturnType<typeof parseScenes>[0] | null,
  type: 'added' | 'removed' | 'modified' | 'unchanged',
  zhV3Scene?: ReturnType<typeof parseScenes>[0] | null,
  zhV4Scene?: ReturnType<typeof parseScenes>[0] | null
): SceneDiff {
  let lines: DiffLine[] = [];
  let addedLines = 0, removedLines = 0, modifiedLines = 0;
  
  if (type === 'added' && v4Scene) {
    lines = v4Scene.content.map((line, idx) => ({
      type: 'added' as const,
      right: line,
      rightZh: zhV4Scene ? zhV4Scene.content[idx] : undefined,
      rightLineNum: idx + 1,
    }));
    addedLines = lines.length;
  } else if (type === 'removed' && v3Scene) {
    lines = v3Scene.content.map((line, idx) => ({
      type: 'removed' as const,
      left: line,
      leftZh: zhV3Scene ? zhV3Scene.content[idx] : undefined,
      leftLineNum: idx + 1,
    }));
    removedLines = lines.length;
  } else if (v3Scene && v4Scene) {
    lines = computeLineDiff(
      v3Scene.content, 
      v4Scene.content,
      zhV3Scene?.content,
      zhV4Scene?.content
    );
    const counts = countLineChanges(lines);
    addedLines = counts.added;
    removedLines = counts.removed;
    modifiedLines = counts.modified;
    // Determine actual type based on real changes
    if (addedLines === 0 && removedLines === 0 && modifiedLines === 0) {
      type = 'unchanged';
    } else {
      type = 'modified';
    }
  }
  
  const scene = v4Scene || v3Scene;
  return {
    sceneNum: scene?.sceneNum,
    sceneId: scene?.sceneId,
    title: scene?.title,
    type,
    lines,
    addedLines,
    removedLines,
    modifiedLines,
  };
}

// Compare two script versions
// Uses scene ID matching for Chinese-marked format, and fuzzy location matching for English original format
// Pre-computes line diffs and change counts for all scenes
// Optionally accepts Chinese translations for display (not used for diff computation)
export function compareVersions(
  v3Text: string, 
  v4Text: string, 
  v3ZhText?: string, 
  v4ZhText?: string
): VersionDiff {
  const v3Scenes = parseScenes(v3Text);
  const v4Scenes = parseScenes(v4Text);

  // Parse Chinese translations if provided (for display only, not diff matching)
  const v3ZhScenes = v3ZhText ? parseScenes(v3ZhText) : [];
  const v4ZhScenes = v4ZhText ? parseScenes(v4ZhText) : [];
  const v3ZhById = new Map<string, typeof v3ZhScenes[0]>();
  const v4ZhById = new Map<string, typeof v4ZhScenes[0]>();
  v3ZhScenes.forEach(s => v3ZhById.set(s.sceneId, s));
  v4ZhScenes.forEach(s => v4ZhById.set(s.sceneId, s));

  // Sort V4 scenes by the custom insertion-sort rule
  const sortedV4Scenes = sortScenesById(v4Scenes);

  // Detect if scenes have explicit S-ID markers (from <!-- SCENE: Sxxx --> comments)
  // If most scenes have SIDs, use strict ID matching for perfect accuracy
  const v3WithSid = v3Scenes.filter(s => s.sceneId).length;
  const v4WithSid = v4Scenes.filter(s => s.sceneId).length;
  const hasExplicitSids = v3WithSid > v3Scenes.length * 0.8 && v4WithSid > v4Scenes.length * 0.8;

  // Also detect Chinese marked format
  const hasChineseMarks = v3Text.includes('**第') || v4Text.includes('**第');

  const sceneDiffs: SceneDiff[] = [];
  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;

  // Track which scenes have been processed
  const v3Processed = new Set<string>();
  const v4Processed = new Set<string>();

  if (hasExplicitSids || hasChineseMarks) {
    // Use strict ID matching when we have explicit S-IDs (perfect accuracy)
    const v3ById = new Map<string, typeof v3Scenes[0]>();
    const v4ById = new Map<string, typeof v4Scenes[0]>();
    
    v3Scenes.forEach(s => v3ById.set(s.sceneId, s));
    v4Scenes.forEach(s => v4ById.set(s.sceneId, s));

    // First pass: match scenes by ID using sorted V4 order
    for (const v4Scene of sortedV4Scenes) {
      const v3Scene = v3ById.get(v4Scene.sceneId);
      
      if (v3Scene) {
        v3Processed.add(v3Scene.sceneId);
        v4Processed.add(v4Scene.sceneId);
        
        const zhV3Scene = v3ZhById.get(v3Scene.sceneId);
        const zhV4Scene = v4ZhById.get(v4Scene.sceneId);
        
        const sceneDiff = createSceneDiff(v3Scene, v4Scene, 'modified', zhV3Scene, zhV4Scene);
        if (sceneDiff.type === 'modified') {
          modifiedCount++;
        }
        sceneDiffs.push(sceneDiff);
      } else {
        addedCount++;
        const zhV4Scene = v4ZhById.get(v4Scene.sceneId);
        sceneDiffs.push(createSceneDiff(null, v4Scene, 'added', null, zhV4Scene));
        v4Processed.add(v4Scene.sceneId);
      }
    }

    // Second pass: find scenes only in V3 (removed)
    for (const v3Scene of v3Scenes) {
      if (!v4Processed.has(v3Scene.sceneId)) {
        removedCount++;
        const zhV3Scene = v3ZhById.get(v3Scene.sceneId);
        sceneDiffs.push(createSceneDiff(v3Scene, null, 'removed', zhV3Scene, null));
      }
    }
  } else {
    // English original format: use dynamic programming for longest common subsequence-style matching
    // Combines location similarity + content similarity with positional preference
    // This handles location renames (like "ROYAL RESIDENCE" -> "GATES OF PALACE") when content matches
    
    const m = v3Scenes.length;
    const n = sortedV4Scenes.length;
    
    // Pre-compute similarity matrix
    const sim: number[][] = [];
    for (let i = 0; i < m; i++) {
      sim[i] = [];
      for (let j = 0; j < n; j++) {
        const locSim = locationSimilarity(v3Scenes[i].locationKey, sortedV4Scenes[j].locationKey);
        const contSim = contentSimilarity(v3Scenes[i].content, sortedV4Scenes[j].content);
        // Weighted combination: location is primary, content is secondary
        // If location match is strong (>=0.5), trust it; else use content to disambiguate
        const combined = locSim >= 0.5 ? locSim : (locSim * 0.4 + contSim * 0.6);
        sim[i][j] = combined;
      }
    }
    
    // DP table: dp[i][j] = best score matching first i V3 scenes to first j V4 scenes
    // We use a simple LCS-like DP with gap penalties for insertions/deletions
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    // For backtracking
    const bt: ('match' | 'skipV3' | 'skipV4')[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill('match'));
    
    // Initialize boundaries: cost of skipping all V3 (all added) or all V4 (all removed)
    for (let i = 1; i <= m; i++) {
      dp[i][0] = dp[i - 1][0] - 0.1;
      bt[i][0] = 'skipV3';
    }
    for (let j = 1; j <= n; j++) {
      dp[0][j] = dp[0][j - 1] - 0.1;
      bt[0][j] = 'skipV4';
    }
    
    // Fill DP table
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        // Option 1: match v3[i-1] with v4[j-1]
        const scoreMatch = dp[i - 1][j - 1] + sim[i - 1][j - 1];
        // Option 2: skip V3 scene (it was deleted) - small penalty
        const scoreSkipV3 = dp[i - 1][j] - 0.1;
        // Option 3: skip V4 scene (it was added) - small penalty
        const scoreSkipV4 = dp[i][j - 1] - 0.1;
        
        dp[i][j] = Math.max(scoreMatch, scoreSkipV3, scoreSkipV4);
        
        if (dp[i][j] === scoreMatch) {
          bt[i][j] = 'match';
        } else if (dp[i][j] === scoreSkipV3) {
          bt[i][j] = 'skipV3';
        } else {
          bt[i][j] = 'skipV4';
        }
      }
    }
    
    // Backtrack to find matches
    const matches: Array<{ v3Idx: number; v4Idx: number }> = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      switch (bt[i][j]) {
        case 'match':
          if (sim[i - 1][j - 1] > 0.25) { // Only accept match if similarity above threshold
            matches.push({ v3Idx: i - 1, v4Idx: j - 1 });
          }
          i--; j--;
          break;
        case 'skipV3':
          i--;
          break;
        case 'skipV4':
          j--;
          break;
      }
    }
    matches.reverse();
    
    // Build scene diffs in V4 order
    let matchPtr = 0;
    let v3Ptr = 0;
    
    for (let v4Idx = 0; v4Idx < n; v4Idx++) {
      const v4Scene = sortedV4Scenes[v4Idx];
      
      if (matchPtr < matches.length && matches[matchPtr].v4Idx === v4Idx) {
        const match = matches[matchPtr];
        const v3Scene = v3Scenes[match.v3Idx];
        
        // Mark any V3 scenes between v3Ptr and match.v3Idx as removed
        for (let k = v3Ptr; k < match.v3Idx; k++) {
          if (!v3Processed.has(v3Scenes[k].sceneId)) {
            v3Processed.add(v3Scenes[k].sceneId);
            removedCount++;
            const zhV3Scene = v3ZhById.get(v3Scenes[k].sceneId);
            sceneDiffs.push(createSceneDiff(v3Scenes[k], null, 'removed', zhV3Scene, null));
          }
        }
        
        v3Processed.add(v3Scene.sceneId);
        v4Processed.add(v4Scene.sceneId);
        
        const zhV3Scene = v3ZhById.get(v3Scene.sceneId);
        const zhV4Scene = v4ZhById.get(v4Scene.sceneId);
        
        const sceneDiff = createSceneDiff(v3Scene, v4Scene, 'modified', zhV3Scene, zhV4Scene);
        if (sceneDiff.type === 'modified') {
          modifiedCount++;
        }
        sceneDiffs.push(sceneDiff);
        
        v3Ptr = match.v3Idx + 1;
        matchPtr++;
      } else {
        // No match - added scene
        addedCount++;
        const zhV4Scene = v4ZhById.get(v4Scene.sceneId);
        sceneDiffs.push(createSceneDiff(null, v4Scene, 'added', null, zhV4Scene));
        v4Processed.add(v4Scene.sceneId);
      }
    }
    
    // Any remaining V3 scenes are removed
    for (; v3Ptr < m; v3Ptr++) {
      if (!v3Processed.has(v3Scenes[v3Ptr].sceneId)) {
        v3Processed.add(v3Scenes[v3Ptr].sceneId);
        removedCount++;
        const zhV3Scene = v3ZhById.get(v3Scenes[v3Ptr].sceneId);
        sceneDiffs.push(createSceneDiff(v3Scenes[v3Ptr], null, 'removed', zhV3Scene, null));
      }
    }
  }

  return {
    stats: {
      totalChanges: addedCount + removedCount + modifiedCount,
      added: addedCount,
      removed: removedCount,
      modified: modifiedCount,
    },
    scenes: sceneDiffs,
  };
}

// Check if two scene contents are semantically the same
function isSceneContentSame(leftLines: string[], rightLines: string[]): boolean {
  if (leftLines.length !== rightLines.length) return false;
  
  for (let i = 0; i < leftLines.length; i++) {
    if (!isNormalizedMatch(leftLines[i], rightLines[i])) {
      return false;
    }
  }
  
  return true;
}

// Compute diff for a single scene (lazy)
// Accepts either sceneIndex (number) or sceneId (string)
export function computeSceneDiff(v3Content: string, v4Content: string, sceneIndexOrId: number | string): SceneDiff | null {
  const v3Scenes = parseScenes(v3Content);
  const v4Scenes = parseScenes(v4Content);

  let v3Scene: typeof v3Scenes[0] | undefined;
  let v4Scene: typeof v4Scenes[0] | undefined;

  if (typeof sceneIndexOrId === 'number') {
    // Use index-based lookup (may not match correctly if scenes are reordered)
    v3Scene = v3Scenes[sceneIndexOrId];
    v4Scene = v4Scenes[sceneIndexOrId];
  } else {
    // Use scene ID lookup (accurate)
    const sceneId = sceneIndexOrId;
    v3Scene = v3Scenes.find(s => s.sceneId === sceneId);
    v4Scene = v4Scenes.find(s => s.sceneId === sceneId);
  }

  if (!v3Scene && !v4Scene) return null;

  if (!v3Scene && v4Scene) {
    return {
      sceneNum: v4Scene.sceneNum,
      sceneId: v4Scene.sceneId,
      title: v4Scene.title,
      type: 'added',
      lines: v4Scene.content.map((line, idx) => ({
        type: 'added',
        right: line,
        rightLineNum: idx + 1,
      })),
    };
  }

  if (v3Scene && !v4Scene) {
    return {
      sceneNum: v3Scene.sceneNum,
      sceneId: v3Scene.sceneId,
      title: v3Scene.title,
      type: 'removed',
      lines: v3Scene.content.map((line, idx) => ({
        type: 'removed',
        left: line,
        leftLineNum: idx + 1,
      })),
    };
  }

  if (v3Scene && v4Scene) {
    const v3Lines = v3Scene.content;
    const v4Lines = v4Scene.content;
    const diffLines = computeLineDiff(v3Lines, v4Lines);
    
    // Count real changes (exclude normalized matches)
    const realChanges = diffLines.filter(l => l.type !== 'unchanged' && !l.isNormalizedMatch);
    
    return {
      sceneNum: v4Scene.sceneNum,
      sceneId: v4Scene.sceneId,
      title: v4Scene.title,
      type: realChanges.length > 0 ? 'modified' : 'unchanged',
      lines: diffLines,
    };
  }

  return null;
}

// Apply line adjustments to V4 content
// Returns new V4 content with specified changes applied
export function applyLineAdjustments(
  v3Content: string,
  v4Content: string,
  adjustments: Map<string, Map<number, 'keep' | 'revert'>>
): string {
  const v3Scenes = parseScenes(v3Content);
  const v4Scenes = parseScenes(v4Content);
  
  const result: string[] = [];
  
  for (let sceneIdx = 0; sceneIdx < v4Scenes.length; sceneIdx++) {
    const v4Scene = v4Scenes[sceneIdx];
    const v3Scene = v3Scenes[sceneIdx];
    
    if (!v4Scene) continue;
    
    // Get adjustments for this scene
    const sceneId = v4Scene.sceneId;
    const sceneAdjustments = adjustments.get(sceneId);
    
    if (!sceneAdjustments || !v3Scene) {
      // No adjustments, keep original V4 content
      result.push(...v4Scene.content);
      continue;
    }
    
    // Compute diff to get line mapping
    const diffLines = computeLineDiff(v3Scene.content, v4Scene.content);
    const v4Lines = [...v4Scene.content];
    
    // Apply adjustments
    for (const [lineIdx, action] of sceneAdjustments.entries()) {
      if (action === 'revert' && diffLines[lineIdx]) {
        const diffLine = diffLines[lineIdx];
        if (diffLine.left !== undefined && diffLine.rightLineNum !== undefined) {
          // Replace V4 line with V3 line
          const v4LineIdx = diffLine.rightLineNum - 1;
          if (v4LineIdx >= 0 && v4LineIdx < v4Lines.length) {
            v4Lines[v4LineIdx] = diffLine.left;
          }
        }
      }
      // 'keep' action means keep V4 as is, no change needed
    }
    
    result.push(...v4Lines);
  }
  
  return result.join('\n');
}

// Export helper for getting V4 content modified by adjustments
// revertedLines: sceneId -> Set<rightLineNum> 表示哪些行需要恢复为V3版本
export function getAdjustedV4Content(
  v3Content: string,
  v4Content: string,
  revertedLines: Map<string, Set<number>>
): string {
  const v3Scenes = parseScenes(v3Content);
  const v4Scenes = parseScenes(v4Content);
  
  const result: string[] = [];
  
  for (let sceneIdx = 0; sceneIdx < v4Scenes.length; sceneIdx++) {
    const v4Scene = v4Scenes[sceneIdx];
    const v3Scene = v3Scenes[sceneIdx];
    
    if (!v4Scene) continue;
    
    const sceneId = v4Scene.sceneId;
    const revertedSet = revertedLines.get(sceneId);
    
    if (!revertedSet || !v3Scene) {
      result.push(...v4Scene.content);
      continue;
    }
    
    // Compute diff to get line mapping between V3 and V4
    const diffLines = computeLineDiff(v3Scene.content, v4Scene.content);
    const v4Lines = [...v4Scene.content];
    
    // Build a map: rightLineNum -> V3 line content (for modified lines)
    const v3LineMap = new Map<number, string>();
    for (const diffLine of diffLines) {
      if (diffLine.type === 'modified' && diffLine.rightLineNum !== undefined && diffLine.left !== undefined) {
        v3LineMap.set(diffLine.rightLineNum, diffLine.left);
      }
    }
    
    // Apply reverts: replace V4 lines with V3 content
    for (const rightLineNum of revertedSet) {
      const v3Content = v3LineMap.get(rightLineNum);
      if (v3Content) {
        const v4LineIdx = rightLineNum - 1;
        if (v4LineIdx >= 0 && v4LineIdx < v4Lines.length) {
          v4Lines[v4LineIdx] = v3Content;
        }
      }
    }
    
    result.push(...v4Lines);
  }
  
  return result.join('\n');
}
