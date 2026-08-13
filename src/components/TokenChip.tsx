import React from 'react';
import { TOKEN_TYPE_CONFIGS } from '@/types';
import type { Token } from '@/types';
import { useScriptStore } from '@/stores/scriptStore';

interface TokenChipProps {
  token: Token;
  isSelected?: boolean;
  dimmed?: boolean;
  size?: 'sm' | 'md';
  showName?: boolean;
}

export const TokenChip: React.FC<TokenChipProps> = ({
  token,
  isSelected = false,
  dimmed = false,
  size = 'md',
  showName = true,
}) => {
  const config = TOKEN_TYPE_CONFIGS[token.type];
  const selectEntity = useScriptStore((s) => s.selectEntity);
  const selectedEntities = useScriptStore((s) => s.selectedEntities);

  const isInSelection = selectedEntities.includes(token.canonicalName);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      useScriptStore.getState().toggleEntity(token.canonicalName);
    } else {
      selectEntity(token.canonicalName);
    }
  };

  const displayName = showName
    ? token.canonicalName.length > 12
      ? token.canonicalName.slice(0, 12) + '...'
      : token.canonicalName
    : '';

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent('token-context-menu', {
        detail: { token, x: e.clientX, y: e.clientY },
      })
    );
  };

  const padding = size === 'sm' ? 'px-1 py-0.5' : 'px-1.5 py-0.5';
  const fontSize = size === 'sm' ? 'text-[11px]' : 'text-[12px]';
  const height = size === 'sm' ? 'h-[20px]' : 'h-[23px]';

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      title={`${config.label}：${token.canonicalName}（${token.matchedText}）`}
      className={`
        inline-flex items-center gap-1
        ${height} ${padding} ${fontSize}
        rounded-md font-medium
        cursor-pointer transition-all duration-150
        border
        hover:scale-105 hover:shadow-sm
        focus:outline-none focus:ring-2 focus:ring-offset-1
        ${isInSelection ? 'ring-2 ring-offset-1' : ''}
      `}
      style={{
        backgroundColor: dimmed ? '#F3F4F6' : config.bgColor,
        borderColor: dimmed ? '#D1D5DB' : config.borderColor,
        color: dimmed ? '#9CA3AF' : config.textColor,
        opacity: dimmed ? 0.4 : 1,
        boxShadow: isInSelection
          ? `0 0 0 2px ${config.textColor}`
          : 'none',
      }}
      aria-label={`${config.label}：${token.canonicalName}，点击查看详情`}
    >
      <span className="leading-none select-none">{config.icon}</span>
      {showName && <span>{displayName}</span>}
    </span>
  );
};

export default TokenChip;