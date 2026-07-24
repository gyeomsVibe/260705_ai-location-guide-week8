import { useCallback, useEffect, useRef, useState } from "react"
import {
  Activity, Building2, Check, ChevronRight, Coffee, Compass, Cross, Gift,
  LocateFixed, MapPin, Moon, Navigation, Pill, RefreshCw, Search, Sparkles,
  Sun, Trees, Users, Utensils, WifiOff, X,
} from "lucide-react"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader } from "../components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs"
import { MapCanvas } from "../components/map-canvas"
import { fetchBenefits, fetchDataSources, fetchPlaces, fetchRegions } from "../lib/api"
import type { Benefit, Coordinates, LoadState, Place } from "../types"

const INITIAL_CENTER: Coordinates = { label: "서울시청", lat: 37.5665, lng: 126.978 }

const CATEGORIES = [
  { id: "restaurant", label: "맛집", icon: Utensils },
  { id: "cafe", label: "카페", icon: Coffee },
  { id: "gym", label: "헬스장", icon: Activity },
  { id: "park", label: "산책·공원", icon: Trees },
  { id: "hospital", label: "병원", icon: Cross },
  { id: "pharmacy", label: "약국", icon: Pill },
]

const SCENARIOS = [
  { label: "점심 뭐 먹지", note: "가까운 식사 · 1km", categories: ["restaurant"], radiusKm: 1, icon: Sun },
  { label: "저녁 한 끼", note: "식사 선택 · 3km", categories: ["restaurant"], radiusKm: 3, icon: Moon },
  { label: "데이트 코스", note: "공원 + 카페 · 3km", categories: ["park", "cafe"], radiusKm: 3, icon: Sparkles },
  { label: "동네 모임", note: "카페 + 식사 · 3km", categories: ["cafe", "restaurant"], radiusKm: 3, icon: Users },
]

const BENEFIT_PRESETS = [
  { label: "1인 창조기업", emoji: "🏢" },
  { label: "소상공인", emoji: "🏪" },
  { label: "예비창업", emoji: "💡" },
  { label: "신규 창업", emoji: "🚀" },
]

function stateCopy(state: LoadState, error: string) {
  if (state === "loading") return { title: "주변을 살펴보는 중", body: "지도 범위 안의 장소를 거리순으로 정리하고 있습니다." }
  if (state === "empty") return { title: "이 조건에는 결과가 없습니다", body: "반경을 넓히거나 다른 목적을 선택해 보세요." }
  if (state === "error") return { title: "장소 연결이 잠시 멈췄습니다", body: error || "잠시 후 다시 시도해 주세요." }
  return null
}

