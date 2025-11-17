import { useMemo, useState } from 'react'
import { useAppStore } from '../store/useAppStore'

type Filter = 'Newest' | 'SLA Soon'

export default function JobList() {
  const { jobs, selectedJobId, selectJob } = useAppStore()
  const { routeTargetId, incrementOptimize } = useAppStore()
  const [filter, setFilter] = useState<Filter>('Newest')

  const filtered = useMemo(() => {
    const list = [...jobs]
    if (filter === 'Newest') { 
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else if (filter === 'SLA Soon') {
      list.sort((a, b) => (a.slaAt ? new Date(a.slaAt).getTime() : Infinity) - (b.slaAt ? new Date(b.slaAt).getTime() : Infinity))
    }
    return list
  }, [jobs, filter])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {(['Newest', 'SLA Soon'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              borderRadius: 8,
              padding: '6px 10px',
              border: filter === f ? '1px solid #3b82f6' : '1px solid #e5e7eb',
              background: filter === f ? '#eff6ff' : '#fff',
              cursor: 'pointer'
            }}
          >
            {f}
          </button>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={() => incrementOptimize()}
            style={{
              borderRadius: 8,
              padding: '6px 10px',
              border: '1px solid #ef4444',
              background: '#fee2e2',
              cursor: 'pointer'
            }}
          >
            Optimize Route
          </button>
        </div>
      </div>
      <div className="job-list" style={{ overflow: 'auto', borderRadius: 12, border: `1px solid var(--panel-border)`, background: 'var(--panel-bg)', flex: 1, minHeight: 0 }}>
        {filtered.map((j) => (
          <div
            key={j.id}
            onClick={() => selectJob(j.id)}
            style={{
              padding: 12,
              borderBottom: '1px solid #f3f4f6',
              background: selectedJobId === j.id ? '#f8fafc' : '#fff',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600 }}>{j.address}</div>
              <span
                style={{
                  fontSize: 12,
                  borderRadius: 999,
                  padding: '2px 8px',
                  background: j.status === 'Done' ? '#d1fae5' : '#fee2e2',
                  color: '#111827',
                  border: '1px solid #e5e7eb'
                }}
              >
                {j.status === 'Done' ? 'Complete' : 'Incomplete'}
              </span>
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                Created {new Date(j.createdAt).toLocaleString()} {j.slaAt ? `· SLA ${new Date(j.slaAt).toLocaleTimeString()}` : ''}
              </div>
              <div style={{ marginTop: 6 }}>
                {routeTargetId === j.id && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();

                      const updatedJobs = jobs.map((x) =>
                        x.id === j.id ? { ...x, status: 'Done' as const } : x
                      );
                      const { setJobs, setRouteTarget, setCurrentLocation } = useAppStore.getState();
                      setJobs(updatedJobs);
                      setRouteTarget(undefined);
                      setCurrentLocation([j.lon, j.lat]);
                      const { routeDataMap } = useAppStore.getState();
                      const routeData = routeDataMap[j.id];

                      // Send completed route to backend
                      try {
                        if (!routeData?.coords || !routeData.travelTimeSec || !routeData.totalDistanceMiles) {
                          console.warn('Missing route data for job', j.id);
                          return;
                        }

                        await fetch('http://localhost:3001/api/save-route', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            coords: routeData.coords,
                            travelTimeSec: routeData.travelTimeSec,
                            totalDistanceMiles: routeData.totalDistanceMiles,
                            isDone: true
                          })
                        });
                        console.log('Sent route save request:', {
                          coords: routeData.coords,
                          travelTimeSec: routeData.travelTimeSec,
                          totalDistanceMiles: routeData.totalDistanceMiles,
                          isDone: true
                        });

                      } catch (err) {
                        console.error('Failed to save completed route:', err);
                      }
                    }}
                    style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #10b981', background: '#d1fae5', cursor: 'pointer' }}
                  >
                    Complete routed job
                  </button>
                )}
              </div>
            </div>
            
          </div>
        ))}
        {filtered.length === 0 && <div style={{ padding: 12, color: '#6b7280' }}>No open outages.</div>}
      </div>
    </div>
  )
}

