import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Script } from '@/types';
import TopBar from '@/components/TopBar';
import AssetDrawer from '@/components/AssetDrawer';
import SceneBlock from '@/components/SceneBlock';
import SceneNavigator from '@/components/SceneNavigator';
import InventoryView from '@/components/InventoryView';
import MindmapView from '@/components/MindmapView';
import { useScriptStore } from '@/stores/scriptStore';
import { TOKEN_TYPE_CONFIGS } from '@/types';

type ViewMode = 'review' | 'inventory' | 'mindmap';

const ReviewPage: React.FC = () => {
  const script = useScriptStore((s) => s.script);
  const initScript = useScriptStore((s) => s.initScript);
  const showDrawer = useScriptStore((s) => s.showDrawer);
  const activeFilters = useScriptStore((s) => s.activeFilters);
  const selectedEntities = useScriptStore((s) => s.selectedEntities);

  const [viewMode, setViewMode] = useState<ViewMode>('review');
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    token: string;
  }>({ visible: false, x: 0, y: 0, token: '' });

  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!script) {
      initScript();
    }
  }, [script, initScript]);

  useEffect(() => {
    if (!script || viewMode !== 'review') return;

    const container = scrollRef.current;
    if (!container) return;

    const sceneObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          const sceneId = (visible[0].target as HTMLElement).dataset.sceneId;
          if (sceneId) {
            setActiveSceneId(sceneId);
          }
        }
      },
      {
        root: container,
        threshold: [0.1, 0.3, 0.5],
      }
    );

    const sceneElements = container.querySelectorAll('[data-scene-id]');
    sceneElements.forEach((el) => sceneObserver.observe(el));

    return () => sceneObserver.disconnect();
  }, [script, viewMode]);

  const handleNavigate = useCallback(
    (sceneId: string, lineNumber: number) => {
      setActiveSceneId(sceneId);
      const el = document.getElementById(`line-${lineNumber}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('animate-flash');
        setTimeout(() => el.classList.remove('animate-flash'), 1500);
      }
    },
    []
  );

  useEffect(() => {
    const handleContextMenu = (e: Event) => {
      const event = e as CustomEvent;
      const detail = event.detail;
      if (detail && detail.token) {
        setContextMenu({
          visible: true,
          x: detail.x,
          y: detail.y,
          token: detail.token,
        });
      }
    };

    window.addEventListener('token-context-menu', handleContextMenu);
    return () => window.removeEventListener('token-context-menu', handleContextMenu);
  }, []);

  useEffect(() => {
    const handleClick = () => {
      setContextMenu((prev) => ({ ...prev, visible: false }));
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  if (!script) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-400">加载剧本中...</div>
      </div>
    );
  }

  if (viewMode === 'inventory') {
    return (
      <div className="h-screen flex flex-col bg-white">
        <TopBar viewMode={viewMode} onViewChange={setViewMode} />
        <InventoryView script={script} />
      </div>
    );
  }

  if (viewMode === 'mindmap') {
    return (
      <div className="h-screen flex flex-col bg-white">
        <TopBar viewMode={viewMode} onViewChange={setViewMode} />
        <MindmapView script={script} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <TopBar viewMode={viewMode} onViewChange={setViewMode} />

      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'review' && (
          <SceneNavigator
            script={script}
            onNavigate={handleNavigate}
            activeFilters={activeFilters}
            activeSceneId={activeSceneId}
          />
        )}

        <div
          ref={scrollRef}
          className={`
            flex-1 overflow-auto transition-all duration-300
            ${showDrawer ? 'mr-[380px]' : ''}
          `}
          onClick={() => {
            if (selectedEntities.length > 0) {
              useScriptStore.getState().clearSelection();
            }
          }}
        >
          <div className="max-w-4xl mx-auto py-4">
            <div className="mb-4 px-4 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-slate-800">{script.title}</h1>
                <p className="text-xs text-slate-400">
                  共 {script.scenes.length} 场 ·{' '}
                  {script.scenes.reduce((sum, s) => sum + s.lines.length, 0)} 行文本
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(Object.keys(TOKEN_TYPE_CONFIGS) as (keyof typeof TOKEN_TYPE_CONFIGS)[]).map(
                  (type) => {
                    const config = TOKEN_TYPE_CONFIGS[type];
                    const active = activeFilters[type];
                    return (
                      <div
                        key={type}
                        className={`w-3 h-3 rounded transition-opacity ${
                          active ? 'opacity-100' : 'opacity-30'
                        }`}
                        style={{ backgroundColor: config.textColor }}
                        title={config.label}
                      />
                    );
                  }
                )}
              </div>
            </div>

            {script.scenes.map((scene) => (
              <SceneBlock
                key={scene.id}
                scene={scene}
                onNavigate={handleNavigate}
              />
            ))}

            <div className="text-center py-8 text-xs text-slate-300">
              — 剧本结束 —
            </div>
          </div>
        </div>

        <AssetDrawer script={script} onNavigate={handleNavigate} />
      </div>

      {contextMenu.visible && (
        <div
          className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-xl py-1 min-w-[180px]"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 200),
            top: Math.min(contextMenu.y, window.innerHeight - 200),
          }}
        >
          <button
            onClick={() => {
              useScriptStore.getState().selectEntity(contextMenu.token);
              setContextMenu((prev) => ({ ...prev, visible: false }));
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
          >
            查看资产详情
          </button>
          <button
            onClick={() => {
              useScriptStore.getState().toggleEntity(contextMenu.token);
              setContextMenu((prev) => ({ ...prev, visible: false }));
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
          >
            多选对比
          </button>
          <div className="h-px bg-slate-100 my-1" />
          <button
            onClick={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-red-600"
          >
            关闭
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewPage;