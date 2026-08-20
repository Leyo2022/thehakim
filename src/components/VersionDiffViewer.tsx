import React, { useState, useMemo, useRef, useEffect } from 'react';
import { compareVersions, computeSceneDiff, getAdjustedV4Content, validateSceneIdConvention, type SceneDiff, type DiffLine } from '@/utils/diffEngine';
import { X, ChevronDown, ChevronRight, Plus, Minus, GitCompare, Check, MinusCircle, Save, AlertTriangle } from 'lucide-react';

interface VersionDiffViewerProps {
  v3Content: string;
  v4Content: string;
  v3ZhContent?: string;
  v4ZhContent?: string;
  onClose: () => void;
  onSaveV4Content?: (content: string) => void;
}

type FilterType = 'all' | 'added' | 'removed' | 'modified';
type MarkStatus = 'pending' | 'confirmed' | 'dismissed';

// Helper functions
const getTypeColor = (type: SceneDiff['type']) => {
  switch (type) {
    case 'added':
      return 'bg-emerald-500';
    case 'removed':
      return 'bg-red-500';
    case 'modified':
      return 'bg-amber-500';
    default:
      return 'bg-slate-400';
  }
};

const getTypeLabel = (type: SceneDiff['type']) => {
  switch (type) {
    case 'added':
      return '新增';
    case 'removed':
      return '删除';
    case 'modified':
      return '修改';
    default:
      return '未变';
  }
};

const lineBgClass = (line: DiffLine) => {
  if (line.isNormalizedMatch) return 'bg-purple-50 hover:bg-purple-100';
  switch (line.type) {
    case 'added':
      return 'bg-emerald-50 hover:bg-emerald-100';
    case 'removed':
      return 'bg-red-50 hover:bg-red-100';
    case 'modified':
      return 'bg-amber-50 hover:bg-amber-100';
    default:
      return 'hover:bg-slate-50';
  }
};

const lineIndicatorClass = (line: DiffLine, side: 'left' | 'right') => {
  if (line.isNormalizedMatch) return 'bg-purple-400';
  if (line.type === 'added' && side === 'right') return 'bg-emerald-500';
  if (line.type === 'removed' && side === 'left') return 'bg-red-500';
  if (line.type === 'modified' && side === 'left') return 'bg-amber-500';
  if (line.type === 'modified' && side === 'right') return 'bg-amber-500';
  return 'bg-transparent';
};

const markerClass = (line: DiffLine) => {
  if (line.isNormalizedMatch) return 'text-purple-600';
  switch (line.type) {
    case 'added':
      return 'text-emerald-600';
    case 'removed':
      return 'text-red-600';
    case 'modified':
      return 'text-amber-600';
    default:
      return 'text-slate-400';
  }
};

const getMarker = (line: DiffLine, side: 'left' | 'right') => {
  if (line.isNormalizedMatch) return '≈';
  if (line.type === 'added' && side === 'right') return '+';
  if (line.type === 'removed' && side === 'left') return '−';
  if (line.type === 'modified') return '~';
  return ' ';
};

