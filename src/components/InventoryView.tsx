import React, { useMemo } from 'react';
import type { Script, TokenType } from '@/types';
import { TOKEN_TYPE_CONFIGS } from '@/types';
import { useScriptStore } from '@/stores/scriptStore';
import { getAllUniqueEntities, getAllConfiguredEntities, getTokenLocations } from '@/utils/tokenEngine';
import { Search, CheckCircle, XCircle, Filter, ChevronDown, ChevronUp } from 'lucide-react';

type MatchFilter = 'all' | 'matched' | 'unmatched';

interface InventoryViewProps {
  script: Script;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ script }) => {
  const selectEntity = useScriptStore((s) => s.selectEntity);
  const activeFilters = useScriptStore((s) => s.activeFilters);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'count' | 'name'>('count');
  const [matchFilter, setMatchFilter] = React.useState<MatchFilter>('all');
  const [expandedTypes, setExpandedTypes] = React.useState<Set<TokenType>>(new Set());

  const matchedEntities = useMemo(() => {
    const map = getAllUniqueEntities(script);
    const list = Array.from(map.entries()).map(([name, info]) => ({
      name,
      type: info.type,
      count: info.count,
      matched: true,
    }));

    return list
      .filter((e) => activeFilters[e.type])
      .filter((e) =>
        searchQuery ? e.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
      )
      .sort((a, b) => {
        if (sortBy === 'count') return b.count - a.count;
        return a.name.localeCompare(b.name);
      });
  }, [script, activeFilters, searchQuery, sortBy]);

  const allConfigured = useMemo(() => {
    const configured = getAllConfiguredEntities(script);
    return configured
      .filter((e) => activeFilters[e.type])
      .filter((e) =>
        searchQuery ? e.canonicalName.toLowerCase().includes(searchQuery.toLowerCase()) : true
      )
      .filter((e) => {
        if (matchFilter === 'all') return true;
        if (matchFilter === 'matched') return e.matchedInText;
        return !e.matchedInText;
      })
      .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
  }, [script, activeFilters, searchQuery, matchFilter]);

  const unmatchedCount = allConfigured.filter((e) => !e.matchedInText).length;
  const matchedCount = allConfigured.filter((e) => e.matchedInText).length;
  const sceneMappedOnlyCount = allConfigured.filter((e) => e.matched && !e.matchedInText).length;

  const matchedByName = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of matchedEntities) {
      map.set(e.name, e.count);
    }
    return map;
  }, [matchedEntities]);

  const grouped = useMemo(() => {
    const groups: Record<TokenType, typeof allConfigured> = {
      character: [],
      prop: [],
      vfx: [],
      audio: [],
      costume: [],
      scene: [],
      lighting: [],
    };
    allConfigured.forEach((e) => groups[e.type].push(e));
    return groups;
  }, [allConfigured]);

  const toggleType = (type: TokenType) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const getSceneCount = (canonicalName: string) => {
    const scenes = new Set<string>();
    for (const scene of script.scenes) {
      for (const line of scene.lines) {
        for (const token of line.tokens) {
          if (token.canonicalName === canonicalName && token.source !== 'scene_mapping') {
            scenes.add(scene.sceneNumber);
          }
        }
      }
    }
    return scenes.size;
  };

  const getLineCount = (canonicalName: string) => {
    let count = 0;
    for (const scene of script.scenes) {
      for (const line of scene.lines) {
        for (const token of line.tokens) {
          if (token.canonicalName === canonicalName && token.source !== 'scene_mapping') {
            count++;
          }
        }
      }
    }
    return count;
  };

  const getMatchStatusText = (item: { matchedInText: boolean; matched: boolean }) => {
    if (item.matchedInText) return '文本匹配';
    if (item.matched) return '场景关联';
    return '未匹配';
  };

  const getMatchStatusColor = (item: { matchedInText: boolean; matched: boolean }) => {
    if (item.matchedInText) return 'text-green-600';
    if (item.matched) return 'text-amber-600';
    return 'text-red-600';
  };

  const getMatchStatusBg = (item: { matchedInText: boolean; matched: boolean }) => {
    if (item.matchedInText) return 'bg-green-50 border-green-200';
    if (item.matched) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">资产匹配管理</h2>
            <p className="text-xs text-slate-500">
              共 {allConfigured.length} 类资产 · 
              <span className="text-green-600 font-semibold">文本匹配 {matchedCount}</span> · 
              <span className="text-amber-600 font-semibold">场景关联 {sceneMappedOnlyCount}</span> · 
              <span className="text-red-600 font-semibold">未匹配 {unmatchedCount}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="搜索资产..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'count' | 'name')}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="count">按频次排序</option>
              <option value="name">按名称排序</option>
            </select>
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
              <Filter size={14} className="ml-1 text-slate-400" />
              {(['all', 'matched', 'unmatched'] as MatchFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setMatchFilter(f)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    matchFilter === f
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {f === 'all' ? '全部' : f === 'matched' ? '已匹配' : '未匹配'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {(Object.keys(TOKEN_TYPE_CONFIGS) as TokenType[]).map((type) => {
            const config = TOKEN_TYPE_CONFIGS[type];
            const items = grouped[type];
            if (items.length === 0) return null;
            const isExpanded = expandedTypes.has(type);

            return (
              <div key={type} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <button
                  onClick={() => toggleType(type)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 transition-colors"
                  style={{ borderLeft: `3px solid ${config.borderColor}` }}
                >
                  <span className="text-base">{config.icon}</span>
                  <span className="font-bold text-sm text-slate-700">{config.label}</span>
                  <span className="text-xs text-slate-400">({items.length})</span>
                  <span className="ml-auto">
                    {isExpanded ? (
                      <ChevronDown size={16} className="text-slate-400" />
                    ) : (
                      <ChevronUp size={16} className="text-slate-400" />
                    )}
                  </span>
                </button>

                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500">
                          <th className="text-left px-3 py-2 font-medium w-40">资产名称</th>
                          <th className="text-left px-3 py-2 font-medium w-20">匹配状态</th>
                          <th className="text-right px-3 py-2 font-medium w-16">行次数</th>
                          <th className="text-right px-3 py-2 font-medium w-16">场次数</th>
                          <th className="text-left px-3 py-2 font-medium">匹配说明</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => {
                          const count = getLineCount(item.canonicalName);
                          const sceneCount = getSceneCount(item.canonicalName);
                          const canClick = item.matchedInText;
                          return (
                            <tr
                              key={item.id}
                              onClick={() => canClick && selectEntity(item.canonicalName)}
                              className={`border-t border-slate-100 transition-colors ${
                                canClick
                                  ? 'hover:bg-sky-50 cursor-pointer'
                                  : 'cursor-default'
                              }`}
                            >
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-5 h-5 rounded flex items-center justify-center text-[10px] shrink-0"
                                    style={{ backgroundColor: config.bgColor, color: config.textColor }}
                                  >
                                    {config.icon}
                                  </span>
                                  <span className="font-medium text-slate-700 truncate">
                                    {item.canonicalName}
                                  </span>
                                  {item.matchedInText ? (
                                    <CheckCircle size={12} className="text-green-500 shrink-0" />
                                  ) : item.matched ? (
                                    <CheckCircle size={12} className="text-amber-500 shrink-0" />
                                  ) : (
                                    <XCircle size={12} className="text-red-500 shrink-0" />
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-medium ${getMatchStatusBg(item)} ${getMatchStatusColor(item)}`}>
                                  {getMatchStatusText(item)}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-slate-600">
                                {item.matchedInText ? count : '—'}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-slate-600">
                                {item.matchedInText ? sceneCount : '—'}
                              </td>
                              <td className="px-3 py-2 text-slate-500">
                                {item.matchedInText
                                  ? `文本中出现 ${count} 次，分布于 ${sceneCount} 个场次`
                                  : item.matched
                                  ? `已配置场景关联，但未在文本中找到匹配`
                                  : `未在文本和场景映射中找到，需检查剧本或映射配置`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default InventoryView;