import React, { useMemo } from 'react';
import type { Line, Token } from '@/types';
import { TOKEN_TYPE_CONFIGS } from '@/types';
import { useScriptStore } from '@/stores/scriptStore';

interface ScriptLineProps {
  line: Line;
  lineIndex: number;
}

function renderTextWithTokens(
  text: string,
  tokens: Token[],
  showTokens: boolean,
  selectedEntities: string[]
): React.ReactNode[] {
  if (!tokens.length || !showTokens) {
    return [text];
  }

  const sorted = [...tokens].sort((a, b) => a.startOffset - b.startOffset);
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  sorted.forEach((token, idx) => {
    if (token.startOffset > lastIndex) {
      parts.push(text.slice(lastIndex, token.startOffset));
    }

    const isSelected = selectedEntities.includes(token.canonicalName);
    const config = TOKEN_TYPE_CONFIGS[token.type];
    const originalText = text.slice(token.startOffset, token.endOffset);

    parts.push(
      <span
        key={`token-${token.id}-${idx}`}
        className={`
          inline rounded px-0.5 cursor-pointer transition-colors duration-100
          ${isSelected ? 'ring-2 ring-offset-1' : ''}
        `}
        style={{
          backgroundColor: config.bgColor,
          color: config.textColor,
          boxShadow: isSelected ? `0 0 0 2px ${config.textColor}` : 'none',
        }}
        title={`${config.label}：${token.canonicalName}`}
        onClick={(e) => {
          e.stopPropagation();
          if (e.ctrlKey || e.metaKey) {
            useScriptStore.getState().toggleEntity(token.canonicalName);
          } else {
            useScriptStore.getState().selectEntity(token.canonicalName);
          }
        }}
      >
        {originalText}
      </span>
    );

    lastIndex = token.endOffset;
  });

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export const ScriptLine: React.FC<ScriptLineProps> = ({ line, lineIndex }) => {
  const activeFilters = useScriptStore((s) => s.activeFilters);
  const selectedEntities = useScriptStore((s) => s.selectedEntities);

  const visibleTokens = useMemo(
    () => line.tokens.filter((t) => activeFilters[t.type]),
    [line.tokens, activeFilters]
  );

  const hasTokens = visibleTokens.length > 0;
  const showTokens = Object.values(activeFilters).some(Boolean);

  if (line.type === 'scene_header') {
    return (
      <div className="flex items-center gap-3 py-3 px-4 bg-slate-50 border-y border-slate-200 my-2">
        <div className="w-1 h-8 bg-slate-800 rounded-full shrink-0" />
        <h3 className="font-bold text-base text-slate-900 flex-1">
          {line.rawText.trim()}
        </h3>
      </div>
    );
  }

  if (line.type === 'metadata') {
    const isSceneMapping = line.rawText.startsWith('场景资产映射') || line.rawText.startsWith('关联资产');
    if (isSceneMapping) {
      return (
        <div className="mx-4 my-1 px-3 py-2 bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-md">
          <div className="text-[11px] text-slate-400 uppercase mb-1 font-medium">场景资产映射</div>
          <div className="flex flex-wrap gap-1">
            {visibleTokens.map((token, idx) => {
              const config = TOKEN_TYPE_CONFIGS[token.type];
              const isSelected = selectedEntities.includes(token.canonicalName);
              return (
                <span
                  key={`scene-token-${token.id}-${idx}`}
                  className={`
                    inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium
                    border cursor-pointer transition-all hover:scale-105
                    ${isSelected ? 'ring-2 ring-offset-1' : ''}
                  `}
                  style={{
                    backgroundColor: config.bgColor,
                    borderColor: config.borderColor,
                    color: config.textColor,
                    boxShadow: isSelected ? `0 0 0 2px ${config.textColor}` : 'none',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (e.ctrlKey || e.metaKey) {
                      useScriptStore.getState().toggleEntity(token.canonicalName);
                    } else {
                      useScriptStore.getState().selectEntity(token.canonicalName);
                    }
                  }}
                  title={`${config.label}：${token.canonicalName}`}
                >
                  <span>{config.icon}</span>
                  <span>{token.canonicalName}</span>
                </span>
              );
            })}
          </div>
        </div>
      );
    }
    return (
      <div className="mx-4 my-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-500 flex items-center gap-2">
        {line.rawText.trim().startsWith('字幕') ? (
          <span className="italic">{line.rawText.trim()}</span>
        ) : (
          renderTextWithTokens(line.rawText, visibleTokens, showTokens, selectedEntities)
        )}
      </div>
    );
  }

  if (line.type === 'transition') {
    return <div className="h-4" />;
  }

  const baseClasses =
    line.type === 'dialogue'
      ? 'text-slate-700 pl-12 py-1'
      : 'text-slate-800 pl-4 py-0.5';

  return (
    <div
      className={`
        group relative transition-colors duration-100
        hover:bg-sky-50/30
        ${baseClasses}
      `}
      data-line-number={line.lineNumber}
    >
      <span className="text-[10px] text-slate-300 absolute left-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {line.lineNumber}
      </span>
      {renderTextWithTokens(line.rawText, visibleTokens, showTokens, selectedEntities)}
      {hasTokens && showTokens && (
        <span className="ml-2 text-[10px] text-slate-300 opacity-0 group-hover:opacity-60 transition-opacity">
          ×{visibleTokens.length}
        </span>
      )}
    </div>
  );
};

export default ScriptLine;