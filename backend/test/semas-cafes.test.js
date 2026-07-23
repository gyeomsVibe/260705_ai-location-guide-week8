const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeCafes, parseRequest } = require("../services/semas-cafes");

test("요청 기본값은 서울 중심 1km와 안전한 limit를 사용한다", () => {
  assert.deepEqual(parseRequest({ limit: "5" }), {
    latitude: 37.5665,
    longitude: 126.978,
    radiusKm: 1,
    limit: 5,
    queryText: ""
  });
});

test("카페 데이터만 정규화하고 좌표 없는 항목과 중복 항목을 제거한다", () => {
  const request = parseRequest({ lat: "37.5665", lng: "126.9780", limit: "5" });
  const payload = {
    body: {
      items: [
        { bizesId: "cafe-1", bizesNm: "테스트 카페", indsMclsNm: "커피점/카페", rdnmAdr: "서울 중구", lat: "37.5665", lon: "126.9780" },
        { bizesId: "cafe-1", bizesNm: "테스트 카페", indsMclsNm: "커피점/카페", rdnmAdr: "서울 중구", lat: "37.5665", lon: "126.9780" },
        { bizesId: "store-2", bizesNm: "음료 상점", indsMclsNm: "음료", rdnmAdr: "서울 중구", lat: "", lon: "126.9780" },
        { bizesId: "store-3", bizesNm: "음료를 파는 슈퍼", indsMclsNm: "슈퍼마켓", indsSclsNm: "슈퍼마켓", ksicNm: "비알코올 음료점업", rdnmAdr: "서울 중구", lat: "37.5670", lon: "126.9780" }
      ]
    }
  };

  const cafes = normalizeCafes(payload, request);
  assert.equal(cafes.length, 1);
  assert.equal(cafes[0].name, "테스트 카페");
  assert.equal(cafes[0].distanceKm, 0);
});

test("허용되지 않은 반경은 요청 전에 거부한다", () => {
  assert.throws(() => parseRequest({ radiusKm: "2" }), { code: "INVALID_RADIUS" });
});