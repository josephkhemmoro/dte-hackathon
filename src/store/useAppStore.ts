import { create } from 'zustand'
import type { Crew, OutageJob } from '../types'

type RouteResult = {
  coords: [number, number][];
  travelTimeSec?: number;
  totalDistanceMiles?: number;
}

type AppState = {
  jobs: OutageJob[];
  crews: Crew[];
  selectedJobId?: string;
  routeTargetId?: string;
  optimizeCounter: number;
  currentLocation: [number, number] | null;
  routeDataMap: Record<string, RouteResult>;
  setRouteDataMap: (map: Record<string, RouteResult>) => void;
  setRouteDataForJob: (jobId: string, data: RouteResult) => void;
  setJobs: (jobs: OutageJob[]) => void;
  setCrews: (crews: Crew[]) => void;
  selectJob: (id?: string) => void;
  setRouteTarget: (id?: string) => void;
  incrementOptimize: () => void;
  setCurrentLocation: (loc: [number, number]) => void;
  bestRoute: RouteResult | null;
  setBestRoute: (route: RouteResult | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  jobs: [],
  crews: [],
  selectedJobId: undefined,
  routeTargetId: undefined,
  optimizeCounter: 0,
  currentLocation: null,
  routeDataMap: {},
  setRouteDataMap: (map) => set({ routeDataMap: map }),
  setRouteDataForJob: (jobId, data) =>
    set((state) => ({
      routeDataMap: {
        ...state.routeDataMap,
        [jobId]: data
      }
    })),
  setJobs: (jobs) => set({ jobs }),
  setCrews: (crews) => set({ crews }),
  selectJob: (id) => set({ selectedJobId: id }),
  setRouteTarget: (id) => set({ routeTargetId: id }),
  incrementOptimize: () => set((s) => ({ optimizeCounter: s.optimizeCounter + 1 })),
  setCurrentLocation: (loc) => set({ currentLocation: loc }),
  bestRoute: null,
  setBestRoute: (route) => set({ bestRoute: route })
}));