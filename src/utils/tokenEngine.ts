import type { Scene, Line, Token, TokenType, LineType, Script } from '@/types';
import { TOKEN_TYPE_CONFIGS } from '@/types';
import { allEntityAliases, allPropAliases, getScriptFromMapping, sceneHeaders } from '@/data/scriptMapping';
import rawScript from '@/data/rawScript.md?raw';

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function stripMarkdown(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1');
}

function parseScript(rawText: string): Scene[] {
  const cleaned = stripMarkdown(rawText);
  const lines = cleaned.split('\n');
  const scenes: Scene[] = [];
  let currentScene: Scene | null = null;
  let currentLines: Line[] = [];
  let emptyLineCount = 0;

  const sceneHeaderRegex = /^\s*(\d{1,3})\s+(内景|外景)\s+(.+?)\s*(白天|夜晚|清晨|黄昏|拂晓|傍晚|日夜|日)?\s*-?\s*(\d{4})?/;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (trimmed === '') {
      emptyLineCount++;
      if (currentScene) {
        currentLines.push({
          id: generateId(),
          lineNumber: i + 1,
          type: 'transition',
          rawText: '',
          tokens: [],
          sceneId: currentScene.id,
        });
      }
      continue;
    }

    emptyLineCount = 0;

    const headerMatch = trimmed.match(sceneHeaderRegex);

    if (headerMatch) {
      if (currentScene) {
        currentScene.lines = currentLines;
        scenes.push(currentScene);
      }
      const sceneNumber = parseInt(headerMatch[1]);
      const sceneCode = `Sc${String(sceneNumber).padStart(3, '0')}`;
      currentScene = {
        id: generateId(),
        sceneNumber: `SC${String(sceneNumber).padStart(3, '0')}`,
        sceneCode,
        header: trimmed,
        summary: sceneHeaders[sceneCode]?.summary || '',
        lines: [],
        associatedCharacters: [],
        associatedProps: [],
        associatedScenes: [],
        associatedLighting: [],
      };
      currentLines = [];
      continue;
    }

    const lineType = detectLineType(trimmed, i > 0 ? lines[i - 1] : '');
    const line: Line = {
      id: generateId(),
      lineNumber: i + 1,
      type: lineType,
      rawText: trimmed,
      tokens: [],
      sceneId: currentScene?.id || 'scene_no_header',
    };
    currentLines.push(line);
  }

  if (currentScene) {
    currentScene.lines = currentLines;
    scenes.push(currentScene);
  } else {
    const noHeaderScene: Scene = {
      id: generateId(),
      sceneNumber: 'SC000',
      sceneCode: '',
      header: '',
      summary: '',
      lines: currentLines,
      associatedCharacters: [],
      associatedProps: [],
      associatedScenes: [],
      associatedLighting: [],
    };
    scenes.push(noHeaderScene);
  }

  return scenes;
}

function detectLineType(text: string, prevLine: string): LineType {
  const trimmed = text.trim();

  if (/^\d+\s+[内外]景/i.test(trimmed)) {
    return 'scene_header';
  }

  if (/^字幕[：:]/.test(trimmed)) {
    return 'metadata';
  }

  if (trimmed === '') {
    return 'transition';
  }

  if (prevLine.trim() === '' && !/[。？！]$/.test(trimmed) && trimmed.length <= 25) {
    return 'dialogue';
  }

  if (/[。？！]$/.test(trimmed) || /（[^）]*）/.test(trimmed)) {
    if (prevLine.trim() !== '' && !/[。？！]$/.test(prevLine.trim()) && /^[^\s（）]+$/.test(prevLine.trim()) && prevLine.trim().length <= 15) {
      return 'dialogue';
    }
  }

  if (/\d{4}/.test(trimmed) || /氛围/.test(trimmed)) {
    return 'metadata';
  }

  return 'action';
}

function findTokensInText(
  text: string,
  lineId: string,
  sceneId: string,
  entities: { canonicalName: string; type: TokenType; aliases: string[] }[],
  skipCharacterInDialogue: boolean = false
): Token[] {
  const tokens: Token[] = [];
  const usedRanges: [number, number][] = [];

  for (const entity of entities) {
    if (skipCharacterInDialogue && entity.type === 'character') continue;

    const allAliases = [entity.canonicalName, ...entity.aliases];

    for (const alias of allAliases) {
      if (!alias || alias.length < 2) continue;

      let searchStart = 0;
      while (true) {
        const idx = text.indexOf(alias, searchStart);
        if (idx === -1) break;

        const range: [number, number] = [idx, idx + alias.length];
        const overlaps = usedRanges.some(
          ([s, e]) => !(range[1] <= s || range[0] >= e)
        );

        if (!overlaps) {
          usedRanges.push(range);
          tokens.push({
            id: generateId(),
            type: entity.type,
            canonicalName: entity.canonicalName,
            matchedText: alias,
            aliases: entity.aliases,
            source: 'ai',
            startOffset: idx,
            endOffset: idx + alias.length,
            lineId,
            sceneId,
          });
        }
        searchStart = idx + 1;
      }
    }
  }

  tokens.sort((a, b) => a.startOffset - b.startOffset);
  return tokens;
}

