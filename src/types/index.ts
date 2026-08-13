export type TokenType = 'character' | 'prop' | 'vfx' | 'audio' | 'costume' | 'scene' | 'lighting';

export type LineType = 'scene_header' | 'metadata' | 'dialogue' | 'action' | 'transition';

export interface Token {
  id: string;
  type: TokenType;
  canonicalName: string;
  matchedText: string;
  aliases: string[];
  source: 'ai' | 'manual' | 'ai_confirmed' | 'scene_mapping';
  startOffset: number;
  endOffset: number;
  lineId: string;
  sceneId: string;
}

export interface Entity {
  id: string;
  canonicalName: string;
  type: TokenType;
  aliases: string[];
}

export interface Line {
  id: string;
  lineNumber: number;
  type: LineType;
  rawText: string;
  tokens: Token[];
  sceneId: string;
}

export interface Scene {
  id: string;
  sceneNumber: string;
  sceneCode: string;
  header: string;
  summary: string;
  lines: Line[];
  associatedCharacters: string[];
  associatedProps: string[];
  associatedScenes: string[];
  associatedLighting: string[];
}

export interface Script {
  id: string;
  title: string;
  synopsis: string;
  scenes: Scene[];
  totalCharacters: string[];
  totalProps: string[];
  totalScenes: string[];
  totalLighting: string[];
}

export interface TokenTypeConfig {
  key: TokenType;
  label: string;
  icon: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  shape: string;
}

export const TOKEN_TYPE_CONFIGS: Record<TokenType, TokenTypeConfig> = {
  character: {
    key: 'character',
    label: '角色',
    icon: '👤',
    bgColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    textColor: '#0369A1',
    shape: 'D',
  },
  prop: {
    key: 'prop',
    label: '元素',
    icon: '🗡️',
    bgColor: '#FEF3C7',
    borderColor: '#FDE68A',
    textColor: '#B45309',
    shape: 'C',
  },
  scene: {
    key: 'scene',
    label: '场景',
    icon: '📍',
    bgColor: '#F3E8FF',
    borderColor: '#E9D5FF',
    textColor: '#6B21A8',
    shape: 'T',
  },
  lighting: {
    key: 'lighting',
    label: '灯光',
    icon: '💡',
    bgColor: '#DCFCE7',
    borderColor: '#BBF7D0',
    textColor: '#15803D',
    shape: 'S',
  },
  vfx: {
    key: 'vfx',
    label: '特效',
    icon: '✨',
    bgColor: '#FFEDD5',
    borderColor: '#FED7AA',
    textColor: '#C2410C',
    shape: 'P',
  },
  audio: {
    key: 'audio',
    label: '音效',
    icon: '🔊',
    bgColor: '#FCE7F3',
    borderColor: '#FBCFE8',
    textColor: '#BE185D',
    shape: 'P',
  },
  costume: {
    key: 'costume',
    label: '服装',
    icon: '👗',
    bgColor: '#EDF4FF',
    borderColor: '#C7D7FE',
    textColor: '#3730A3',
    shape: 'S',
  },
};

export const DISPLAY_ORDER: TokenType[] = [
  'character',
  'scene',
  'lighting',
  'prop',
  'vfx',
  'audio',
  'costume',
];