import { create } from 'zustand';
import type { Script, TokenType } from '@/types';
import { tokenizeScript } from '@/utils/tokenEngine';

interface ScriptStore {
  script: Script | null;
  activeFilters: Record<TokenType, boolean>;
  selectedEntity: string | null;
  selectedEntities: string[];
  hoveredToken: string | null;
  showDrawer: boolean;
  drawerTab: 'details' | 'locations';

  initScript: () => void;
  setFilter: (type: TokenType, active: boolean) => void;
  setAllFilters: (active: boolean) => void;
  toggleEntity: (name: string) => void;
  selectEntity: (name: string) => void;
  clearSelection: () => void;
  setHoveredToken: (id: string | null) => void;
  setShowDrawer: (show: boolean) => void;
  setDrawerTab: (tab: 'details' | 'locations') => void;
}

export const useScriptStore = create<ScriptStore>((set) => ({
  script: null,
  activeFilters: {
    character: true,
    prop: true,
    vfx: true,
    audio: true,
    costume: true,
    scene: true,
    lighting: true,
  },
  selectedEntity: null,
  selectedEntities: [],
  hoveredToken: null,
  showDrawer: false,
  drawerTab: 'details',

  initScript: () => {
    const script = tokenizeScript();
    set({ script });
  },

  setFilter: (type, active) =>
    set((state) => ({
      activeFilters: { ...state.activeFilters, [type]: active },
    })),

  setAllFilters: (active) =>
    set(() => ({
      activeFilters: {
        character: active,
        prop: active,
        vfx: active,
        audio: active,
        costume: active,
        scene: active,
        lighting: active,
      },
    })),

  toggleEntity: (name) =>
    set((state) => {
      const isInList = state.selectedEntities.includes(name);
      let newSelection: string[];

      if (isInList) {
        newSelection = state.selectedEntities.filter((n) => n !== name);
      } else {
        newSelection = [...state.selectedEntities, name];
      }

      return {
        selectedEntities: newSelection,
        selectedEntity: newSelection.length === 1 ? newSelection[0] : null,
        showDrawer: newSelection.length > 0,
      };
    }),

  selectEntity: (name) =>
    set({
      selectedEntity: name,
      selectedEntities: [name],
      showDrawer: true,
      drawerTab: 'details',
    }),

  clearSelection: () =>
    set({
      selectedEntity: null,
      selectedEntities: [],
      showDrawer: false,
    }),

  setHoveredToken: (id) => set({ hoveredToken: id }),
  setShowDrawer: (show) => set({ showDrawer: show }),
  setDrawerTab: (tab) => set({ drawerTab: tab }),
}));