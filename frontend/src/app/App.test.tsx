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
    await userEvent.click(screen.getByRole("tab", { name: "정부 혜택" }))
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
    await userEvent.click(screen.getByRole("tab", { name: "정부 혜택" }))
    await userEvent.click(screen.getByRole("button", { name: /소상공인/ }))
    expect(await screen.findByRole("heading", { name: "소상공인 지원사업 공식 확인" })).toBeVisible()
    expect(screen.getByRole("link", { name: /상세 확인/ })).toHaveAttribute("href", "https://www.sbiz24.kr/")
  })

  it("혜택을 빠르게 연속 선택해도 늦은 이전 응답이 최신 결과를 덮지 않는다", async () => {
    const pending: Array<(response: Response) => void> = []
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => pending.push(resolve))))
    render(<App />)
    await userEvent.click(screen.getByRole("tab", { name: "정부 혜택" }))
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
