import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { App } from "./App"

vi.mock("../components/map-canvas", () => ({
  MapCanvas: ({ center }: { center: { label: string } }) => <div aria-label="테스트 지도">{center.label}</div>,
}))

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  }))
}

describe("생활 탐색 워크스페이스", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(() => jsonResponse({ items: [] })))
  })

  it("첫 화면에서 위치 권한을 자동 요청하지 않고 목적 선택을 안내한다", () => {
    const getCurrentPosition = vi.fn()
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    })
    render(<App />)
    expect(screen.getByRole("heading", { name: "오늘, 어디로 갈까요?" })).toBeVisible()
    expect(screen.getByText("첫 목적을 골라보세요")).toBeVisible()
    expect(getCurrentPosition).not.toHaveBeenCalled()
  })

  it("연결 상태에서 미구현 소스를 장애가 아니라 도입 예정으로 구분한다", async () => {
    vi.stubGlobal("fetch", vi.fn(() => jsonResponse({
      items: [{ id: "nmcHospitals", label: "병원 정보", status: "planned", configured: false }],
      checkedAt: "2026-07-24T00:00:00.000Z",
    })))
    render(<App />)

    await userEvent.click(screen.getByRole("button", { name: "연결 상태" }))

    expect(await screen.findByText("병원 정보")).toBeVisible()
    expect(screen.getByText("도입 예정")).toBeVisible()
    expect(screen.queryByText("선택 기능 · 미설정")).not.toBeInTheDocument()
  })

  it("빠른 목적을 누르면 장소 결과를 카드로 표시한다", async () => {
    vi.stubGlobal("fetch", vi.fn(() => jsonResponse({
      items: [{ id: "node-1", name: "테스트 카페", category: "cafe", address: "서울 중구", lat: 37.56, lng: 126.98, distanceKm: 0.4, sourceUrl: "https://www.openstreetmap.org/node/1" }],
      count: 1,
    })))
    render(<App />)
    await userEvent.click(screen.getByRole("button", { name: "카페" }))
    expect(await screen.findByText("테스트 카페")).toBeVisible()
    expect(screen.getByText("0.4km · cafe")).toBeVisible()
  })

  it("반경을 바꾸면 선택한 반경으로 즉시 다시 검색한다", async () => {
    const fetchMock = vi.fn(() => jsonResponse({ items: [], count: 0 }))
    vi.stubGlobal("fetch", fetchMock)
    render(<App />)
    await userEvent.click(screen.getByRole("button", { name: "3km" }))
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("radiusKm=3"),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(screen.getByRole("button", { name: "3km" })).toHaveAttribute("aria-pressed", "true")
  })

  it("전국 지역 검색 결과 좌표로 지도와 장소 검색을 함께 이동한다", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.startsWith("/api/geocode")) {
        return jsonResponse({ items: [{ label: "제주시 · 제주특별자치도 · 대한민국", lat: 33.4996, lng: 126.5312 }], count: 1 })
      }
      return jsonResponse({ items: [], count: 0 })
    })
    vi.stubGlobal("fetch", fetchMock)
    render(<App />)
    const input = screen.getByRole("textbox", { name: "전국 지역 검색" })
    await userEvent.clear(input)
    await userEvent.type(input, "제주시")
    await userEvent.click(screen.getByRole("button", { name: "이동" }))

    expect(await screen.findByLabelText("테스트 지도")).toHaveTextContent("제주시")
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/places\?.*lat=33\.4996.*lng=126\.5312/),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    ))
    expect(screen.getByText(/중심으로 지도와 검색 반경을 이동했습니다/)).toBeVisible()
  })

  it("동명 지역이 여러 개면 첫 결과로 이동하지 않고 사용자가 탐색 기준을 선택한다", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.startsWith("/api/geocode")) {
        return jsonResponse({
          items: [
            { label: "중앙동 · 서울특별시 · 대한민국", lat: 37.56, lng: 126.98 },
            { label: "중앙동 · 부산광역시 · 대한민국", lat: 35.11, lng: 129.04 },
          ],
          count: 2,
        })
      }
      return jsonResponse({ items: [], count: 0 })
    })
    vi.stubGlobal("fetch", fetchMock)
    render(<App />)

    const input = screen.getByRole("textbox", { name: "전국 지역 검색" })
    await userEvent.clear(input)
    await userEvent.type(input, "중앙동")
    await userEvent.click(screen.getByRole("button", { name: "이동" }))

    expect(await screen.findByText("검색할 지역을 선택해 주세요.")).toBeVisible()
    expect(fetchMock.mock.calls.some(([url]) => String(url).startsWith("/api/places"))).toBe(false)

    await userEvent.click(screen.getByRole("button", { name: /중앙동 · 부산광역시/ }))
    expect(await screen.findByLabelText("테스트 지도")).toHaveTextContent("부산광역시")
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/places\?.*lat=35\.11.*lng=129\.04/),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    ))
  })

  it("위치 권한 거부 후에도 수동 지역 탐색을 제공한다", async () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: (_success: unknown, error: (value: { code: number }) => void) => error({ code: 1 }) },
    })
    render(<App />)
    await userEvent.click(screen.getByRole("button", { name: "내 위치" }))
    expect(screen.getByText(/위치 권한이 꺼져 있습니다/)).toBeVisible()
    expect(screen.getByLabelText("탐색 기준")).toBeEnabled()
  })

  it("혜택 API 미설정 시 원시 인증 문구 대신 정부24 행동을 제공한다", async () => {
    vi.stubGlobal("fetch", vi.fn(() => jsonResponse({ error: { code: "PUBLIC_API_NOT_CONFIGURED", message: "not configured" } }, 503)))
    render(<App />)
    expect(screen.queryByRole("button", { name: /소상공인/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("tab", { name: "정부 지원 정보" }))
    expect(screen.queryByRole("heading", { name: "동네에서 뭐 할까?" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "카페" })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /소상공인/ }))
    expect(await screen.findByRole("link", { name: /정부24에서 계속 찾기/ })).toBeVisible()
    expect(screen.queryByText(/API.*키/i)).not.toBeInTheDocument()
  })

  it("혜택 대체 응답도 빈 화면 대신 공식 카드를 표시한다", async () => {
    vi.stubGlobal("fetch", vi.fn(() => jsonResponse({
      items: [{ id: "official-1", name: "소상공인 지원사업 공식 확인", summary: "현재 모집 사업 확인", agency: "소상공인시장진흥공단", supportType: "사업 지원", detailUrl: "https://www.sbiz24.kr/" }],
      count: 1,
      degraded: true,
    })))
    render(<App />)
    await userEvent.click(screen.getByRole("tab", { name: "정부 지원 정보" }))
    await userEvent.click(screen.getByRole("button", { name: /소상공인/ }))
    expect(await screen.findByRole("heading", { name: "소상공인 지원사업 공식 확인" })).toBeVisible()
    expect(screen.getByRole("link", { name: /상세 확인/ })).toHaveAttribute("href", "https://www.sbiz24.kr/")
    expect(screen.getByRole("heading", { name: "공식 확인 경로" })).toBeVisible()
    expect(screen.getByText(/맞춤 판정 결과가 아니라/)).toBeVisible()
    expect(screen.queryByRole("heading", { name: "맞춤 혜택" })).not.toBeInTheDocument()
    expect(screen.queryByText(/원시 API 오류/)).not.toBeInTheDocument()
  })

  it("데이트 코스는 공원과 카페를 같은 중심·반경으로 함께 탐색한다", async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL) => jsonResponse({ items: [], count: 0 }))
    vi.stubGlobal("fetch", fetchMock)
    render(<App />)

    await userEvent.click(screen.getByRole("button", { name: /데이트 코스/ }))

    await waitFor(() => {
      const placeUrls = fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => url.startsWith("/api/places"))
      expect(placeUrls).toHaveLength(2)
      expect(placeUrls.some((url) => url.includes("category=park") && url.includes("radiusKm=3"))).toBe(true)
      expect(placeUrls.some((url) => url.includes("category=cafe") && url.includes("radiusKm=3"))).toBe(true)
    })
  })

  it("복합 코스 중 한 카테고리가 실패해도 확인된 장소는 보존한다", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes("category=cafe")) {
        return jsonResponse({ error: { code: "PLACE_TIMEOUT", message: "지연" } }, 504)
      }
      return jsonResponse({
        items: [{ id: "park-1", name: "살아있는 공원", category: "park", address: "서울 중구", lat: 37.56, lng: 126.98, distanceKm: 0.7, sourceUrl: "https://www.openstreetmap.org/way/1" }],
        count: 1,
      })
    })
    vi.stubGlobal("fetch", fetchMock)
    render(<App />)

    await userEvent.click(screen.getByRole("button", { name: /데이트 코스/ }))

    expect(await screen.findByText("살아있는 공원")).toBeVisible()
    expect(screen.getByText(/일부 목적의 연결이 지연되어/)).toBeVisible()
    expect(screen.queryByText("장소 연결이 잠시 멈췄습니다")).not.toBeInTheDocument()
  })

  it("혜택을 빠르게 연속 선택해도 늦은 이전 응답이 최신 결과를 덮지 않는다", async () => {
    const pending: Array<(response: Response) => void> = []
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => pending.push(resolve))))
    render(<App />)
    await userEvent.click(screen.getByRole("tab", { name: "정부 지원 정보" }))
    await userEvent.click(screen.getByRole("button", { name: /1인 창조기업/ }))
    await waitFor(() => expect(pending).toHaveLength(1))
    await userEvent.click(screen.getByRole("button", { name: /소상공인/ }))
    await waitFor(() => expect(pending).toHaveLength(2))

    pending[1](new Response(JSON.stringify({ items: [{ id: "new", name: "최신 소상공인 결과" }], count: 1 }), { status: 200, headers: { "Content-Type": "application/json" } }))
    expect(await screen.findByRole("heading", { name: "최신 소상공인 결과" })).toBeVisible()
    pending[0](new Response(JSON.stringify({ items: [{ id: "old", name: "늦게 도착한 이전 결과" }], count: 1 }), { status: 200, headers: { "Content-Type": "application/json" } }))

    await waitFor(() => expect(screen.queryByText("늦게 도착한 이전 결과")).not.toBeInTheDocument())
    expect(screen.getByRole("heading", { name: "최신 소상공인 결과" })).toBeVisible()
  })
})
