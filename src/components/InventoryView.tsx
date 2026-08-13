import React, { useMemo } from 'react';
import type { Script, TokenType } from '@/types';
import { TOKEN_TYPE_CONFIGS } from '@/types';
import { useScriptStore } from '@/stores/scriptStore';
import { getAllUniqueEntities } from '@/utils/tokenEngine';
import { Search } from 'lucide-react';

interface InventoryViewProps {
  script: Script;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ script }) => {
  const selectEntity = useScriptStore((s) => s.selectEntity);
  const activeFilters = useScriptStore((s) => s.activeFilters);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'count' | 'name'>('count');

  const entities = useMemo(() => {
    const map = getAllUniqueEntities(script);
    const list = Array.from(map.entries()).map(([name, info]) => ({
      name,
      type: info.type,
      count: info.count,
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

  const grouped = useMemo(() => {
    const groups: Record<TokenType, typeof entities> = {
      character: [],
      prop: [],
      vfx: [],
      audio: [],
      costume: [],
      scene: [],
      lighting: [],
    };
    entities.forEach((e) => groups[e.type].push(e));
    return groups;
  }, [entities]);

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-1">资产清单</h2>
          <p className="text-sm text-slate-500">
            共 {entities.length} 类资产，总计 {entities.reduce((s, e) => s + e.count, 0)} 次出现
          </p>
        </div>

        <div className="flex items-center gap-3 mb-4">
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
                  {items.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => selectEntity(item.name)}
                      className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
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
                          <div className="text-sm font-medium text-slate-800">{item.name}</div>
                          <div className="text-xs text-slate-400">
                            出现在 {new Set(
                              script.scenes
                                .flatMap((s) => s.lines)
                                .flatMap((l) => l.tokens)
                                .filter((t) => t.canonicalName === item.name)
                                .map((t) => t.lineId)
                            ).size} 行
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold" style={{ color: config.textColor }}>
                          {item.count}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase">次</div>
                      </div>
                    </button>
                  ))}
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