import React, { useMemo } from 'react';
import type { Script, TokenType } from '@/types';
import { TOKEN_TYPE_CONFIGS } from '@/types';
import { useScriptStore } from '@/stores/scriptStore';
import { ChevronRight, ChevronDown, Circle } from 'lucide-react';

interface MindmapViewProps {
  script: Script;
}

export const MindmapView: React.FC<MindmapViewProps> = ({ script }) => {
  const selectEntity = useScriptStore((s) => s.selectEntity);
  const activeFilters = useScriptStore((s) => s.activeFilters);

  const [expandedScenes, setExpandedScenes] = React.useState<Set<string>>(
    new Set(script.scenes.map((s) => s.id))
  );

  const toggleScene = (sceneId: string) => {
    setExpandedScenes((prev) => {
      const next = new Set(prev);
      if (next.has(sceneId)) next.delete(sceneId);
      else next.add(sceneId);
      return next;
    });
  };

  const sceneEntities = useMemo(() => {
    const map = new Map<
      string,
      { name: string; type: TokenType; count: number }[]
    >();

    for (const scene of script.scenes) {
      const entityCounts = new Map<string, { name: string; type: TokenType; count: number }>();
      scene.lines.forEach((line) => {
        line.tokens.forEach((token) => {
          if (!activeFilters[token.type]) return;
          const existing = entityCounts.get(token.canonicalName);
          if (existing) {
            existing.count++;
          } else {
            entityCounts.set(token.canonicalName, {
              name: token.canonicalName,
              type: token.type,
              count: 1,
            });
          }
        });
      });
      map.set(scene.id, Array.from(entityCounts.values()));
    }

    return map;
  }, [script, activeFilters]);

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-1">场次资产详情</h2>
          <p className="text-sm text-slate-500">
            按场次展示资产分布，点击资产可在审阅视图中定位
          </p>
        </div>

        <div className="space-y-3">
          {script.scenes.map((scene) => {
            const entities = sceneEntities.get(scene.id) || [];
            const expanded = expandedScenes.has(scene.id);

            return (
              <div key={scene.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => toggleScene(scene.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  {expanded ? (
                    <ChevronDown size={16} className="text-slate-400" />
                  ) : (
                    <ChevronRight size={16} className="text-slate-400" />
                  )}
                  <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    {scene.sceneNumber}
                  </span>
                  <span className="font-bold text-sm text-slate-800 flex-1 text-left">
                    {scene.header || '(空场景)'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {entities.length} 类资产
                  </span>
                </button>

                {expanded && (
                  <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                    {entities.length === 0 ? (
                      <div className="text-xs text-slate-400 italic">当前场次无匹配资产</div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {entities.map((entity) => {
                          const config = TOKEN_TYPE_CONFIGS[entity.type];
                          return (
                            <button
                              key={entity.name}
                              onClick={() => selectEntity(entity.name)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all hover:scale-105"
                              style={{
                                backgroundColor: config.bgColor,
                                borderColor: config.borderColor,
                                color: config.textColor,
                              }}
                            >
                              <span>{config.icon}</span>
                              <span>{entity.name}</span>
                              <span className="text-[10px] bg-white/60 rounded px-1 font-mono">
                                {entity.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-white rounded-xl border border-slate-200">
          <div className="text-sm font-medium text-slate-700 mb-3">图例</div>
          <div className="flex flex-wrap gap-3">
            {(Object.keys(TOKEN_TYPE_CONFIGS) as TokenType[]).map((type) => {
              const config = TOKEN_TYPE_CONFIGS[type];
              return (
                <div key={type} className="flex items-center gap-1.5">
                  <Circle size={10} fill={config.textColor} className="text-transparent" />
                  <span className="text-xs text-slate-500">{config.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MindmapView;