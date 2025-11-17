import { useRef, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { OutageJob } from '../types'
import { featureToJob } from '../utils/geo'

export default function GeoJsonIngest() {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const { jobs, setJobs } = useAppStore()
  const [mode, setMode] = useState<'append' | 'replace'>('replace')
  const [error, setError] = useState<string | undefined>(undefined)
  const [success, setSuccess] = useState<string | undefined>(undefined)

  async function handleText(text: string) {
    setError(undefined)
    setSuccess(undefined)
    try {
      const json = JSON.parse(text)
      const features: any[] =
        json.type === 'FeatureCollection'
          ? json.features ?? []
          : json.type === 'Feature'
          ? [json]
          : []
      const parsed = features
        .map((f) => featureToJob(f))
        .filter((v): v is OutageJob => !!v)
      if (parsed.length === 0) {
        setError('No valid Point features found in GeoJSON')
        return
      }
      const next = mode === 'append' ? [...jobs, ...parsed] : parsed
      setJobs(next)
      setSuccess(
        `Loaded ${parsed.length} job${parsed.length > 1 ? 's' : ''} from GeoJSON`
      )
    } catch (e: any) {
      setError(e?.message ?? 'Failed to parse GeoJSON')
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(undefined)
    setSuccess(undefined)
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => handleText(String(reader.result))
    reader.readAsText(f)
  }

  async function onPaste() {
    setError(undefined)
    setSuccess(undefined)
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      setError('Clipboard API not available')
      return
    }
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        await handleText(text)
      } else {
        setError('Clipboard is empty or does not contain text')
      }
    } catch (e: any) {
      setError('Failed to read from clipboard')
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {error && (
        <span style={{ color: '#b91c1c', fontSize: 12 }}>{error}</span>
      )}
      {success && (
        <span style={{ color: '#059669', fontSize: 12 }}>{success}</span>
      )}
    </div>
  )
}

