const test = require("node:test");
const assert = require("node:assert/strict");
const { PlaceApiError, buildNominatimUrl, buildOverpassQuery, fetchNearbyPlaces, normalizePlaces, parsePlaceRequest } = require("../services/osm-places");

test("장소 요청은 위치·반경·분류를 제한한다", () => {
  const parsed = parsePlaceRequest({ lat: "37.5", lng: "127", radiusKm: "3", category: "cafe" });
  assert.equal(parsed.category, "cafe");
  assert.match(buildOverpassQuery(parsed), /amenity/);
  assert.match(buildNominatimUrl(parsed).toString(), /bounded=1/);
  assert.throws(
    () => parsePlaceRequest({ lat: "999", lng: "127" }),
    (error) => error instanceof PlaceApiError && error.code === "INVALID_LOCATION",
  );
  assert.throws(
    () => parsePlaceRequest({ category: "<script>" }),
    (error) => error instanceof PlaceApiError && error.code === "INVALID_CATEGORY",
  );
});

test("OpenStreetMap 응답을 거리순 장소 계약으로 정규화한다", () => {
  const request = parsePlaceRequest({ lat: 37.5665, lng: 126.978, category: "cafe" });
  const items = normalizePlaces({ elements: [
    { type: "node", id: 1, lat: 37.567, lon: 126.979, tags: { name: "테스트 카페", amenity: "cafe" } },
    { type: "way", id: 2, center: { lat: 37.57, lon: 126.98 }, tags: { name: "두 번째 카페", amenity: "cafe" } },
  ] }, request);
  assert.equal(items.length, 2);
  assert.equal(items[0].name, "테스트 카페");
  assert.ok(items[0].distanceKm <= items[1].distanceKm);
});

test("빠른 장소 검색 실패 시 보조 공개 서버로 폴백한다", async () => {
  let calls = 0;
  const fakeFetch = async () => {
    calls += 1;
    if (calls === 1) return { ok: false, status: 502 };
    return {
      ok: true,
      json: async () => ({ elements: [
        { type: "node", id: 7, lat: 37.567, lon: 126.979, tags: { name: "폴백 카페", amenity: "cafe" } },
      ] }),
    };
  };
  const result = await fetchNearbyPlaces({ category: "cafe" }, fakeFetch);
  assert.equal(calls, 2);
  assert.equal(result.items[0].name, "폴백 카페");
});

test("빠른 장소 검색이 200 빈 배열이어도 보조 검색으로 폴백한다", async () => {
  let calls = 0;
  const fakeFetch = async () => {
    calls += 1;
    if (calls === 1) return { ok: true, json: async () => [] };
    return {
      ok: true,
      json: async () => ({ elements: [
        { type: "node", id: 8, lat: 37.567, lon: 126.979, tags: { name: "보조 헬스장", leisure: "fitness_centre" } },
      ] }),
    };
  };
  const result = await fetchNearbyPlaces({ category: "gym" }, fakeFetch);
  assert.equal(calls, 2);
  assert.equal(result.items[0].name, "보조 헬스장");
});
