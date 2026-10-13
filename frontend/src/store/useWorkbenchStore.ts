import { create } from 'zustand';

export type WorkbenchStep = 1 | 2 | 3;
export type CenterTab = 'analysis' | 'compare';

interface WorkbenchState {
  step: WorkbenchStep;
  centerTab: CenterTab;
  jobLibraryIconStrip: boolean;
  chatExpanded: boolean;
  selectedCapabilityId: string | null;
  setStep: (step: WorkbenchStep) => void;
  setCenterTab: (tab: CenterTab) => void;
  setJobLibraryIconStrip: (v: boolean) => void;
  setChatExpanded: (v: boolean) => void;
  setSelectedCapabilityId: (id: string | null) => void;
}

export const useWorkbenchStore = create<WorkbenchState>((set) => ({
  step: 2,
  centerTab: 'analysis',
  jobLibraryIconStrip: false,
  chatExpanded: false,
  selectedCapabilityId: null,
  setStep: (step) => set({ step }),
  setCenterTab: (centerTab) =>
    set({
      centerTab,
      jobLibraryIconStrip: centerTab === 'compare',
    }),
  setJobLibraryIconStrip: (jobLibraryIconStrip) => set({ jobLibraryIconStrip }),
  setChatExpanded: (chatExpanded) => set({ chatExpanded }),
  setSelectedCapabilityId: (selectedCapabilityId) => set({ selectedCapabilityId }),
}));
