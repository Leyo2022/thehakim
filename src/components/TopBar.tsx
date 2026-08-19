import React from 'react';
import { TOKEN_TYPE_CONFIGS } from '@/types';
import type { TokenType } from '@/types';
import { Filter, Eye, EyeOff, LayoutGrid, List, Download, X } from 'lucide-react';
import { useScriptStore } from '@/stores/scriptStore';
import { getAllUniqueEntities, getTokenCounts } from '@/utils/tokenEngine';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

interface TopBarProps {
  viewMode: 'review' | 'inventory' | 'mindmap' | 'synopsis';
  onViewChange: (mode: 'review' | 'inventory' | 'mindmap' | 'synopsis') => void;
}

export const TopBar: React.FC<TopBarProps> = ({ viewMode, onViewChange }) => {
  const script = useScriptStore((s) => s.script);
  const activeFilters = useScriptStore((s) => s.activeFilters);
  const setFilter = useScriptStore((s) => s.setFilter);
  const setAllFilters = useScriptStore((s) => s.setAllFilters);
  const clearSelection = useScriptStore((s) => s.clearSelection);

  if (!script) return null;

  const entityMap = getAllUniqueEntities(script);
  const counts = getTokenCounts(script);

  const handleExportExcel = () => {
    const exportData: Record<string, unknown>[] = [];

    entityMap.forEach((info, name) => {
      const typeConfig = TOKEN_TYPE_CONFIGS[info.type];
      exportData.push({
        '资产名称': name,
        '类型': typeConfig.label,
        '图标': typeConfig.icon,
        '出现次数': info.count,
        '出现场次': script.scenes
          .filter((s) =>
            s.lines.some((l) => l.tokens.some((t) => t.canonicalName === name))
          )
          .map((s) => s.sceneNumber)
          .join(', '),
      });
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '资产匹配管理');
    XLSX.writeFile(wb, `${script.title}_资产匹配管理.xlsx`);
  };

  const handleExportPDF = () => {
    const pdf = new jsPDF();
    let yPos = 20;
    pdf.setFontSize(16);
    pdf.text(script.title, 14, yPos);
    yPos += 10;
    pdf.setFontSize(10);

    script.scenes.forEach((scene) => {
      yPos += 5;
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${scene.sceneNumber} ${scene.header}`, 14, yPos);
      yPos += 8;
      pdf.setFont('helvetica', 'normal');

      scene.lines.forEach((line) => {
        if (line.type === 'transition') {
          yPos += 4;
          return;
        }
        const text = line.rawText.trim();
        const lines = pdf.splitTextToSize(text, 180);
        if (yPos + lines.length * 5 > 270) {
          pdf.addPage();
          yPos = 20;
        }
        pdf.text(lines, 14, yPos);
        yPos += lines.length * 5;
      });
    });

    pdf.save(`${script.title}_剧本.pdf`);
  };

  const exportMenuOpen = React.useState(false);
  const [showExportMenu, setShowExportMenu] = exportMenuOpen;

  return (
    <div className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-4 shrink-0 shadow-sm sticky top-0 z-20">
      <div className="flex items-center gap-1">
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
        <button
          onClick={() => onViewChange('synopsis')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
            viewMode === 'synopsis'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="text-sm">📖</span>
          剧本概述
        </button>
      </div>

      <div className="h-6 w-px bg-slate-200" />

      <div className="flex items-center gap-2 flex-wrap">
        {(Object.keys(TOKEN_TYPE_CONFIGS) as TokenType[]).map((type) => {
          const config = TOKEN_TYPE_CONFIGS[type];
          const active = activeFilters[type];
          const count = counts[type];

          if (count === 0 && !active) return null;

          return (
            <button
              key={type}
              onClick={() => setFilter(type, !active)}
              className={`
                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium
                transition-all duration-150 border
                ${active ? '' : 'opacity-50'}
              `}
              style={{
                backgroundColor: active ? config.bgColor : '#F9FAFB',
                borderColor: active ? config.borderColor : '#E5E7EB',
                color: active ? config.textColor : '#9CA3AF',
              }}
              title={active ? `隐藏${config.label}` : `显示${config.label}`}
            >
              <span className="text-sm">{config.icon}</span>
              <span>{config.label}</span>
              <span className="ml-1 text-[10px] bg-white/60 rounded px-1 py-0.5 font-mono">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <button
          onClick={() => setAllFilters(!Object.values(activeFilters).every(Boolean))}
          className="p-2 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
          title={Object.values(activeFilters).every(Boolean) ? '全部隐藏' : '全部显示'}
        >
          {Object.values(activeFilters).every(Boolean) ? (
            <EyeOff size={16} />
          ) : (
            <Eye size={16} />
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="p-2 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
            title="导出"
          >
            <Download size={16} />
          </button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30 min-w-[140px]">
              <button
                onClick={() => {
                  handleExportExcel();
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
              >
                导出资产匹配管理 Excel
              </button>
              <button
                onClick={() => {
                  handleExportPDF();
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
              >
                导出标注版 PDF
              </button>
            </div>
          )}
        </div>

        {useScriptStore.getState().selectedEntities.length > 0 && (
          <button
            onClick={clearSelection}
            className="p-2 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
            title="清除选择"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default TopBar;