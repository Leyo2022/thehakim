import React, { useMemo, useState } from 'react';
import { TOKEN_TYPE_CONFIGS } from '@/types';
import type { Script } from '@/types';
import { X, MapPin, FileText, Eye, ChevronRight, ChevronDown } from 'lucide-react';
import { useScriptStore } from '@/stores/scriptStore';
import { getTokenLocations } from '@/utils/tokenEngine';

interface AssetDrawerProps {
  script: Script;
  onNavigate: (sceneId: string, lineNumber: number) => void;
}

export const AssetDrawer: React.FC<AssetDrawerProps> = ({ script, onNavigate }) => {
  const showDrawer = useScriptStore((s) => s.showDrawer);
  const selectedEntity = useScriptStore((s) => s.selectedEntity);
  const selectedEntities = useScriptStore((s) => s.selectedEntities);
  const clearSelection = useScriptStore((s) => s.clearSelection);
  const toggleEntity = useScriptStore((s) => s.toggleEntity);
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set());

  const entityInfo = useMemo(() => {
    if (!selectedEntity) return null;

    for (const scene of script.scenes) {
      for (const line of scene.lines) {
        const token = line.tokens.find((t) => t.canonicalName === selectedEntity);
        if (token) {
          return {
            canonicalName: token.canonicalName,
            type: token.type,
            aliases: token.aliases,
          };
        }
      }
    }
    return null;
  }, [script, selectedEntity]);

  const locations = useMemo(() => {
    if (!selectedEntity) return [];
    return getTokenLocations(script, selectedEntity);
  }, [script, selectedEntity]);

  const groupedLocations = useMemo(() => {
    const groups = new Map<string, typeof locations>();
    for (const loc of locations) {
      const existing = groups.get(loc.sceneNumber);
      if (existing) {
        existing.push(loc);
      } else {
        groups.set(loc.sceneNumber, [loc]);
      }
    }
    return groups;
  }, [locations]);

  const toggleScene = (sceneNumber: string) => {
    setExpandedScenes((prev) => {
      const next = new Set(prev);
      if (next.has(sceneNumber)) {
        next.delete(sceneNumber);
      } else {
        next.add(sceneNumber);
      }
      return next;
    });
  };

  const entityTypeMap = useMemo(() => {
    const map = new Map<string, { type: string; count: number }>();
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
  }, [script]);

  if (!showDrawer || selectedEntities.length === 0) return null;

  const config = entityInfo ? TOKEN_TYPE_CONFIGS[entityInfo.type] : null;
  const totalCount = locations.length;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-30 transition-opacity"
        onClick={clearSelection}
      />
      <div className="fixed right-0 top-14 bottom-0 w-[380px] bg-white shadow-2xl z-40 flex flex-col border-l border-slate-200 animate-slideIn">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-600">
              资产详情
            </span>
            {selectedEntities.length > 1 && (
              <span className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-500">
                对比模式 ({selectedEntities.length})
              </span>
            )}
          </div>
          <button
            onClick={clearSelection}
            className="p-1 rounded hover:bg-slate-100 transition-colors"
          >
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {selectedEntities.length === 1 && entityInfo && config ? (
          <>
            <div className="shrink-0 p-4 space-y-4 border-b border-slate-100">
              <div
                className="rounded-lg p-3 flex items-center gap-3"
                style={{ backgroundColor: config.bgColor }}
              >
                <span className="text-2xl">{config.icon}</span>
                <div>
                  <div className="font-bold text-lg" style={{ color: config.textColor }}>
                    {entityInfo.canonicalName}
                  </div>
                  <div className="text-xs" style={{ color: config.textColor }}>
                    {config.label}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 space-y-3">
                <div>
                  <div className="text-[11px] text-slate-400 uppercase mb-1">别名</div>
                  <div className="flex flex-wrap gap-1">
                    {[entityInfo.canonicalName, ...entityInfo.aliases].map((alias, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs text-slate-600"
                      >
                        {alias}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase">全局出现</div>
                    <div className="text-lg font-bold text-slate-800">{totalCount}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase">出现场次</div>
                    <div className="text-lg font-bold text-slate-800">
                      {new Set(locations.map((l) => l.sceneId)).size}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-4 py-2 border-b border-slate-100 shrink-0">
                <div className="text-[11px] text-slate-400 uppercase flex items-center gap-1">
                  <MapPin size={12} />
                  出现位置
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
                {Array.from(groupedLocations.entries()).map(([sceneNumber, group]) => {
                  const isExpanded = expandedScenes.has(sceneNumber);
                  const firstLoc = group[0];
                  return (
                    <div key={sceneNumber} className="rounded-lg border border-slate-200 overflow-hidden">
                      <button
                        onClick={() => toggleScene(sceneNumber)}
                        className="w-full text-left p-2 bg-slate-50 hover:bg-sky-50 transition-colors flex items-center gap-2"
                      >
                        {isExpanded ? (
                          <ChevronDown size={14} className="text-slate-400 shrink-0" />
                        ) : (
                          <ChevronRight size={14} className="text-slate-400 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-xs text-slate-500 font-semibold">
                              {sceneNumber}
                            </span>
                            <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-500">
                              {group.length} 处
                            </span>
                            <Eye
                              size={12}
                              className="text-slate-300 ml-auto shrink-0"
                            />
                          </div>
                          <div className="text-xs text-slate-600 truncate">
                            {firstLoc.preview}
                          </div>
                        </div>
                      </button>
                      {isExpanded && group.length > 1 && (
                        <div className="border-t border-slate-100">
                          {group.slice(1).map((loc, idx) => (
                            <button
                              key={idx}
                              onClick={() => onNavigate(loc.sceneId, loc.lineNumber)}
                              className="w-full text-left px-3 py-1.5 hover:bg-sky-50 transition-colors flex items-center gap-2"
                            >
                              <span className="w-8 font-mono text-[10px] text-slate-400 shrink-0">
                                L{loc.lineNumber}
                              </span>
                              <span className="text-xs text-slate-500 truncate">
                                {loc.preview}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : selectedEntities.length > 1 ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-2">
              {selectedEntities.map((name) => {
                const info = entityTypeMap.get(name);
                if (!info) return null;
                const tConfig = TOKEN_TYPE_CONFIGS[info.type as keyof typeof TOKEN_TYPE_CONFIGS];
                return (
                  <div
                    key={name}
                    className="flex items-center gap-3 p-2 rounded-lg border border-slate-100"
                    style={{ backgroundColor: tConfig.bgColor }}
                  >
                    <span className="text-lg">{tConfig.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm" style={{ color: tConfig.textColor }}>
                        {name}
                      </div>
                      <div className="text-xs" style={{ color: tConfig.textColor }}>
                        {tConfig.label} · {info.count} 次
                      </div>
                    </div>
                    <button
                      onClick={() => toggleEntity(name)}
                      className="p-1 rounded hover:bg-white/50 transition-colors"
                    >
                      <X size={14} className="opacity-50" />
                    </button>
                  </div>
                );
              })}
            </div>

            {(() => {
              const sceneSets: string[][] = selectedEntities.map(() => []);
              for (const scene of script.scenes) {
                const namesInScene = new Set(
                  scene.lines.flatMap((l) => l.tokens.map((t) => t.canonicalName))
                );
                selectedEntities.forEach((name, idx) => {
                  if (namesInScene.has(name)) {
                    sceneSets[idx].push(scene.sceneNumber);
                  }
                });
              }
              const commonScenes = sceneSets.reduce(
                (a, b) => a.filter((x) => b.includes(x)),
                sceneSets[0] || []
              );

              return (
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-[11px] text-slate-400 uppercase mb-2">共同出现场次</div>
                  {commonScenes.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {commonScenes.map((s) => (
                        <span key={s} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs font-mono text-slate-600">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">无共同场次</div>
                  )}
                </div>
              );
            })()}
          </div>
        ) : null}
      </div>
    </>
  );
};

export default AssetDrawer;