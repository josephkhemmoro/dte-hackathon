import { useEffect, useRef, useState } from 'react'
import * as atlas from 'azure-maps-control'
import { useAppStore } from '../store/useAppStore'
import { attachServiceTerritory } from '../map/territory'
import { getNextJobRoute } from '../map/routing'
import { fetchRouteStats } from '../map/routing';

export default function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<atlas.Map | null>(null)
  const [initError, setInitError] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const { jobs, selectedJobId, setRouteTarget, optimizeCounter, currentLocation, setCurrentLocation } = useAppStore()
  const [showCongrats, setShowCongrats] = useState(false);
  const [stats, setStats] = useState<{ totalDistance: number; totalTimeMin: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const subKey = (import.meta.env.VITE_AZURE_MAPS_SUBSCRIPTION_KEY as string | undefined) || (process.env.AZURE_MAPS_SUBSCRIPTION_KEY as string | undefined)
    const clientId = (import.meta.env.VITE_AZURE_MAPS_CLIENT_ID as string | undefined) || (process.env.AZURE_MAPS_CLIENT_ID as string | undefined)
    const tokenUrl = (import.meta.env.VITE_AZURE_MAPS_TOKEN_URL as string | undefined) || undefined

    // If the developer hasn't configured any form of auth, show an in-app error
    if (!subKey && !(clientId && tokenUrl)) {
      const msg = 'Azure Maps not configured. Set VITE_AZURE_MAPS_SUBSCRIPTION_KEY or VITE_AZURE_MAPS_CLIENT_ID + VITE_AZURE_MAPS_TOKEN_URL in your .env and restart the dev server.'

      console.error(msg)
      setInitError(msg)
      return
    }

    try {
      // Do a tiny non-sensitive debug log indicating which auth path will be used
      // (don't log secrets)
      console.debug('Azure Maps auth:', subKey ? 'subscriptionKey' : clientId && tokenUrl ? 'tokenEndpoint' : 'anonymous')
      mapRef.current = new atlas.Map(containerRef.current, {
        view: 'Auto',
        style: 'road',
        // Cast to satisfy typings across SDK versions.
        authOptions: (
          subKey
            ? ({ authType: 'subscriptionKey', subscriptionKey: subKey } as unknown)
            : clientId && tokenUrl
              ? ({
                authType: 'anonymous',
                clientId,
                getToken: (resolve: (token: string) => void, reject: (reason?: unknown) => void) => {
                  fetch(tokenUrl)
                    .then((r) => (r.ok ? r.text() : Promise.reject(new Error('Token fetch failed'))))
                    .then((t) => resolve(t))
                    .catch(reject)
                }
              } as unknown)
              : ({ authType: 'anonymous' } as unknown)
        ) as atlas.AuthenticationOptions,
        center: [-83.0458, 42.3314],
        zoom: 11
      })
      // mark readiness when the SDK fires the ready event
      try {
        mapRef.current.events.add('ready', () => {
          setMapReady(true)
        })
      } catch {
        // ignore if events API isn't available yet
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('Failed to initialize Azure Map', err)
        setInitError(err.message)
      } else {
        console.error('Failed to initialize Azure Map', err)
        setInitError(String(err))
      }
    }

    return () => {
      mapRef.current?.dispose()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const sourceId = 'jobs-src'
    const layerId = 'jobs-lyr'

    let src = map.sources.getById(sourceId) as atlas.source.DataSource | undefined
    if (!src) {
      src = new atlas.source.DataSource(sourceId)
      map.sources.add(src)

      const lyr = new atlas.layer.BubbleLayer(src, layerId, {
        radius: 6,
        color: [
          'case',
          ['==', ['get', 'status'], 'Done'], '#10b981', // green for completed
          '#2563eb' // blue for incomplete
        ],
        strokeColor: '#ffffff',
        strokeWidth: 2
      })

      map.layers.add(lyr)
    }

    src.clear()

    const features = jobs.map((j) =>
      new atlas.data.Feature(new atlas.data.Point([j.lon, j.lat]), {
        id: j.id,
        status: j.status // 👈 used for conditional styling
      })
    )

    if (features.length) {
      src.add(features)
    }

    if (selectedJobId) {
      const target = jobs.find((j) => j.id === selectedJobId)
      if (target) {
        map.setCamera({ center: [target.lon, target.lat], zoom: 13 })
      }
    }
  }, [jobs, selectedJobId, mapReady])

  // simple routing: draw a straight-line 'optimal' route from service center to chosen job
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const routeSourceId = 'route-src'
    const routeLayerId = 'route-lyr'

    // Fetch service center location
    fetch('/geoJson/ServiceCenter.json')
      .then((r) => r.json())
      .then(async (data: atlas.data.FeatureCollection) => {
        const feature = data.features?.[0]
        if (!feature || feature.geometry?.type !== 'Point') return
        const centerCoords = feature.geometry.coordinates as [number, number]

        // Initialize current location if not set
        if (!currentLocation) setCurrentLocation(centerCoords)
        const origin = currentLocation ?? centerCoords

        // Filter open jobs
        const openJobs = jobs.filter((j) => j.status !== 'Done')
        if (openJobs.length === 0) {
          const existingSrc = map.sources.getById(routeSourceId) as atlas.source.DataSource | undefined
          if (existingSrc) existingSrc.clear()
          try {
            const ly = (map.layers as any).getById?.(routeLayerId)
            if (ly) map.layers.remove(ly)
          } catch {
            // Intentionally ignore errors when removing the route layer
          }
          return
        }

        // Get next best job based on routing
        const { bestJob, bestRoute } = await getNextJobRoute(origin, openJobs)

        if (!bestJob || !bestRoute) return
        setRouteTarget(bestJob.id)

        const coords = bestRoute.coords

        // Ensure source and layer exist
        let src = map.sources.getById(routeSourceId) as atlas.source.DataSource | undefined
        if (!src) {
          src = new atlas.source.DataSource(routeSourceId)
          map.sources.add(src)
          const lyr = new atlas.layer.LineLayer(src, routeLayerId, {
            strokeColor: '#ef4444',
            strokeWidth: 4
          })
          map.layers.add(lyr)
        }

        src.clear()
        src.add(new atlas.data.Feature(new atlas.data.LineString(coords as [number, number][])))

        // Fit camera to route
        try {
          const lats = coords.map((c) => c[1])
          const lons = coords.map((c) => c[0])
          const minLat = Math.min(...lats)
          const maxLat = Math.max(...lats)
          const minLon = Math.min(...lons)
          const maxLon = Math.max(...lons)
          map.setCamera({ bounds: [[minLon, minLat], [maxLon, maxLat]], padding: 40 })
        } catch (e) {
          console.error('Failed to fit camera to route:', e)
        }
      })
      .catch((err) => {
        console.error('Failed to compute route:', err)
      })
  }, [jobs, mapReady, optimizeCounter, currentLocation, setCurrentLocation, setRouteTarget])

  // loaded territory as a seperate module
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const cleanup = attachServiceTerritory(map)
    return () => cleanup()
  }, [mapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    fetch('/geoJson/ServiceCenter.json')
      .then(res => res.json())
      .then((data: atlas.data.FeatureCollection) => {
        const feature = data.features?.[0]
        if (!feature || feature.geometry?.type !== 'Point') return

        const sourceId = 'start-src'
        const layerId = 'start-lyr'

        let src = map.sources.getById(sourceId) as atlas.source.DataSource | undefined
        if (!src) {
          src = new atlas.source.DataSource(sourceId)
          map.sources.add(src)

          const lyr = new atlas.layer.SymbolLayer(src, layerId, {
            iconOptions: {
              image: 'pin-red',
              anchor: 'center'
            },
            textOptions: {
              textField: 'Service Center', // 👈 override label text
              offset: [0, 1.2],
              color: '#111'
            }
          })
          map.layers.add(lyr)
        }

        src.clear()
        src.add(feature)
      })
      .catch(err => {
        console.error('Failed to load service center:', err)
      })
  }, [mapReady])

  console.log('showCongrats:', showCongrats, 'stats:', stats);
  useEffect(() => {
    const allJobsComplete = jobs.length > 0 && jobs.every((j) => j.status === 'Done');
    console.log('All jobs complete?', allJobsComplete);
    if (!allJobsComplete) return;

    fetchRouteStats().then((data) => {
      console.log('Fetched route stats:', data);
      setStats({ totalDistance: data.totalDistance, totalTimeMin: data.totalTimeMin });
      setShowCongrats(true);
      console.log('Popup should now be visible');

      const map = mapRef.current;
      if (!map || !mapReady) return;

      const routeSourceId = 'completed-routes-src';
      const routeLayerId = 'completed-routes-lyr';

      // Ensure source and layer exist
      let src = map.sources.getById(routeSourceId) as atlas.source.DataSource | undefined;
      if (!src) {
        src = new atlas.source.DataSource(routeSourceId);
        map.sources.add(src);

        const lyr = new atlas.layer.LineLayer(src, routeLayerId, {
          strokeColor: '#10b981',
          strokeWidth: 3
        });
        map.layers.add(lyr);
      }

      src.clear();
      data.routes.forEach((route: { coords: atlas.data.Position[] }) => {
        src!.add(new atlas.data.Feature(new atlas.data.LineString(route.coords)));
      });

      // Fit camera to all routes
      const allCoords = data.routes.flatMap((r: { coords: unknown }) => r.coords);
      const lats = allCoords.map((c: unknown[]) => c[1]);
      const lons = allCoords.map((c: unknown[]) => c[0]);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);
      map.setCamera({ bounds: [[minLon, minLat], [maxLon, maxLat]], padding: 40 });
    });
  }, [jobs, mapReady]);

  console.log('mapReady:', mapReady);
  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {initError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(180deg, rgba(31,41,55,0.85), rgba(31,41,55,0.85))',
            color: 'var(--text-default)',
            padding: 12,
            textAlign: 'center'
          }}
        >
          <div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Map initialization error</div>
            <div style={{ fontSize: 13 }}>{initError}</div>
          </div>
        </div>
      )}
      {showCongrats && stats && (
        <div
          style={{
            position: 'absolute',
            top: '30%',
            left: '50%',
            transform: 'translate(-50%, -30%)',
            background: '#f0fdf4',
            border: '2px solid #10b981',
            borderRadius: 12,
            padding: 24,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 1000
          }}
        >
          <h2 style={{ marginBottom: 12 }}>🎉 Nice job, you finished all the jobs!</h2>
          <p>Total travel time: <strong>{stats.totalTimeMin.toFixed(1)} minutes</strong></p>
          <p>Total distance: <strong>{stats.totalDistance.toFixed(2)} miles</strong></p>
          <button
            onClick={() => setShowCongrats(false)}
            style={{
              marginTop: 16,
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #10b981',
              background: '#d1fae5',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}

