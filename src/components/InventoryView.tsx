import React, { useMemo } from 'react';
import type { Script, TokenType } from '@/types';
import { TOKEN_TYPE_CONFIGS } from '@/types';
import { useScriptStore } from '@/stores/scriptStore';
import { getAllUniqueEntities, getAllConfiguredEntities } from '@/utils/tokenEngine';
import { Search, CheckCircle, XCircle, Filter } from 'lucide-react';

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

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-1">资产清单</h2>
          <p className="text-sm text-slate-500">
            共 {allConfigured.length} 类资产 · 
            <span className="text-green-600 font-semibold">文本匹配 {matchedCount}</span> · 
            <span className="text-amber-600 font-semibold">场景关联 {sceneMappedOnlyCount}</span> · 
            <span className="text-red-600 font-semibold">未匹配 {unmatchedCount}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索资产..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'count' | 'name')}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
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

        <div className="space-y-6">
          {(Object.keys(TOKEN_TYPE_CONFIGS) as TokenType[]).map((type) => {
            const config = TOKEN_TYPE_CONFIGS[type];
            const items = grouped[type];
            if (items.length === 0) return null;

            return (
              <div key={type} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div
                  className="flex items-center gap-2 px-4 py-3"
                  style={{ backgroundColor: config.bgColor }}
                >
                  <span className="text-lg">{config.icon}</span>
                  <span className="font-bold text-sm" style={{ color: config.textColor }}>
                    {config.label}
                  </span>
                  <span
                    className="ml-auto text-xs font-mono px-2 py-0.5 rounded"
                    style={{ backgroundColor: 'rgba(255,255,255,0.6)', color: config.textColor }}
                  >
                    {items.length} 类
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const count = matchedByName.get(item.canonicalName) || 0;
                    const canClick = item.matchedInText;
                    return (
                      <button
                        key={item.canonicalName}
                        onClick={() => canClick && selectEntity(item.canonicalName)}
                        disabled={!canClick}
                        className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                          canClick
                            ? 'hover:bg-slate-50 cursor-pointer'
                            : 'opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                            style={{
                              backgroundColor: config.bgColor,
                              color: config.textColor,
                            }}
                          >
                            {config.icon}
                          </span>
                          <div>
                            <div className="text-sm font-medium text-slate-800 flex items-center gap-2">
                              {item.canonicalName}
                              {item.matchedInText ? (
                                <CheckCircle size={14} className="text-green-500" />
                              ) : item.matched ? (
                                <CheckCircle size={14} className="text-amber-500" />
                              ) : (
                                <XCircle size={14} className="text-red-500" />
                              )}
                            </div>
                            <div className="text-xs text-slate-400">
                              {item.matchedInText
                                ? `文本匹配 · 出现在 ${new Set(
                                    script.scenes
                                      .flatMap((s) => s.lines)
                                      .flatMap((l) => l.tokens)
                                      .filter((t) => t.canonicalName === item.canonicalName && t.source !== 'scene_mapping')
                                      .map((t) => t.lineId)
                                  ).size} 行`
                                : item.matched
                                ? '场景关联 · 未在文本中匹配'
                                : '未匹配 · 需检查剧本或映射'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {item.matchedInText ? (
                            <>
                              <div className="text-lg font-bold" style={{ color: config.textColor }}>
                                {count}
                              </div>
                              <div className="text-[10px] text-slate-400 uppercase">次</div>
                            </>
                          ) : item.matched ? (
                            <span className="text-xs text-amber-600 font-medium">场景关联</span>
                          ) : (
                            <span className="text-xs text-red-600 font-medium">未匹配</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default InventoryView;