export const VersionDiffViewer: React.FC<VersionDiffViewerProps> = ({
  v3Content,
  v4Content: initialV4Content,
  v3ZhContent,
  v4ZhContent,
  onClose,
  onSaveV4Content,
}) => {
  // Track current (potentially adjusted) V4 content
  const [v4Content, setV4Content] = useState(initialV4Content);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Track mark status: sceneId -> Map<diffIdx, MarkStatus>
  const [marks, setMarks] = useState<Map<string, Map<number, MarkStatus>>>(new Map());

  // Compute diff
  const [diff, setDiff] = useState<ReturnType<typeof compareVersions> | null>(null);
  const [computing, setComputing] = useState(true);

  useEffect(() => {
    setComputing(true);
    const timer = setTimeout(() => {
      try {
        const result = compareVersions(v3Content, v4Content, v3ZhContent, v4ZhContent);
        setDiff(result);
      } catch (e) {
        console.error('Error computing diff:', e);
      } finally {
        setComputing(false);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [v3Content, v4Content, v3ZhContent, v4ZhContent]);

  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set());
  const [showUnchanged, setShowUnchanged] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // No more lazy loading - lines are pre-computed in compareVersions

  // Filtered scenes with original indices preserved
  const filteredScenes = useMemo(() => {
    if (!diff) return [] as Array<{ scene: SceneDiff; originalIdx: number }>;
    let scenes = diff.scenes.map((s, originalIdx) => ({ scene: s, originalIdx }));
    if (!showUnchanged) {
      scenes = scenes.filter(({ scene }) => scene.type !== 'unchanged');
    }
    if (filter === 'all') return scenes;
    return scenes.filter(({ scene }) => scene.type === filter);
  }, [diff, filter, showUnchanged]);

  const toggleScene = (sceneId: string) => {
    const newSet = new Set(expandedScenes);
    if (newSet.has(sceneId)) {
      newSet.delete(sceneId);
    } else {
      newSet.add(sceneId);
    }
    setExpandedScenes(newSet);
  };

  const expandAll = () => {
    const ids = new Set<string>();
    filteredScenes.forEach(({ scene, originalIdx }) => {
      const sceneId = `${scene.sceneId || String(scene.sceneNum)}-${originalIdx}`;
      ids.add(sceneId);
    });
    setExpandedScenes(ids);
  };

  const collapseAll = () => {
    setExpandedScenes(new Set());
  };

  // Handle line mark
  const handleLineMark = (sceneId: string, diffIdx: number, status: MarkStatus) => {
    setMarks(prev => {
      const newMap = new Map(prev);
      let sceneMap = newMap.get(sceneId);
      if (!sceneMap) {
        sceneMap = new Map();
        newMap.set(sceneId, sceneMap);
      }
      
      if (status === 'pending') {
        sceneMap.delete(diffIdx);
      } else {
        sceneMap.set(diffIdx, status);
      }
      
      return newMap;
    });
    setHasUnsavedChanges(true);
  };

  // Apply dismissed marks to revert V4 content back to V3
  const handleApplyMarks = () => {
    // Build revertedLines map from marks
    const revertedLinesMap = new Map<string, Set<number>>();
    
    marks.forEach((sceneMap, sceneId) => {
      const revertedSet = new Set<number>();
      
      // Find which scene this sceneId maps to
      const sceneDiff = diff?.scenes.find(s => (s.sceneId || String(s.sceneNum)) === sceneId);
      if (!sceneDiff) return;
      
      sceneMap.forEach((status, diffIdx) => {
        if (status === 'dismissed' && sceneDiff.lines) {
          const line = sceneDiff.lines[diffIdx];
          if (line && line.rightLineNum !== undefined) {
            revertedSet.add(line.rightLineNum);
          }
        }
      });
      
      if (revertedSet.size > 0) {
        revertedLinesMap.set(sceneId, revertedSet);
      }
    });
    
    // Apply adjustments
    const adjustedContent = getAdjustedV4Content(v3Content, v4Content, revertedLinesMap);
    
    // Update state
    setV4Content(adjustedContent);
    setMarks(new Map());
    setHasUnsavedChanges(false);
    
    // Save to parent if callback exists
    if (onSaveV4Content) {
      onSaveV4Content(adjustedContent);
    }
  };

  // Count statistics
  const stats = useMemo(() => {
    let total = 0;
    let confirmed = 0;
    let dismissed = 0;
    let pending = 0;
    
    marks.forEach(sceneMap => {
      sceneMap.forEach(status => {
        if (status === 'confirmed') confirmed++;
        else if (status === 'dismissed') dismissed++;
      });
    });
    
    // Count total modified lines across all scenes from pre-computed diff
    if (diff) {
      diff.scenes.forEach(scene => {
        if (!scene.lines) return;
        const sceneId = scene.sceneId || '';
        scene.lines.forEach((line, idx) => {
          if (line.type === 'modified' && !line.isNormalizedMatch) {
            total++;
            const status = marks.get(sceneId)?.get(idx);
            if (!status || status === 'pending') pending++;
          }
        });
      });
    }
    
    return { total, confirmed, dismissed, pending };
  }, [marks, diff]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white shadow-2xl w-full h-screen flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-700 text-white">
          <div className="flex items-center gap-3">
            <GitCompare size={24} className="text-sky-300" />
            <div>
              <h2 className="text-lg font-bold">版本差异对比</h2>
              <p className="text-xs text-slate-300">V3 (左) vs V4 (右) — 逐条确认改动</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasUnsavedChanges && stats.dismissed > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-300">
                  已标记 {stats.dismissed} 项"忽略"
                </span>
                <button
                  onClick={handleApplyMarks}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-sm font-medium transition-colors"
                >
                  <Save size={14} />
                  <span>应用标记（回退忽略项）</span>
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">总变更</span>
            <span className="text-xl font-bold text-slate-800">{diff?.stats.totalChanges ?? '...'}</span>
          </div>
          <div className="h-6 w-px bg-slate-300" />
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <span className="text-xs text-slate-600">新增</span>
            <span className="text-sm font-semibold text-emerald-600">{diff?.stats.added ?? '...'}</span>
          </div>
          <div className="h-6 w-px bg-slate-300" />
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-xs text-slate-600">删除</span>
            <span className="text-sm font-semibold text-red-600">{diff?.stats.removed ?? '...'}</span>
          </div>
          <div className="h-6 w-px bg-slate-300" />
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-500" />
            <span className="text-xs text-slate-600">修改</span>
            <span className="text-sm font-semibold text-amber-600">{diff?.stats.modified ?? '...'}</span>
          </div>
          
          <div className="ml-6 h-6 w-px bg-slate-300" />
          
          {/* Mark statistics */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg border border-slate-200">
              <Check size={14} className="text-emerald-500" />
              <span className="text-xs text-slate-600">已确认</span>
              <span className="text-sm font-bold text-emerald-600">{stats.confirmed}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg border border-slate-200">
              <MinusCircle size={14} className="text-slate-400" />
              <span className="text-xs text-slate-600">已忽略</span>
              <span className="text-sm font-bold text-slate-500">{stats.dismissed}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg border border-slate-200">
              <span className="text-xs text-slate-600">待确认</span>
              <span className="text-sm font-bold text-amber-600">{stats.pending}</span>
            </div>
          </div>
          
          <div className="ml-auto flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showUnchanged}
                onChange={(e) => setShowUnchanged(e.target.checked)}
                className="rounded text-sky-600"
              />
              <span className="text-xs text-slate-600">显示未变更</span>
            </label>

            <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-0.5">
              {(['all', 'added', 'removed', 'modified'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    filter === f
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {f === 'all' ? '全部' : f === 'added' ? '新增' : f === 'removed' ? '删除' : '修改'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
              >
                展开全部
              </button>
              <button
                onClick={collapseAll}
                className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
              >
                折叠全部
              </button>
            </div>
          </div>
        </div>

        {/* ID Validation Warnings */}
        {diff && diff.stats.added > 0 && (
          <div className="px-6 py-2 bg-amber-50 border-b border-amber-200">
            <div className="flex items-center gap-2 text-xs">
              <AlertTriangle size={14} className="text-amber-500" />
              <span className="text-amber-700 font-medium">
                新增场次 ({diff.stats.added} 个)：请确认编号符合插入式命名规则
              </span>
              <span className="text-amber-600">
                格式：S{'<数字>'}[大写字母]，如 S001A (S001之后)、S001AA (S001之前)
              </span>
            </div>
          </div>
        )}

        {/* Changes List */}
        <div ref={contentRef} className="flex-1 overflow-auto bg-slate-100">
          {computing ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mb-4" />
              <p className="text-sm">正在计算版本差异...</p>
              <p className="text-xs mt-2 text-slate-300">请稍候</p>
            </div>
          ) : filteredScenes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <span className="text-4xl mb-3">📄</span>
              <p className="text-sm">当前筛选条件下无差异</p>
            </div>
          ) : (
            <div className="py-4 space-y-2">
              {filteredScenes.map(({ scene, originalIdx }) => {
                const sceneId = scene.sceneId || String(scene.sceneNum);
                const uniqueSceneId = `${sceneId}-${originalIdx}`;
                const isExpanded = expandedScenes.has(uniqueSceneId);
                
                // Use pre-computed change counts
                const addedCount = scene.addedLines || 0;
                const removedCount = scene.removedLines || 0;
                const modifiedCount = scene.modifiedLines || 0;
                const totalChanges = addedCount + removedCount + modifiedCount;

                return (
                  <div
                    key={uniqueSceneId}
                    className="mx-4 bg-white rounded-lg shadow-sm overflow-hidden border border-slate-200"
                  >
                    {/* Scene Header */}
                    <button
                      onClick={() => toggleScene(uniqueSceneId)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown size={16} className="text-slate-500 shrink-0" />
                      ) : (
                        <ChevronRight size={16} className="text-slate-500 shrink-0" />
                      )}

                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-white ${getTypeColor(scene.type)}`}>
                        {getTypeLabel(scene.type)}
                      </span>

                      <span className="text-xs font-mono text-slate-400">
                        {scene.sceneId}
                      </span>

                      <span className="text-sm text-slate-700 font-medium flex-1 text-left truncate">
                        {scene.title}
                      </span>

                      {/* Pre-computed change counts */}
                      {totalChanges > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          {addedCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                              <Plus size={10} />{addedCount}
                            </span>
                          )}
                          {removedCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                              <Minus size={10} />{removedCount}
                            </span>
                          )}
                          {modifiedCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                              ~{modifiedCount}
                            </span>
                          )}
                        </div>
                      )}
                    </button>

                    {/* Diff Content - lines are pre-computed, no lazy loading needed */}
                    {isExpanded && scene.lines && scene.lines.length > 0 && (
                      <div className="border-t border-slate-200">
                        <DiffView 
                          scene={scene} 
                          sceneId={sceneId}
                          marks={marks.get(sceneId) || new Map()}
                          onLineMark={(diffIdx, status) => handleLineMark(sceneId, diffIdx, status)}
                        />
                      </div>
                    )}
                    {isExpanded && (!scene.lines || scene.lines.length === 0) && scene.type === 'unchanged' && (
                      <div className="border-t border-slate-200 px-4 py-4 text-center text-slate-400 text-sm">
                        该场次无内容变更
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>显示 {filteredScenes.length} / {diff?.scenes.length ?? 0} 个场景</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 bg-emerald-500 rounded" /> 新增
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 bg-red-500 rounded" /> 删除
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 bg-amber-500 rounded" /> 修改
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 bg-purple-400 rounded" /> 实质相同（格式差异）
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

// Diff View Component with inline mark support
const DiffView: React.FC<{ 
  scene: SceneDiff; 
  sceneId: string;
  marks: Map<number, MarkStatus>;
  onLineMark: (diffIdx: number, status: MarkStatus) => void;
}> = ({ scene, marks, onLineMark }) => {
  const [visibleCount, setVisibleCount] = useState(100);
  const totalLines = scene.lines.length;
  const hasMore = visibleCount < totalLines;
  
  const visibleLines = useMemo(() => {
    return scene.lines.slice(0, visibleCount);
  }, [scene.lines, visibleCount]);

  const renderLeftLine = (line: DiffLine, idx: number) => {
    if (line.type === 'added') {
      return (
        <div key={`left-${idx}`} className="flex items-stretch border-b border-slate-100">
          <div className="w-10 shrink-0 text-right pr-2 py-1 text-xs text-slate-300 font-mono select-none border-r border-slate-200 bg-slate-50/30">&nbsp;</div>
          <div className="w-1 shrink-0 bg-transparent" />
          <div className="w-6 shrink-0 py-1 text-center text-sm font-mono select-none text-slate-300">+</div>
          <div className="flex-1 py-1 px-2 text-sm font-mono whitespace-pre-wrap text-slate-200">&nbsp;</div>
        </div>
      );
    }

    const content = line.left;
    if (!content) return null;

    const bgClass = lineBgClass(line);
    const indicator = lineIndicatorClass(line, 'left');
    const mk = getMarker(line, 'left');
    const lineNum = line.leftLineNum;
    const textClass = line.type === 'removed' ? 'text-red-700' : 
                      line.type === 'modified' ? 'text-slate-800' : 'text-slate-600';
    // Chinese translation: smaller font, neutral gray, no diff highlighting
    const zhContent = line.leftZh?.trim();

    return (
      <div key={`left-${idx}`} className={`flex items-stretch border-b border-slate-100 ${bgClass}`}>
        <div className="w-10 shrink-0 text-right pr-2 py-1 text-xs text-slate-400 font-mono select-none border-r border-slate-200 bg-slate-50/50">
          {lineNum || ''}
        </div>
        <div className={`w-1 shrink-0 ${indicator}`} />
        <div className="w-6 shrink-0 py-1 text-center text-sm font-mono select-none">
          <span className={markerClass(line)}>{mk}</span>
        </div>
        <div className={`flex-1 py-1 px-2 whitespace-pre-wrap break-words leading-relaxed ${textClass}`}>
          <div className="text-sm font-mono">{content.trim() || '\u00A0'}</div>
          {zhContent && (
            <div className="text-xs font-sans text-slate-500 mt-0.5 leading-snug opacity-80">
              {zhContent}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render right line with inline mark buttons at end
  const renderRightLine = (line: DiffLine, idx: number) => {
    const markStatus = marks.get(idx);
    const showMarkButtons = line.type === 'modified' && !line.isNormalizedMatch;
    const isNormalized = line.isNormalizedMatch;
    
    if (line.type === 'removed') {
      return (
        <div key={`right-${idx}`} className="flex items-stretch border-b border-slate-100">
          <div className="w-10 shrink-0 text-right pr-2 py-1 text-xs text-slate-300 font-mono select-none border-r border-slate-200 bg-slate-50/30">&nbsp;</div>
          <div className="w-1 shrink-0 bg-transparent" />
          <div className="w-6 shrink-0 py-1 text-center text-sm font-mono select-none text-slate-300">−</div>
          <div className="flex-1 py-1 px-2 text-sm font-mono whitespace-pre-wrap text-slate-200">&nbsp;</div>
        </div>
      );
    }

    const content = line.right;
    if (!content) return null;

    const bgClass = lineBgClass(line);
    const indicator = lineIndicatorClass(line, 'right');
    const mk = getMarker(line, 'right');
    const lineNum = line.rightLineNum;
    const textClass = line.type === 'added' ? 'text-emerald-700' : 
                      line.type === 'modified' ? 'text-slate-800' : 'text-slate-600';
    // Chinese translation: smaller font, neutral gray, no diff highlighting
    const zhContent = line.rightZh?.trim();

    return (
      <div key={`right-${idx}`} className={`flex items-stretch border-b border-slate-100 ${bgClass} ${markStatus === 'confirmed' ? 'ring-2 ring-inset ring-emerald-400' : ''} ${markStatus === 'dismissed' ? 'ring-2 ring-inset ring-slate-300 opacity-60' : ''}`}>
        <div className="w-10 shrink-0 text-right pr-2 py-1 text-xs text-slate-400 font-mono select-none border-r border-slate-200 bg-slate-50/50">
          {lineNum || ''}
        </div>
        <div className={`w-1 shrink-0 ${indicator}`} />
        <div className="w-6 shrink-0 py-1 text-center text-sm font-mono select-none">
          <span className={markerClass(line)}>{mk}</span>
        </div>
        <div className={`flex-1 py-1 px-2 whitespace-pre-wrap break-words leading-relaxed ${textClass}`}>
          <div className="text-sm font-mono">
            {content.trim() || '\u00A0'}
            {isNormalized && (
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] rounded font-sans">
                ≈ 格式差异
              </span>
            )}
          </div>
          {zhContent && (
            <div className="text-xs font-sans text-slate-500 mt-0.5 leading-snug opacity-80">
              {zhContent}
            </div>
          )}
        </div>
        {showMarkButtons && (
          <div className="shrink-0 pr-2 py-1 flex items-center gap-1">
            <button
              onClick={() => onLineMark(idx, 'confirmed')}
              title="确认为实质改动"
              className={`p-1 rounded transition-colors ${
                markStatus === 'confirmed' 
                  ? 'bg-emerald-500 text-white' 
                  : 'text-emerald-600 hover:bg-emerald-50'
              }`}
            >
              <Check size={12} />
            </button>
            <button
              onClick={() => onLineMark(idx, 'dismissed')}
              title="标记为非实质改动"
              className={`p-1 rounded transition-colors ${
                markStatus === 'dismissed' 
                  ? 'bg-slate-500 text-white' 
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <MinusCircle size={12} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      {/* Mark Instructions */}
      <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center gap-2">
        <span className="text-xs text-slate-500">
          已自动识别 <span className="text-purple-600 font-medium">格式差异</span>，请手动确认实质改动：
        </span>
      </div>
      
      <div className="grid grid-cols-2 min-h-[200px]">
        {/* Left Panel - V3 */}
        <div className="border-r border-slate-300">
          <div className="px-3 py-2 bg-slate-200 text-xs font-semibold text-slate-700 border-b border-slate-300 flex items-center gap-2">
            <Minus size={12} className="text-red-500" />
            <span>V3 - 原版本</span>
          </div>
          <div>
            {visibleLines.map((line, idx) => renderLeftLine(line, idx))}
          </div>
        </div>

        {/* Right Panel - V4 */}
        <div>
          <div className="px-3 py-2 bg-slate-200 text-xs font-semibold text-slate-700 border-b border-slate-300 flex items-center gap-2">
            <Plus size={12} className="text-emerald-500" />
            <span>V4 - 新版本</span>
          </div>
          <div>
            {visibleLines.map((line, idx) => renderRightLine(line, idx))}
          </div>
        </div>
      </div>
      
      {/* Load More Button */}
      {hasMore && (
        <div className="py-3 px-4 bg-slate-50 border-t border-slate-200 text-center">
          <button
            onClick={() => setVisibleCount(prev => prev + 100)}
            className="text-xs text-sky-600 hover:text-sky-700 font-medium"
          >
            加载更多 ({visibleCount} / {totalLines} 行)
          </button>
        </div>
      )}
    </div>
  );
};
