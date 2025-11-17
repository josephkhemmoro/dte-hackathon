export type OutageJob = {
  id: string;
  address: string;
  lat: number;
  lon: number;
  createdAt: string;
  status: 'Open' | 'Assigned' | 'InProgress' | 'Done';
  slaAt?: string;
  territoryId?: string;
};

export type Crew = {
  id: string;
  name: string;
  role?: string;
  homeBaseLat?: number;
  homeBaseLon?: number;
  currentLat: number;
  currentLon: number;
  shiftEndAt?: string;
  capacity?: number;
};

export type Assignment = {
  jobId: string;
  crewId: string;
  assignedAt: string;
  etaSec: number;
  routeId?: string;
  status: 'Proposed' | 'Assigned' | 'Started' | 'Completed';
};

export type TracePoint = { t: number; lat: number; lon: number; speed?: number };

export type Trace = { assignmentId: string; points: TracePoint[]; routePolyline?: string };