export function App() {
  const [mode, setMode] = useState("explore")
  const [center, setCenter] = useState<Coordinates>(INITIAL_CENTER)
  const [regionQuery, setRegionQuery] = useState(INITIAL_CENTER.label)
  const [regionState, setRegionState] = useState<LoadState>("idle")
  const [regionMessage, setRegionMessage] = useState("전국 시·군·구·동을 검색할 수 있습니다.")
  const [regionCandidates, setRegionCandidates] = useState<Coordinates[]>([])
  const [radius, setRadius] = useState(1)
  const [category, setCategory] = useState("restaurant")
  const [activeCategories, setActiveCategories] = useState(["restaurant"])
  const [searchIntent, setSearchIntent] = useState("맛집")
  const [query, setQuery] = useState("")
  const [places, setPlaces] = useState<Place[]>([])
  const [placeState, setPlaceState] = useState<LoadState>("idle")
  const [placeError, setPlaceError] = useState("")
  const [placeWarning, setPlaceWarning] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [geoState, setGeoState] = useState<"idle" | "loading" | "denied" | "error">("idle")
  const [benefitQuery, setBenefitQuery] = useState("")
  const [benefits, setBenefits] = useState<Benefit[]>([])
  const [benefitState, setBenefitState] = useState<LoadState>("idle")
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [sources, setSources] = useState<Array<{ id: string; label?: string; status: string; configured?: boolean }>>([])
  const requestRef = useRef<AbortController | null>(null)
  const regionRequestRef = useRef<AbortController | null>(null)
  const benefitRequestRef = useRef<AbortController | null>(null)

  const runPlaceSearch = useCallback(async (
    nextCategories: string | string[] = activeCategories,
    nextQuery = query,
    nextCenter = center,
    nextRadius = radius,
    nextIntent?: string,
  ) => {
    const categories = Array.isArray(nextCategories) ? nextCategories : [nextCategories]
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setCategory(categories[0])
    setActiveCategories(categories)
    setSearchIntent(nextIntent || (nextQuery.trim() ? `“${nextQuery.trim()}” 검색` : CATEGORIES.find((item) => item.id === categories[0])?.label || "통합 검색"))
    setQuery(nextQuery)
    setSelectedId(null)
    setPlaceError("")
    setPlaceWarning("")
    setPlaceState("loading")
    try {
      const settledResponses = await Promise.allSettled(categories.map((nextCategory) => (
        fetchPlaces(nextCenter, nextCategory, nextRadius, nextQuery, controller.signal)
      )))
      if (controller.signal.aborted || requestRef.current !== controller) return
      const responses = settledResponses.flatMap((result) => result.status === "fulfilled" ? [result.value] : [])
      if (!responses.length) {
        const rejected = settledResponses.find((result) => result.status === "rejected")
        throw rejected?.status === "rejected" ? rejected.reason : new Error("주변 장소를 불러오지 못했습니다.")
      }
      if (settledResponses.some((result) => result.status === "rejected")) {
        setPlaceWarning("일부 목적의 연결이 지연되어 확인된 결과만 먼저 보여드립니다.")
      }
      const uniquePlaces = Array.from(
        new Map(responses.flatMap((result) => result.items).map((place) => [place.id, place])).values(),
      ).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 30)
      setPlaces(uniquePlaces)
      setPlaceState(uniquePlaces.length ? "success" : "empty")
    } catch (error) {
      if (controller.signal.aborted) return
      setPlaces([])
      setPlaceError(error instanceof Error ? error.message : "주변 장소를 불러오지 못했습니다.")
      setPlaceState("error")
    }
  }, [activeCategories, center, query, radius])

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoState("error")
      return
    }
    setGeoState("loading")
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { label: "내 현재 위치", lat: position.coords.latitude, lng: position.coords.longitude }
        setCenter(next)
        setRegionQuery(next.label)
        setGeoState("idle")
        void runPlaceSearch(activeCategories, query, next)
      },
      (error) => setGeoState(error.code === 1 ? "denied" : "error"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 },
    )
  }

  const moveToRegion = async (next: Coordinates) => {
    setRegionCandidates([])
    setCenter(next)
    setRegionQuery(next.label)
    setRegionState("success")
    setRegionMessage(`${next.label} 중심으로 지도와 검색 반경을 이동했습니다.`)
    await runPlaceSearch(activeCategories, query, next, radius)
  }

  const runRegionSearch = async () => {
    const normalizedQuery = regionQuery.trim()
    if (normalizedQuery.length < 2) {
      setRegionState("error")
      setRegionMessage("전국 시·군·구·동 이름을 2자 이상 입력해 주세요.")
      return
    }
    regionRequestRef.current?.abort()
    const controller = new AbortController()
    regionRequestRef.current = controller
    setRegionState("loading")
    setRegionCandidates([])
    setRegionMessage("입력한 지역의 중심 좌표를 찾고 있습니다.")
    try {
      const result = await fetchRegions(normalizedQuery, controller.signal)
      if (controller.signal.aborted || regionRequestRef.current !== controller) return
      if (!result.items.length) {
        setRegionState("empty")
        setRegionMessage("일치하는 국내 지역이 없습니다. 시·군·구·동을 함께 입력해 보세요.")
        return
      }
      if (result.items.length > 1) {
        setRegionCandidates(result.items)
        setRegionState("success")
        setRegionMessage("검색할 지역을 선택해 주세요.")
        return
      }
      await moveToRegion(result.items[0])
    } catch (error) {
      if (controller.signal.aborted) return
      setRegionState("error")
      setRegionMessage(error instanceof Error ? error.message : "지역을 찾지 못했습니다.")
    }
  }

  const runBenefitSearch = async (nextQuery = benefitQuery) => {
    benefitRequestRef.current?.abort()
    const controller = new AbortController()
    benefitRequestRef.current = controller
    setBenefitQuery(nextQuery)
    setBenefitState("loading")
    try {
      const result = await fetchBenefits(nextQuery, controller.signal)
      if (controller.signal.aborted || benefitRequestRef.current !== controller) return
      setBenefits(result.items)
      setBenefitState(result.items.length ? (result.degraded ? "degraded" : "success") : "empty")
    } catch (error) {
      if (controller.signal.aborted) return
      setBenefits([])
      setBenefitState("error")
    }
  }

  useEffect(() => () => {
    requestRef.current?.abort()
    regionRequestRef.current?.abort()
    benefitRequestRef.current?.abort()
  }, [])

  useEffect(() => {
    if (!sourcesOpen) return
    const controller = new AbortController()
    void fetchDataSources(controller.signal).then((data) => setSources(data.items)).catch(() => setSources([]))
    return () => controller.abort()
  }, [sourcesOpen])

  const activeCategory = searchIntent
  const feedback = stateCopy(placeState, placeError)

  return (
    <main className="app-shell">
      <header className="topbar">
        <a href="#main-workspace" className="brand" aria-label="동네나침반 홈">
          <span className="brand-mark"><Navigation size={20} /></span>
          <span><strong>동네나침반</strong><small>오늘의 생활 반경</small></span>
        </a>
        <Tabs value={mode} onValueChange={setMode} aria-label="서비스 모드">
          <TabsList>
            <TabsTrigger value="explore"><Compass size={16} /> 주변 탐색</TabsTrigger>
            <TabsTrigger value="benefits"><Gift size={16} /> 정부 지원 정보</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="top-actions">
          <Button variant="ghost" size="sm" onClick={() => setSourcesOpen(true)}>
            <span className="status-dot" /> 연결 상태
          </Button>
        </div>
      </header>

      {mode === "explore" ? (
        <section id="main-workspace" className="explore-workspace">
          <aside className="workbench" aria-label="장소 탐색 도구">
            <div className="workbench-intro">
              <Badge>NEARBY / NOW</Badge>
              <h1>오늘, 어디로 갈까요?</h1>
              <p>위치와 목적만 고르면 가까운 순서대로 보여드려요.</p>
            </div>

            <div className="decision-ribbon" aria-label="현재 검색 조건">
              <span><small>WHERE</small><strong>{center.label}</strong></span>
              <ChevronRight size={15} />
              <span><small>WHAT</small><strong>{activeCategory}</strong></span>
              <ChevronRight size={15} />
              <span><small>RANGE</small><strong>{radius}km</strong></span>
            </div>

            <div className="location-row">
              <label className="field-label" htmlFor="region">탐색 기준</label>
              <form className="location-controls" onSubmit={(event) => { event.preventDefault(); void runRegionSearch() }}>
                <span className="region-input">
                  <Search size={16} />
                  <input
                    id="region"
                    value={regionQuery}
                    onChange={(event) => { setRegionQuery(event.target.value); setRegionCandidates([]) }}
                    placeholder="전국 시·군·구·동 검색"
                    aria-label="전국 지역 검색"
                    autoComplete="off"
                  />
                </span>
                <Button type="submit" disabled={regionState === "loading"}>
                  {regionState === "loading" ? <RefreshCw className="spin" size={16} /> : <MapPin size={16} />}
                  이동
                </Button>
                <Button type="button" variant="secondary" onClick={useMyLocation} disabled={geoState === "loading"}>
                  {geoState === "loading" ? <RefreshCw className="spin" size={16} /> : <LocateFixed size={16} />}
                  {geoState === "loading" ? "확인 중" : "내 위치"}
                </Button>
              </form>
              <p className={regionState === "error" || regionState === "empty" ? "inline-notice" : "region-hint"}>{regionMessage}</p>
              {regionCandidates.length ? (
                <div className="region-candidates" aria-label="지역 검색 결과">
                  {regionCandidates.map((candidate) => (
                    <button key={`${candidate.lat}-${candidate.lng}`} type="button" onClick={() => void moveToRegion(candidate)}>
                      <MapPin size={14} /><span>{candidate.label}</span><ChevronRight size={14} />
                    </button>
                  ))}
                </div>
              ) : null}
              {geoState === "denied" ? <p className="inline-notice">위치 권한이 꺼져 있습니다. 전국 지역 검색으로 계속 탐색할 수 있어요.</p> : null}
              {geoState === "error" ? <p className="inline-notice">현재 위치를 확인하지 못했습니다. 지역을 직접 검색해 주세요.</p> : null}
            </div>

            <form className="search-row" onSubmit={(event) => { event.preventDefault(); void runPlaceSearch("all", query) }}>
              <Search size={17} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="장소명이나 동네 키워드" aria-label="장소 검색어" />
              {query ? <button type="button" className="clear-button" onClick={() => setQuery("")} aria-label="검색어 지우기"><X size={15} /></button> : null}
              <Button size="sm" type="submit">검색</Button>
            </form>

            <div className="radius-row" aria-label="검색 반경">
              {[1, 3, 5].map((value) => (
                <button
                  key={value}
                  className={radius === value ? "radius active" : "radius"}
                  aria-pressed={radius === value}
                  onClick={() => {
                    setRadius(value)
                    void runPlaceSearch(activeCategories, query, center, value, searchIntent)
                  }}
                >
                  {value}km
                </button>
              ))}
            </div>

            <section className="compact-section">
              <div className="section-heading"><h2>바로 찾기</h2><span>목적 하나면 충분해요</span></div>
              <div className="category-grid">
                {CATEGORIES.map(({ id, label, icon: Icon }) => (
                  <button key={id} className={category === id ? "category active" : "category"} onClick={() => void runPlaceSearch(id, "")}>
                    <Icon size={17} /><span>{label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="compact-section">
              <div className="section-heading"><h2>동네에서 뭐 할까?</h2><span>상황별 빠른 결정</span></div>
              <div className="scenario-grid">
                {SCENARIOS.map(({ label, note, categories, radiusKm, icon: Icon }) => (
                  <button key={label} className="scenario" onClick={() => { setRadius(radiusKm); void runPlaceSearch(categories, "", center, radiusKm, label) }}>
                    <Icon size={18} /><span><strong>{label}</strong><small>{note}</small></span><ChevronRight size={15} />
                  </button>
                ))}
              </div>
            </section>

            <section className="results-section" aria-live="polite">
              <div className="section-heading">
                <h2>가까운 결과 <Badge>{places.length}</Badge></h2>
                {placeState === "success" ? <span>거리순</span> : null}
              </div>
              {placeWarning ? <p className="partial-notice">{placeWarning}</p> : null}
              {placeState === "idle" ? (
                <div className="empty-state"><MapPin size={24} /><strong>첫 목적을 골라보세요</strong><p>바로 찾기나 상황 카드를 누르면 결과가 여기에 나타납니다.</p></div>
              ) : null}
              {feedback ? (
                <div className={`empty-state ${placeState}`}>
                  {placeState === "loading" ? <RefreshCw className="spin" size={24} /> : <WifiOff size={24} />}
                  <strong>{feedback.title}</strong><p>{feedback.body}</p>
                  {placeState === "error" ? <Button variant="secondary" size="sm" onClick={() => void runPlaceSearch()}>다시 시도</Button> : null}
                </div>
              ) : null}
              {placeState === "success" ? (
                <div className="place-list">
                  {places.map((place, index) => (
                    <button key={place.id} className={selectedId === place.id ? "place-card selected" : "place-card"} onClick={() => setSelectedId(place.id)}>
                      <span className="place-index">{String(index + 1).padStart(2, "0")}</span>
                      <span className="place-copy"><strong>{place.name}</strong><small>{place.address}</small><em>{place.distanceKm.toFixed(1)}km · {place.category}</em></span>
                      <MapPin size={17} />
                    </button>
                  ))}
                </div>
              ) : null}
            </section>
          </aside>
          <MapCanvas center={center} radiusKm={radius} places={places} selectedId={selectedId} onSelect={(place) => setSelectedId(place.id)} />
        </section>
      ) : (
        <section id="main-workspace" className="benefit-workspace">
          <aside className="benefit-filter">
            <Badge>GOV SUPPORT GUIDE</Badge>
            <h1>공식 지원사업,<br />확인 경로부터 찾으세요.</h1>
            <p>입력한 주제와 관련된 공식 기관 안내·신청 경로를 연결합니다.</p>
            <label className="field-label" htmlFor="benefit-search">상황 또는 지원사업명</label>
            <form className="benefit-search" onSubmit={(event) => { event.preventDefault(); void runBenefitSearch() }}>
              <input id="benefit-search" value={benefitQuery} onChange={(event) => setBenefitQuery(event.target.value)} placeholder="예: 청년 창업, 소상공인" />
              <Button type="submit"><Search size={16} /> 찾기</Button>
            </form>
            <div className="benefit-presets">
              {BENEFIT_PRESETS.map((preset) => (
                <button key={preset.label} onClick={() => void runBenefitSearch(preset.label)}><span aria-hidden="true">{preset.emoji}</span><strong>{preset.label}</strong><ChevronRight size={15} /></button>
              ))}
            </div>
            <div className="official-note"><Building2 size={20} /><span><strong>공식 정보가 기준입니다</strong><small>신청 전 담당 기관의 최신 조건을 확인하세요.</small></span></div>
          </aside>
          <div className="benefit-results" aria-live="polite">
            <div className="benefit-title"><span><small>RESULTS</small><h2>{benefitState === "degraded" ? "공식 확인 경로" : "공식 지원사업 검색 결과"}</h2></span><Badge>{benefits.length}건</Badge></div>
            {benefitState === "idle" ? <div className="benefit-guide"><div><Gift size={32} /><h3>확인할 주제를 선택해 보세요</h3><p>관련 공식 지원사업과 확인 경로를 카드로 정리합니다.</p></div><ol><li><span>01</span><strong>주제 선택</strong><small>왼쪽에서 찾으려는 상황이나 사업을 고릅니다.</small></li><li><span>02</span><strong>공식 정보 확인</strong><small>지원 내용과 소관 기관을 카드에서 살펴봅니다.</small></li><li><span>03</span><strong>자격 조건 확인</strong><small>최종 신청 자격과 기간은 담당 기관에서 확인합니다.</small></li></ol></div> : null}
            {benefitState === "loading" ? <div className="benefit-grid">{[1,2,3,4,5,6].map((item) => <div key={item} className="benefit-skeleton" />)}</div> : null}
            {benefitState === "degraded" ? <div className="benefit-disclosure"><Building2 size={20} /><span><strong>공식 안내 링크를 보여드립니다</strong><small>현재 결과는 자격·소득·지역 조건을 검증한 맞춤 판정 결과가 아니라, 입력한 검색어와 관련된 공식 확인 경로입니다.</small></span></div> : null}
            {benefitState === "error" || benefitState === "empty" ? (
              <div className="benefit-recovery"><div className="recovery-lead"><WifiOff size={32} /><span><small>DEGRADED, NOT DEAD</small><h3>{benefitState === "empty" ? "조건에 맞는 혜택이 없습니다" : "혜택 데이터 연결이 준비 중입니다"}</h3><p>검색을 멈추지 않고 공식 경로에서 같은 조건으로 계속 확인할 수 있습니다.</p></span></div><div className="recovery-actions"><div><span>01</span><strong>검색 조건 유지</strong><small>선택한 “{benefitQuery || "현재 조건"}”을 기억하세요.</small></div><div><span>02</span><strong>정부24로 이동</strong><small>공식 혜택알리미에서 최신 정보를 확인합니다.</small></div><div><span>03</span><strong>담당 기관 확인</strong><small>신청 전 대상과 기간을 최종 확인합니다.</small></div></div><Button asChild><a href="https://plus.gov.kr/" target="_blank" rel="noreferrer">정부24에서 계속 찾기 <ChevronRight size={16} /></a></Button></div>
            ) : null}
            {benefitState === "success" || benefitState === "degraded" ? (
              <div className="benefit-grid">
                {benefits.map((benefit) => (
                  <Card key={benefit.id}>
                    <CardHeader><Badge>{benefit.supportType || benefit.serviceField || "정부 지원"}</Badge><h3>{benefit.name}</h3></CardHeader>
                    <CardContent><p>{benefit.summary || benefit.target || "상세 지원 조건을 확인해 주세요."}</p><span>{benefit.agency || "소관 기관"}</span>{benefit.detailUrl ? <Button asChild variant="secondary" size="sm"><a href={benefit.detailUrl} target="_blank" rel="noreferrer">상세 확인 <ChevronRight size={14} /></a></Button> : null}</CardContent>
                  </Card>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      )}

      {sourcesOpen ? (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setSourcesOpen(false)}>
          <section className="status-dialog" role="dialog" aria-modal="true" aria-labelledby="status-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="dialog-title"><span><small>SOURCE HEALTH</small><h2 id="status-title">서비스 연결 상태</h2></span><Button variant="ghost" size="icon" aria-label="닫기" onClick={() => setSourcesOpen(false)}><X size={18} /></Button></div>
            <p>장소 탐색은 별도 키 없이 동작합니다. 공공 데이터는 연결 여부에 따라 보조 기능으로 제공됩니다.</p>
            <div className="source-list">
              <div><span className="source-icon ready"><Check size={15} /></span><span><strong>OpenStreetMap 장소 탐색</strong><small>기본 지도와 주변 장소</small></span><Badge>사용 가능</Badge></div>
              {sources.map((source) => {
                const planned = source.status === "planned"
                const description = planned ? "아직 제공되지 않는 기능" : source.configured ? "연결 설정됨" : "선택 연동 · 미설정"
                const badge = planned ? "도입 예정" : source.configured ? "연결됨" : "미설정"
                return <div key={source.id}><span className={source.configured ? "source-icon ready" : "source-icon"}>{source.configured ? <Check size={15} /> : planned ? <Sparkles size={15} /> : <X size={15} />}</span><span><strong>{source.label || source.id}</strong><small>{description}</small></span><Badge>{badge}</Badge></div>
              })}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  )
}
