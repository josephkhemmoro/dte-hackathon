import { useEffect } from 'react'
import JobList from './components/JobList'
import MapView from './components/MapView'
import { useAppStore } from './store/useAppStore'
import type { OutageJob } from './types'
import GeoJsonIngest from './components/GeoJsonIngest'
import { featureToJob } from './utils/geo'

function App() {
  const setJobs = useAppStore((s) => s.setJobs)

  useEffect(() => {
    async function loadOutages() {
      try {
        const response = await fetch('/geoJson/StormOutages.json')
        const data = await response.json()

        if (!data || !Array.isArray(data.features)) {
          console.error('Invalid GeoJSON format')
          return
        }

        const jobs = (data.features.map(featureToJob) as Array<OutageJob | null>)
          .filter((job): job is OutageJob => job !== null)

        setJobs(jobs)
      } catch (error) {
        console.error('Failed to load outage data:', error)
      }
    }

    loadOutages()
  }, [setJobs])

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '360px 1fr',
        gap: 16,
        padding: 16,
        height: '100vh',
        boxSizing: 'border-box',
        background: '#f3f4f6'
      }}
    >
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 8,
            color: 'var(--text-default)'
          }}
        >
          Outages (SAMPLE ADDRESSES)
        </div>
        <div style={{ marginBottom: 8 }}>
          <GeoJsonIngest />
        </div>
        <JobList />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 8,
            color: 'var(--text-default)'
          }}
        >
          Map
        </div>
        <div
          style={{
            flex: 1,
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid #e5e7eb'
          }}
        >
          <MapView />
        </div>
      </div>
    </div>
  )
}

export default App
