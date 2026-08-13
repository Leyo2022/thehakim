import React, { useMemo } from 'react';
import type { Scene } from '@/types';
import ScriptLine from './ScriptLine';
import { TOKEN_TYPE_CONFIGS } from '@/types';
import { useScriptStore } from '@/stores/scriptStore';

interface SceneBlockProps {
  scene: Scene;
  onNavigate: (sceneId: string, lineNumber: number) => void;
}

export const SceneBlock: React.FC<SceneBlockProps> = ({ scene, onNavigate }) => {
  const selectedEntities = useScriptStore((s) => s.selectedEntities);
  const activeFilters = useScriptStore((s) => s.activeFilters);
  const toggleEntity = useScriptStore((s) => s.toggleEntity);

  const sceneTokenEntities = useMemo(() => {
    const set = new Set<string>();
    scene.lines.forEach((line) => {
      line.tokens.forEach((t) => set.add(t.canonicalName));
    });
    return set;
  }, [scene]);

  const visibleSelectedInScene = selectedEntities.filter((e) =>
    sceneTokenEntities.has(e)
  );

  const assetBadges = useMemo(() => {
    const badges: { name: string; type: keyof typeof TOKEN_TYPE_CONFIGS }[] = [];

    if (activeFilters.character) {
      scene.associatedCharacters.slice(0, 4).forEach((name) => {
        badges.push({ name, type: 'character' });
      });
      if (scene.associatedCharacters.length > 4) {
        badges.push({ name: `+${scene.associatedCharacters.length - 4}`, type: 'character' });
      }
    }

    if (activeFilters.scene) {
      scene.associatedScenes.forEach((name) => {
        badges.push({ name, type: 'scene' });
      });
    }

    if (activeFilters.lighting) {
      scene.associatedLighting.forEach((name) => {
        badges.push({ name, type: 'lighting' });
      });
    }

    if (activeFilters.prop) {
      scene.associatedProps.slice(0, 3).forEach((name) => {
        badges.push({ name, type: 'prop' });
      });
      if (scene.associatedProps.length > 3) {
        badges.push({ name: `+${scene.associatedProps.length - 3}`, type: 'prop' });
      }
    }

    return badges;
  }, [scene, activeFilters]);

  return (
    <div className="group/scene relative">
      {scene.header && (
        <div
          className="sticky top-14 z-10 bg-white/95 backdrop-blur-sm border-y border-slate-200 py-2 px-4 cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => {
            const firstLine = scene.lines.find((l) => l.lineNumber > 0 && l.type !== 'transition');
            if (firstLine) {
              onNavigate(scene.id, firstLine.lineNumber);
            }
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-slate-800 rounded-full shrink-0" />
            <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              {scene.sceneNumber}
            </span>
            <h3 className="font-bold text-sm text-slate-900 flex-1">
              {scene.header}
            </h3>
            {visibleSelectedInScene.length > 0 && (
              <div className="flex items-center gap-1">
                {visibleSelectedInScene.slice(0, 3).map((name) => {
                  const token = scene.lines
                    .flatMap((l) => l.tokens)
                    .find((t) => t.canonicalName === name);
                  if (!token) return null;
                  const config = TOKEN_TYPE_CONFIGS[token.type];
                  return (
                    <span
                      key={name}
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: config.textColor }}
                      title={name}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {assetBadges.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap pl-4">
              {assetBadges.map((badge, idx) => {
                const config = TOKEN_TYPE_CONFIGS[badge.type];
                const isCount = badge.name.startsWith('+');
                return (
                  <span
                    key={`${badge.name}-${idx}`}
                    className={`
                      inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium
                      border cursor-pointer transition-all hover:scale-105
                    `}
                    style={{
                      backgroundColor: config.bgColor,
                      borderColor: config.borderColor,
                      color: config.textColor,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isCount) {
                        toggleEntity(badge.name);
                      }
                    }}
                    title={isCount ? `更多${config.label}` : `${config.label}：${badge.name}`}
                  >
                    <span>{config.icon}</span>
                    <span>{badge.name}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="py-2">
        {scene.lines.map((line, idx) => (
          <div
            key={line.id}
            id={line.lineNumber > 0 ? `line-${line.lineNumber}` : undefined}
            data-scene-id={scene.id}
            className="scroll-mt-24"
          >
            <ScriptLine line={line} lineIndex={idx} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SceneBlock;
