import type { OutageJob } from '../types'
import { useAppStore } from '../store/useAppStore';

type RouteResult = {
  coords: [number, number][]
  travelTimeSec?: number,
  totalDistanceMiles?: number
}

// decode Azure Maps polyline (encoded as simple polyline) - helper
function decodePolyline(encoded: string): [number, number][] {
  // polyline algorithm (Google/OSRM-compatible)
  const coords: [number, number][] = []
  let index = 0
  const len = encoded.length
  let lat = 0
  let lng = 0

  while (index < len) {
    let b: number
    let shift = 0
    let result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1))
    lat += dlat

    shift = 0
    result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1))
    lng += dlng

    coords.push([lng / 1e5, lat / 1e5])
  }
  return coords
}

export async function getDrivingRoute(from: [number, number], to: [number, number]): Promise<RouteResult> {
  // Use Subscription Key if available, otherwise attempt token flow if configured.
  const subKey = (import.meta.env.VITE_AZURE_MAPS_SUBSCRIPTION_KEY as string | undefined)
  const tokenUrl = (import.meta.env.VITE_AZURE_MAPS_TOKEN_URL as string | undefined) || undefined

  // Build request URL for Azure Maps Directions - Route Directions API
  // Example: https://atlas.microsoft.com/route/directions/json?api-version=1.0&subscription-key={key}&query={fromLat},{fromLon}:{toLat},{toLon}
  const base = 'https://atlas.microsoft.com/route/directions/json'
  const query = `${from[1]},${from[0]}:${to[1]},${to[0]}`
  const url = `${base}?api-version=1.0&query=${encodeURIComponent(query)}&travelMode=car&traffic=true&routeType=fastest&computeBestOrder=true`

  try {
    const headers: Record<string, string> = {}
    let finalUrl = url
    if (subKey) {
      finalUrl = `${url}&subscription-key=${encodeURIComponent(subKey)}`
    } else if (tokenUrl) {
      // fetch token
      const tRes = await fetch(tokenUrl)
      if (!tRes.ok) throw new Error('Token fetch failed')
      const token = await tRes.text()
      headers['Authorization'] = `Bearer ${token}`
    } else {
      throw new Error('No Azure Maps credentials configured')
    }

    const res = await fetch(finalUrl, { headers })
    if (!res.ok) throw new Error('Route request failed')
    const data = await res.json()
    // data.routes[0].legs[0].points? or the summary has travelTimeInSeconds and the route.geometry has polyline
    const route = data.routes?.[0]
    if (!route) throw new Error('No route returned')

    const travelTimeSec = route.summary?.travelTimeInSeconds
    const totalDistanceMeters = route.summary?.lengthInMeters //Azure only returns distance in meters
    const totalDistanceMiles = totalDistanceMeters ? totalDistanceMeters / 1609.344 : undefined
    // The geometry may be in route.sections[0].polyline or route.legs[0].points depending on provider
    const encoded = route.geometry?.points || route.sections?.[0]?.polyline
    let coords: [number, number][] = []
    if (encoded) {
      coords = decodePolyline(encoded)
    } else if (route.legs && route.legs.length) {
      // fallback: collect points from legs
      coords = route.legs.flatMap((leg: any) => (leg.points || []).map((p: any) => [p.longitude, p.latitude]))
    } else {
      // final fallback, straight line
      coords = [from, to]
    }

    return { coords, travelTimeSec, totalDistanceMiles }
  } catch (err) {
    // On any error, fall back to straight line
    return { coords: [from, to] }
  }
}

export async function getNextJobRoute(currentLocation: [number, number], jobs: OutageJob[]) {
  let bestJob: OutageJob | null = null;
  let bestTime = Infinity;
  let bestRoute = null;

  for (const job of jobs) {
    const route = await getDrivingRoute(currentLocation, [job.lon, job.lat]);
    if (route.travelTimeSec && route.travelTimeSec < bestTime) {
      bestTime = route.travelTimeSec;
      bestJob = job;
      bestRoute = route;
    }
  }

  // Store the route for the selected job
  if (bestJob && bestRoute) {
    useAppStore.getState().setRouteDataForJob(bestJob.id, bestRoute);
  }

  return { bestJob, bestRoute };
}

export async function fetchRouteStats() {
  const res = await fetch('http://localhost:3001/api/saved-route');
  if (!res.ok) {
    console.error('Failed to fetch saved route:', res.status);
    return { totalDistance: 0, totalTimeMin: 0, routes: [] };
  }

  const data = await res.json();

  const totalDistance = data.routes.reduce(
    (sum: number, r: { totalDistanceMiles?: number }) => sum + (r.totalDistanceMiles || 0),
    0
  );

  const totalTimeMin = data.routes.reduce(
    (sum: number, r: { travelTimeSec?: number }) => sum + (r.travelTimeSec || 0),
    0
  ) / 60;

  return { totalDistance, totalTimeMin, routes: data.routes };
}

export type { RouteResult }
