import rawScript from './rawScript.md?raw';

export interface ScriptVersion {
  id: string;
  name: string;
  description: string;
  content: string;
  updatedAt: string;
}

export const scriptVersions: ScriptVersion[] = [
  {
    id: 'current',
    name: '当前版本',
    description: '最新审阅版',
    content: rawScript,
    updatedAt: new Date().toISOString().split('T')[0],
  },
];

export const getScriptVersionContent = (versionId: string): string => {
  const version = scriptVersions.find((v) => v.id === versionId);
  return version?.content || rawScript;
};

export const getScriptVersions = (): ScriptVersion[] => {
  return scriptVersions;
};
