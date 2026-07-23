const test = require("node:test");
const assert = require("node:assert/strict");
const { CafeApiError, parseRequest, fetchNearbyCafes, normalizeCafes } = require("../services/semas-cafes");

test("Vaccine Test V1: lat, lng, radiusKm, limit에 무효 파라미터(문자열/NaN) 주입 시 400 에러로 치료된다", () => {
  assert.throws(
    () => parseRequest({ lat: "invalid_lat", lng: "126.9780" }),
    (err) => err instanceof CafeApiError && err.status === 400 && err.code === "INVALID_LOCATION"
  );

  assert.throws(
    () => parseRequest({ lat: "37.5665", lng: "invalid_lng" }),
    (err) => err instanceof CafeApiError && err.status === 400 && err.code === "INVALID_LOCATION"
  );

  assert.throws(
    () => parseRequest({ radiusKm: "abc_radius" }),
    (err) => err instanceof CafeApiError && err.status === 400 && err.code === "INVALID_RADIUS"
  );

  assert.throws(
    () => parseRequest({ radiusKm: "10" }),
    (err) => err instanceof CafeApiError && err.status === 400 && err.code === "INVALID_RADIUS"
  );

  assert.throws(
    () => parseRequest({ limit: "not_a_number" }),
    (err) => err instanceof CafeApiError && err.status === 400 && err.code === "INVALID_LIMIT"
  );
});

test("Vaccine Test V2: 공공 API가 비정상 HTML/XML 오류 응답을 반환할 때 502 에러로 안전하게 포획된다", async () => {
  const fakeFetchHtmlError = async () => ({
    ok: false,
    status: 500,
    text: async () => "<html><body>500 Internal Server Error</body></html>"
  });

  await assert.rejects(
    async () => fetchNearbyCafes({}, "FAKE_KEY", fakeFetchHtmlError),
    (err) => err instanceof CafeApiError && err.status === 502 && err.code === "PUBLIC_API_ERROR"
  );
});

test("Vaccine Test V2-2: 공공 API 응답이 status 200이지만 깨진 JSON(HTML)일 때 502로 예외 처리된다", async () => {
  const fakeFetchBrokenJson = async () => ({
    ok: true,
    status: 200,
    text: async () => "<html>Service Unavailable</body></html>"
  });

  await assert.rejects(
    async () => fetchNearbyCafes({}, "FAKE_KEY", fakeFetchBrokenJson),
    (err) => err instanceof CafeApiError && err.status === 502 && err.code === "PUBLIC_API_ERROR"
  );
});

test("Vaccine Test V3: 악성 XSS 텍스트가 유입될 때 데이터 구조를 붕괴시키지 않고 문자열로 정규화된다", () => {
  const maliciousPayload = {
    body: {
      items: [
        {
          bizesId: "xss-01",
          bizesNm: "<script>alert('xss')</script> 악성 카페",
          indsSclsNm: "커피전문점/카페",
          rdnmAdr: "<img src=x onerror=alert(1)> 서울시 강남구",
          lat: "37.5665",
          lon: "126.9780"
        }
      ]
    }
  };

  const result = normalizeCafes(maliciousPayload, { latitude: 37.5665, longitude: 126.9780, limit: 10, queryText: "" });
  assert.equal(result.length, 1);
  assert.equal(typeof result[0].name, "string");
  assert.equal(result[0].name.includes("<script>"), true);
});
