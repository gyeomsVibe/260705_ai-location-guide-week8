export type Coordinates = { lat: number; lng: number; label: string }

export type Place = {
  id: string
  name: string
  category: string
  address: string
  lat: number
  lng: number
  distanceKm: number
  sourceUrl: string
}

export type Benefit = {
  id: string
  name: string
  summary?: string
  agency?: string
  target?: string
  detailUrl?: string
  supportType?: string
  serviceField?: string
}

export type LoadState = "idle" | "loading" | "success" | "empty" | "degraded" | "error"
