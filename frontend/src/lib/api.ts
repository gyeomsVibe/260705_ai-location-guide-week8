import type { Benefit, Coordinates, Place } from "../types"

type ApiErrorBody = { error?: { code?: string; message?: string; retryable?: boolean } }

export class ApiError extends Error {
  status: number
  code: string
  retryable: boolean

  constructor(status: number, body: ApiErrorBody) {
    super(body.error?.message || "요청을 처리하지 못했습니다.")
    this.name = "ApiError"
    this.status = status
    this.code = body.error?.code || "UNKNOWN_ERROR"
    this.retryable = body.error?.retryable ?? status >= 500
  }
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(response.status, body as ApiErrorBody)
  return body as T
}

export function fetchPlaces(
  center: Coordinates,
  category: string,
  radiusKm: number,
  query: string,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({
    lat: String(center.lat), lng: String(center.lng), radiusKm: String(radiusKm),
    category, limit: "30",
  })
  if (query.trim()) params.set("q", query.trim())
  return getJson<{ items: Place[]; count: number; attribution: string }>(`/api/places?${params}`, signal)
}

export function fetchBenefits(query: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ limit: "24" })
  if (query.trim()) params.set("q", query.trim())
  return getJson<{ items: Benefit[]; count: number }>(`/api/benefits?${params}`, signal)
}

export function fetchDataSources(signal?: AbortSignal) {
  return getJson<{ items: Array<{ id: string; label?: string; status: string }>; checkedAt: string }>(
    "/api/data-sources",
    signal,
  )
}
