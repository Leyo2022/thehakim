import rawScript from './rawScript.md?raw';
import v3EnglishScript from './v3EnglishScript.md?raw';
import v3EnglishOriginal from './v3EnglishOriginal.md?raw';
import v4Script from './v4Script.md?raw';
import v4EnglishScript from './v4EnglishScript.md?raw';
import v4EnglishOriginal from './v4EnglishOriginal.md?raw';

export interface ScriptVersion {
  id: string;
  name: string;
  description: string;
  content: string;
  updatedAt: string;
  language?: 'zh' | 'en';
}

export const scriptVersions: ScriptVersion[] = [
  {
    id: 'v3',
    name: 'V3',
    description: '当前版本',
    content: rawScript,
    updatedAt: '2026-08-20',
    language: 'zh',
  },
  {
    id: 'v4',
    name: 'V4',
    description: 'Proyas修订版',
    content: v4Script,
    updatedAt: '2026-08-20',
    language: 'zh',
  },
];

export const getScriptVersionContent = (versionId: string): string => {
  const version = scriptVersions.find((v) => v.id === versionId);
  return version?.content || rawScript;
};

export const getScriptVersions = (): ScriptVersion[] => {
  return scriptVersions;
};

export const getV3Content = (language: 'zh' | 'en' = 'zh'): string => {
  return language === 'zh' ? rawScript : v3EnglishScript;
};

export const getV4Content = (language: 'zh' | 'en'): string => {
  return language === 'zh' ? v4Script : v4EnglishScript;
};

// Get original English versions for diff comparison (raw INT./EXT. format)
// This ensures scene matching works correctly between V3 and V4
export const getV3EnglishOriginal = (): string => v3EnglishOriginal;
export const getV4EnglishOriginal = (): string => v4EnglishOriginal;

