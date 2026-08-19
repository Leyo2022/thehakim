import React from 'react';
import { List, LayoutGrid, BookOpen } from 'lucide-react';

interface TopBarProps {
  viewMode: 'review' | 'inventory' | 'mindmap' | 'synopsis' | 'reader';
  onViewChange: (mode: 'review' | 'inventory' | 'mindmap' | 'synopsis' | 'reader') => void;
}

export const TopBar: React.FC<TopBarProps> = ({ viewMode, onViewChange }) => {
  return (
    <div className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-4 shrink-0 shadow-sm sticky top-0 z-20">
      <div className="flex items-center gap-1">
        <button
          onClick={() => onViewChange('reader')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
            viewMode === 'reader'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen size={14} />
          剧本阅读
        </button>
        <button
          onClick={() => onViewChange('review')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'review'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          剧本审阅
        </button>
        <button
          onClick={() => onViewChange('inventory')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
            viewMode === 'inventory'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <List size={14} />
          资产匹配管理
        </button>
        <button
          onClick={() => onViewChange('mindmap')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
            viewMode === 'mindmap'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <LayoutGrid size={14} />
          场次资产详情
        </button>
      </div>
    </div>
  );
};

export default TopBar;