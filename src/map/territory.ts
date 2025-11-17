import * as atlas from 'azure-maps-control'

type Cleanup = () => void

export function attachServiceTerritory(map: atlas.Map): Cleanup {
  const srcId = 'territory-src'
  const fillSrcId = srcId + '-fill'
  const lineLayerId = 'territory-line-lyr'
  const fillLayerId = 'territory-fill-lyr'

  let cancelled = false

  function removeIfExists() {
    try {
      const layers = map.layers.getLayers()
      const line = layers.find((l: any) => l && (l as any).id === lineLayerId)
      if (line) map.layers.remove(line)
    } catch {}
    try {
      const layers = map.layers.getLayers()
      const fill = layers.find((l: any) => l && (l as any).id === fillLayerId)
      if (fill) map.layers.remove(fill)
    } catch {}
    try {
      const s = map.sources.getById(srcId)
      if (s) map.sources.remove(s)
    } catch {}
    try {
      const fs = map.sources.getById(fillSrcId)
      if (fs) map.sources.remove(fs)
    } catch {}
  }

  let src = map.sources.getById(srcId) as atlas.source.DataSource | undefined
  if (!src) {
    src = new atlas.source.DataSource(srcId)
    map.sources.add(src)
  }

  const url = '/geoJson/ServiceTerritory.json'
  fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to fetch territory: ${r.status}`)
      return r.json()
    })
    .then((data) => {
      if (cancelled) return
      const features = data.type === 'FeatureCollection' ? data.features ?? [] : data.type === 'Feature' ? [data] : []

      // add features to main source used for the outline
      try {
        src!.clear()
        if (features.length) src!.add(features)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to add territory features to source', err)
      }

      // only add layers once
      try {
        const layers = map.layers.getLayers()
        const exists = layers.some((l: any) => l && (l as any).id === lineLayerId)
        if (exists) return

        // find polygon features and convert closed lines into polygons
        const polygonFeatures = features.filter((f: any) => f?.geometry?.type === 'Polygon' || f?.geometry?.type === 'MultiPolygon')
        const closedLinePolys: any[] = []
        for (const f of features) {
          if (f?.geometry?.type === 'LineString') {
            const coords = f.geometry.coordinates
            if (Array.isArray(coords) && coords.length >= 3) {
              const first = coords[0]
              const last = coords[coords.length - 1]
              const ring = coords.slice()
              if (!(first[0] === last[0] && first[1] === last[1])) ring.push(first)
              if (ring.length >= 4) closedLinePolys.push({ type: 'Feature', properties: f.properties ?? {}, geometry: { type: 'Polygon', coordinates: [ring] } })
            }
          }
        }

        const fillCandidates = [...polygonFeatures, ...closedLinePolys]
        if (fillCandidates.length > 0) {
          let fillSrc = map.sources.getById(fillSrcId) as atlas.source.DataSource | undefined
          if (!fillSrc) {
            fillSrc = new atlas.source.DataSource(fillSrcId)
            map.sources.add(fillSrc)
          }
          fillSrc.clear()
          fillSrc.add(fillCandidates)

          const fill = new atlas.layer.PolygonLayer(fillSrc, fillLayerId, {
            fillColor: '#a78bfa',
            fillOpacity: 0.18
          })
          map.layers.add(fill)
        }

        const line = new atlas.layer.LineLayer(src!, lineLayerId, {
          strokeColor: '#a855f7',
          strokeWidth: 3,
          lineJoin: 'round'
        })
        map.layers.add(line)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to add territory layers', err)
      }
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Failed to load service territory', err)
    })

  return () => {
    cancelled = true
    removeIfExists()
  }
}

export default attachServiceTerritory
