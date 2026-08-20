import { diffLines, Change } from 'diff';

export interface DiffLine {
  type: 'unchanged' | 'added' | 'removed' | 'modified';
  left?: string;
  right?: string;
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
// Supports flexible scene IDs: S1, S001, S001A, S001AA, S001B, etc.
// The format is: S<digits>[<uppercase_letters>]
// Examples: S1, S001, S001A, S001AA, S001B, S001C, S002
export function parseScenes(text: string) {
  const lines = text.split('\n');
  const scenes: {
    sceneNum: number;
    sceneId: string;
    title: string;
    content: string[];
  }[] = [];

  let currentScene: typeof scenes[0] | null = null;

  // Regex supports: S<number>[optional uppercase letters]
  // Examples: S1, S001, S001A, S001AA, S001B
  const sceneRegex = /\*\*第(\d+[A-Z]*)场\s+S(\d+[A-Z]*)\s+(内景|外景|闪回|内景\s*\/\s*外景|外景\s*\/\s*内景|内\s*\/\s*外景|外\s*\/\s*内景)\s*(.+?)\*\*/;

  for (const line of lines) {
    const sceneMatch = line.match(sceneRegex);
    if (sceneMatch) {
      if (currentScene) {
        scenes.push(currentScene);
      }
      currentScene = {
        sceneNum: parseInt(sceneMatch[1]),
        sceneId: 'S' + sceneMatch[2],
        title: line.trim().replace(/\*\*/g, ''),
        content: [line],
      };
    } else if (currentScene) {
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
export function sortScenesById(scenes: Array<{ sceneId: string }>): Array<{ sceneId: string }> {
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
function computeLineDiff(leftLines: string[], rightLines: string[]): DiffLine[] {
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
          leftLineNum,
        });
      }
    } else if (change.added) {
      for (const part of parts) {
        rightLineNum++;
        diff.push({
          type: 'added',
          right: part,
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

// Compare two script versions using scene ID matching (not positional)
export function compareVersions(v3Text: string, v4Text: string): VersionDiff {
  const v3Scenes = parseScenes(v3Text);
  const v4Scenes = parseScenes(v4Text);

  // Sort V4 scenes by the custom insertion-sort rule
  // This ensures S001AA < S001 < S001A < S001B
  const sortedV4Scenes = sortScenesById(v4Scenes);

  // Build maps by scene ID for accurate matching
  const v3ById = new Map<string, typeof v3Scenes[0]>();
  const v4ById = new Map<string, typeof v4Scenes[0]>();
  
  v3Scenes.forEach(s => v3ById.set(s.sceneId, s));
  v4Scenes.forEach(s => v4ById.set(s.sceneId, s));

  const sceneDiffs: SceneDiff[] = [];
  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;

  // Track which scenes have been processed
  const v3Processed = new Set<string>();
  const v4Processed = new Set<string>();

  // First pass: match scenes by ID using sorted V4 order
  for (const v4Scene of sortedV4Scenes) {
    const v3Scene = v3ById.get(v4Scene.sceneId);
    
    if (v3Scene) {
      v3Processed.add(v3Scene.sceneId);
      v4Processed.add(v4Scene.sceneId);
      
      // Both exist - check for changes
      const hasChanges = !isSceneContentSame(v3Scene.content, v4Scene.content);

      if (hasChanges) {
        modifiedCount++;
        sceneDiffs.push({
          sceneNum: v4Scene.sceneNum,
          sceneId: v4Scene.sceneId,
          title: v4Scene.title,
          type: 'modified',
          lines: [], // Lazy computed
        });
      } else {
        sceneDiffs.push({
          sceneNum: v4Scene.sceneNum,
          sceneId: v4Scene.sceneId,
          title: v4Scene.title,
          type: 'unchanged',
          lines: [],
        });
      }
    } else {
      // Only in V4 - it's a new scene
      addedCount++;
      sceneDiffs.push({
        sceneNum: v4Scene.sceneNum,
        sceneId: v4Scene.sceneId,
        title: v4Scene.title,
        type: 'added',
        lines: [],
      });
      v4Processed.add(v4Scene.sceneId);
    }
  }

  // Second pass: find scenes only in V3 (removed)
  for (const v3Scene of v3Scenes) {
    if (!v4Processed.has(v3Scene.sceneId)) {
      removedCount++;
      sceneDiffs.push({
        sceneNum: v3Scene.sceneNum,
        sceneId: v3Scene.sceneId,
        title: v3Scene.title,
        type: 'removed',
        lines: [],
      });
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
