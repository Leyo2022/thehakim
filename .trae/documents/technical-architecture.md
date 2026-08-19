## 1. 架构设计

```mermaid
graph TD
    subgraph 前端应用 (React)
        A[组件层] --> B[业务逻辑层]
        B --> C[状态管理层]
        C --> D[数据模型层]
    end
    
    subgraph 组件层
        A1[TopBar 顶栏]
        A2[ScriptStream 剧本流]
        A3[TokenChip 徽章]
        A4[AssetDrawer 详情抽屉]
        A5[RightClickMenu 右键菜单]
    end
    
    subgraph 业务逻辑层
        B1[TokenEngine 标注引擎]
        B2[EntityResolution 实体归一化]
        B3[ExportService 导出服务]
    end
    
    subgraph 状态管理层
        C1[ScriptStore 剧本状态]
        C2[FilterStore 过滤器状态]
        C3[SelectionStore 选中状态]
    end
    
    subgraph 数据模型层
        D1[Token 资产]
        D2[Entity 实体]
        D3[Line 文本行]
    end
    
    A1 & A2 & A3 & A4 & A5 --> B1
    B1 --> B2
    B1 --> B3
    B1 --> C1
    C1 --> C2
    C1 --> C3
    B2 --> D1
    B2 --> D2
    B1 --> D3
```

## 2. 技术说明

* **前端框架**: React\@18 + TypeScript

* **构建工具**: Vite

* **样式**: Tailwind CSS\@3

* **状态管理**: Zustand

* **图标**: Lucide React

* **导出**: xlsx (Excel), jspdf (PDF)

* **UI 组件**: 自定义组件 (基于 Tailwind)

## 3. 路由定义

| 路由           | 用途                   |
| ------------ | -------------------- |
| `/`          | 剧本审阅主页 (Review Mode) |
| `/inventory` | 资产清单视图               |
| `/mindmap`   | 分镜大纲视图               |

## 4. API 定义

本项目为纯前端应用，使用 Mock 数据。

### 4.1 数据接口

```typescript
// Token 接口
interface Token {
  id: string;
  type: 'character' | 'prop' | 'vfx' | 'audio' | 'costume';
  canonicalName: string;
  matchedText: string;
  aliases: string[];
  source: 'ai' | 'manual' | 'ai_confirmed';
  startOffset: number;
  endOffset: number;
  lineId: string;
  sceneId: string;
}

// Entity 接口
interface Entity {
  id: string;
  canonicalName: string;
  type: Token['type'];
  aliases: string[];
}

// Line 接口
interface Line {
  id: string;
  lineNumber: number;
  type: 'scene_header' | 'metadata' | 'dialogue' | 'action' | 'transition';
  rawText: string;
  tokens: Token[];
  sceneId: string;
}

// Scene 接口
interface Scene {
  id: string;
  sceneNumber: string;
  header: string;
  lines: Line[];
}

// Script 接口
interface Script {
  id: string;
  title: string;
  scenes: Scene[];
}
```

## 5. 数据模型

### 5.1 存储结构

所有数据存储在前端 Zustand 状态中，支持持久化到 localStorage。

```
localStorage structure:
├── script_data: Script
├── filter_settings: { [key: Token['type']]: boolean }
├── selection_state: { selectedIds: string[] }
└── entity_aliases: Entity[]
```

## 6. 关键服务

### 6.1 TokenEngine 标注引擎

负责将原始剧本进行 Token 化处理：

```
TokenEngine.processScript(rawText: string): Script
├── parseScriptStructure(text: string): Scene[]
├── extractTokens(lines: Line[]): Token[]
├── entityResolution(tokens: Token[]): Token[]
└── return final script
```

### 6.2 ExportService 导出服务

支持多种导出格式：

```
ExportService.exportPDF(script: Script): void
ExportService.exportExcel(script: Script): void
ExportService.exportCSV(script: Script): void
```

