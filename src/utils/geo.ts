import type { OutageJob } from '../types'

export function featureToJob(f: any): OutageJob | null {
  try {
    if (!f || f.type !== 'Feature') return null
    if (!f.geometry || f.geometry.type !== 'Point') return null // Ensure geometry is Point
    const coords = f.geometry?.coordinates
    if (!Array.isArray(coords) || coords.length < 2) return null
    const props = f.properties || {}
    const id =
      props.id ??
      f.id ??
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2))
    const address = props.address ?? props.Address ?? props.name ?? `Job ${id}`
    const createdAt = props.createdAt ?? new Date().toISOString()
    // priority is removed from the job model; ignore incoming priority property
    const status: OutageJob['status'] =
      props.status === 'Open' ||
      props.status === 'Assigned' ||
      props.status === 'InProgress' ||
      props.status === 'Done'
        ? props.status
        : 'Open'
    return {
      id: String(id),
      address: String(address),
      lat: Number(coords[1]),
      lon: Number(coords[0]),
      createdAt: String(createdAt),
      status,
      slaAt: props.slaAt ? String(props.slaAt) : undefined,
      territoryId: props.territoryId ? String(props.territoryId) : undefined
    }
  } catch {
    return null
  }
}

export default featureToJob