export function tokenizeScript(): Script {
  const script = getScriptFromMapping();

  const parsedScenes = parseScript(rawScript);

  const mappingByCode = new Map<string, Scene>();
  for (const s of script.scenes) {
    mappingByCode.set(s.sceneCode, s);
  }

  const entities = [...allEntityAliases, ...allPropAliases];

  for (const parsedScene of parsedScenes) {
    const mappingScene = parsedScene.sceneCode ? mappingByCode.get(parsedScene.sceneCode) : undefined;

    if (mappingScene) {
      parsedScene.associatedCharacters = mappingScene.associatedCharacters;
      parsedScene.associatedProps = mappingScene.associatedProps;
      parsedScene.associatedScenes = mappingScene.associatedScenes;
      parsedScene.associatedLighting = mappingScene.associatedLighting;
      parsedScene.summary = mappingScene.summary || parsedScene.summary;
    }

    for (const line of parsedScene.lines) {
      line.tokens = findTokensInText(
        line.rawText,
        line.id,
        parsedScene.id,
        entities,
        line.type === 'dialogue'
      );
    }

    const sceneTokens: Token[] = [];

    for (const charName of parsedScene.associatedCharacters) {
      sceneTokens.push({
        id: generateId(),
        type: 'character',
        canonicalName: charName,
        matchedText: charName,
        aliases: [],
        source: 'scene_mapping',
        startOffset: 0,
        endOffset: 0,
        lineId: parsedScene.id,
        sceneId: parsedScene.id,
      });
    }

    for (const propName of parsedScene.associatedProps) {
      sceneTokens.push({
        id: generateId(),
        type: 'prop',
        canonicalName: propName,
        matchedText: propName,
        aliases: [],
        source: 'scene_mapping',
        startOffset: 0,
        endOffset: 0,
        lineId: parsedScene.id,
        sceneId: parsedScene.id,
      });
    }

    for (const sceneName of parsedScene.associatedScenes) {
      sceneTokens.push({
        id: generateId(),
        type: 'scene',
        canonicalName: sceneName,
        matchedText: sceneName,
        aliases: [],
        source: 'scene_mapping',
        startOffset: 0,
        endOffset: 0,
        lineId: parsedScene.id,
        sceneId: parsedScene.id,
      });
    }

    for (const lightName of parsedScene.associatedLighting) {
      sceneTokens.push({
        id: generateId(),
        type: 'lighting',
        canonicalName: lightName,
        matchedText: lightName,
        aliases: [],
        source: 'scene_mapping',
        startOffset: 0,
        endOffset: 0,
        lineId: parsedScene.id,
        sceneId: parsedScene.id,
      });
    }

    if (sceneTokens.length > 0) {
      const summaryLine: Line = {
        id: generateId(),
        lineNumber: 0,
        type: 'metadata',
        rawText: `场景资产映射`,
        tokens: sceneTokens,
        sceneId: parsedScene.id,
      };
      parsedScene.lines.unshift(summaryLine);
    }
  }

  return {
    ...script,
    scenes: parsedScenes.filter((s) => s.lines.length > 0),
  };
}

export function getTokenCounts(script: Script): Record<TokenType, number> {
  const counts: Record<TokenType, number> = {
    character: 0,
    prop: 0,
    vfx: 0,
    audio: 0,
    costume: 0,
    scene: 0,
    lighting: 0,
  };

  const entityCounts = new Map<string, TokenType>();

  for (const scene of script.scenes) {
    for (const line of scene.lines) {
      for (const token of line.tokens) {
        const key = token.canonicalName;
        if (!entityCounts.has(key)) {
          entityCounts.set(key, token.type);
          counts[token.type]++;
        }
      }
    }
  }

  return counts;
}

export function getSceneTokenCounts(
  scene: Scene
): Record<TokenType, number> {
  const counts: Record<TokenType, number> = {
    character: 0,
    prop: 0,
    vfx: 0,
    audio: 0,
    costume: 0,
    scene: 0,
    lighting: 0,
  };

  const entitiesInScene = new Set<string>();

  for (const line of scene.lines) {
    for (const token of line.tokens) {
      entitiesInScene.add(token.canonicalName);
    }
  }

  for (const name of entitiesInScene) {
    const firstLine = scene.lines.find((l) => l.tokens.some((t) => t.canonicalName === name));
    if (firstLine) {
      const token = firstLine.tokens.find((t) => t.canonicalName === name);
      if (token) counts[token.type]++;
    }
  }

  return counts;
}

export function getAllUniqueEntities(script: Script): Map<string, { type: TokenType; count: number }> {
  const map = new Map<string, { type: TokenType; count: number }>();

  for (const scene of script.scenes) {
    for (const line of scene.lines) {
      for (const token of line.tokens) {
        const existing = map.get(token.canonicalName);
        if (existing) {
          map.set(token.canonicalName, {
            type: token.type,
            count: existing.count + 1,
          });
        } else {
          map.set(token.canonicalName, { type: token.type, count: 1 });
        }
      }
    }
  }

  return map;
}

export function getTokenLocations(
  script: Script,
  canonicalName: string
): { sceneId: string; sceneNumber: string; lineNumber: number; preview: string }[] {
  const locations: { sceneId: string; sceneNumber: string; lineNumber: number; preview: string }[] = [];

  for (const scene of script.scenes) {
    for (const line of scene.lines) {
      const token = line.tokens.find((t) => t.canonicalName === canonicalName);
      if (token) {
        const preview = line.rawText.trim().slice(0, 40) + (line.rawText.trim().length > 40 ? '...' : '');
        locations.push({
          sceneId: scene.id,
          sceneNumber: scene.sceneNumber,
          lineNumber: line.lineNumber,
          preview,
        });
      }
    }
  }

  return locations;
}
