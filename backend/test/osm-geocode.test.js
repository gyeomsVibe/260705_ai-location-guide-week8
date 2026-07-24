const test = require("node:test");
const assert = require("node:assert/strict");
const {
  GeocodeApiError,
  buildGeocodeUrl,
  geocodeKoreanRegion,
  normalizeGeocodeResults,
  parseGeocodeRequest,
} = require("../services/osm-geocode");

test("전국 지역 검색은 국내 범위와 결과 제한을 강제한다", () => {
  const request = parseGeocodeRequest({ q: "  제주특별자치도 제주시  ", limit: "5" });
  const url = buildGeocodeUrl(request);
  assert.equal(request.queryText, "제주특별자치도 제주시");
  assert.equal(url.searchParams.get("countrycodes"), "kr");
  assert.equal(url.searchParams.get("q"), "제주특별자치도 제주시");
  assert.equal(url.searchParams.get("limit"), "5");
});

test("짧은 검색어와 과도한 결과 개수는 400으로 거부한다", () => {
  assert.throws(() => parseGeocodeRequest({ q: "서" }), (error) => error instanceof GeocodeApiError && error.code === "INVALID_REGION_QUERY");
  assert.throws(() => parseGeocodeRequest({ q: "서울", limit: "99" }), (error) => error instanceof GeocodeApiError && error.code === "INVALID_GEOCODE_LIMIT");
});

test("좌표가 깨진 지오코딩 항목은 제거하고 중복 좌표를 합친다", () => {
  const items = normalizeGeocodeResults([
    { lat: "33.4996", lon: "126.5312", display_name: "제주시, 제주특별자치도, 대한민국" },
    { lat: "33.4996", lon: "126.5312", display_name: "중복" },
    { lat: "NaN", lon: "126", display_name: "깨진 항목" },
  ]);
  assert.deepEqual(items, [{ label: "제주시 · 제주특별자치도 · 대한민국", lat: 33.4996, lng: 126.5312 }]);
});

test("외부 지오코딩 실패와 깨진 응답을 안전한 오류로 변환한다", async () => {
  await assert.rejects(
    () => geocodeKoreanRegion({ q: "제주시" }, async () => ({ ok: false })),
    (error) => error instanceof GeocodeApiError && error.code === "GEOCODE_UPSTREAM_ERROR",
  );
  await assert.rejects(
    () => geocodeKoreanRegion({ q: "제주시" }, async () => ({ ok: true, json: async () => ({ broken: true }) })),
    (error) => error instanceof GeocodeApiError && error.code === "GEOCODE_INVALID_RESPONSE",
  );
});
