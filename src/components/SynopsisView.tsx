import React, { useState } from 'react';
import { synopsisChapters, type SynopsisParagraph } from '@/data/synopsisData';
import { sceneHeaders } from '@/data/scriptMapping';
import { useScriptStore } from '@/stores/scriptStore';
import { ChevronRight, MapPin } from 'lucide-react';

interface SynopsisViewProps {
  onNavigate: (sceneId: string, lineNumber: number) => void;
}

export const SynopsisView: React.FC<SynopsisViewProps> = ({ onNavigate }) => {
  const [activeParagraphId, setActiveParagraphId] = useState<string | null>(null);
  const script = useScriptStore((s) => s.script);

  const activeParagraph = synopsisChapters
    .flatMap((ch) => ch.paragraphs)
    .find((p) => p.id === activeParagraphId);

  const handleViewInScript = (sceneId: string) => {
    if (!script) return;
    const scene = script.scenes.find((s) => s.id === sceneId);
    if (scene) {
      onNavigate(sceneId, scene.lines.find((l) => l.lineNumber > 0)?.lineNumber || 1);
    }
  };

  return (
    <div className="h-full flex bg-white">
      {/* 中间概述内容 —— 全部章节一页展示 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-6">
          <div className="mb-8 text-center">
            <h1 className="text-xl font-bold text-slate-800">剧本概述</h1>
            <p className="text-xs text-slate-400 mt-2">
              共 {synopsisChapters.length} 部 · 根据真实事件改编
            </p>
          </div>

          {synopsisChapters.map((chapter) => (
            <div key={chapter.id} className="mb-10">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-800">
                  {chapter.title}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {chapter.subtitle}
                </p>
              </div>

              <div className="space-y-4">
                {chapter.paragraphs.map((para: SynopsisParagraph) => {
                  const isActive = activeParagraphId === para.id;
                  return (
                    <div
                      key={para.id}
                      onClick={() => setActiveParagraphId(isActive ? null : para.id)}
                      className={`
                        rounded-lg p-4 border transition-all cursor-pointer
                        ${isActive
                          ? 'border-sky-300 bg-sky-50 shadow-sm'
                          : 'border-slate-100 bg-white hover:border-sky-200 hover:shadow-sm'
                        }
                      `}
                    >
                      <p className="text-[15px] leading-relaxed text-slate-700">
                        {para.text}
                      </p>
                      <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                        <MapPin size={10} />
                        关联 {para.sceneIds.length} 个场次
                        {isActive && (
                          <ChevronRight size={10} className="text-sky-500" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mt-6 pb-8 text-center">
            <div className="h-px bg-slate-200 mb-4" />
            <p className="text-xs text-slate-400">
              — 点击段落可在右侧查看关联场次详情 —
            </p>
          </div>
        </div>
      </div>

      {/* 右侧场次映射边栏 */}
      <div className="w-[320px] border-l border-slate-200 bg-white flex flex-col shrink-0">
        {activeParagraph ? (
          <>
            <div className="px-4 py-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-sky-500" />
                <span className="text-xs font-semibold text-slate-600">
                  关联场次
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                本段落共涉及 {activeParagraph.sceneIds.length} 个场次
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {activeParagraph.sceneIds.map((sceneId) => {
                const header = sceneHeaders[sceneId];
                const scNum = sceneId.replace('Sc', 'SC');
                const title = header
                  ? header.header.split('  ')[0] || header.header
                  : sceneId;
                const summary = header?.summary;

                return (
                  <div
                    key={sceneId}
                    className="rounded-lg border border-slate-200 p-3 hover:border-sky-200 hover:bg-sky-50/30 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[11px] font-semibold text-slate-500">
                        {scNum}
                      </span>
                      <button
                        onClick={() => handleViewInScript(sceneId)}
                        className="text-[10px] text-sky-500 hover:text-sky-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        跳转剧本
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-600 leading-tight">
                      {title}
                    </div>
                    {summary && (
                      <div className="text-[10px] text-slate-400 mt-1">
                        {summary}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center">
              <MapPin size={28} className="text-slate-200 mx-auto mb-3" />
              <p className="text-xs text-slate-400 leading-relaxed">
                点击左侧段落，<br />
                查看对应场次信息
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SynopsisView;