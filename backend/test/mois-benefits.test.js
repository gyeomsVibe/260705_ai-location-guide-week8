const test = require("node:test");
const assert = require("node:assert/strict");
const { BenefitApiError, fetchBenefits, normalizeBenefits, parseBenefitRequest } = require("../services/mois-benefits");

test("혜택 요청은 5건 기본값과 정리된 검색 조건을 사용한다", () => {
  assert.deepEqual(parseBenefitRequest({ q: "  창업 지원  ", userType: "소상공인" }), {
    page: 1,
    limit: 5,
    queryText: "창업 지원",
    organization: "",
    userType: "소상공인",
    serviceField: ""
  });
});

test("잘못된 페이지와 limit는 외부 호출 전에 거부한다", () => {
  assert.throws(() => parseBenefitRequest({ page: "0" }), { code: "INVALID_PAGE" });
  assert.throws(() => parseBenefitRequest({ limit: "five" }), { code: "INVALID_LIMIT" });
});

test("행안부 원본 필드를 정규화하고 중복·불완전 항목을 제거한다", () => {
  const items = normalizeBenefits({ data: [
    { 서비스ID: "benefit-1", 서비스명: "초기창업 지원", 지원대상: "예비창업자", 소관기관명: "테스트 기관" },
    { 서비스ID: "benefit-1", 서비스명: "중복 혜택" },
    { 서비스ID: "", 서비스명: "식별자 없는 혜택" }
  ] }, 5);
  assert.equal(items.length, 1);
  assert.equal(items[0].name, "초기창업 지원");
  assert.equal(items[0].agency, "테스트 기관");
});

test("혜택 API 결과에는 인증키가 포함되지 않는다", async () => {
  let requestedUrl;
  const fakeFetch = async (url) => {
    requestedUrl = url;
    return { ok: true, status: 200, text: async () => JSON.stringify({ page: 1, matchCount: 1, data: [
      { 서비스ID: "benefit-1", 서비스명: "테스트 혜택" }
    ] }) };
  };
  const result = await fetchBenefits({ limit: "5", q: "창업" }, "FAKE_KEY", fakeFetch);
  assert.equal(requestedUrl.searchParams.get("perPage"), "5");
  assert.equal(requestedUrl.searchParams.get("cond[서비스명::LIKE]"), "창업");
  assert.equal(result.count, 1);
  assert.equal(JSON.stringify(result).includes("FAKE_KEY"), false);
});

test("인증 실패와 깨진 JSON은 안전한 오류로 변환한다", async () => {
  const unauthorized = async () => ({ ok: false, status: 401, text: async () => "Unauthorized" });
  await assert.rejects(() => fetchBenefits({}, "FAKE_KEY", unauthorized),
    (error) => error instanceof BenefitApiError && error.code === "BENEFIT_API_AUTH_ERROR");
  const invalidJson = async () => ({ ok: true, status: 200, text: async () => "<html>오류</html>" });
  await assert.rejects(() => fetchBenefits({}, "FAKE_KEY", invalidJson),
    (error) => error instanceof BenefitApiError && error.code === "BENEFIT_API_INVALID_RESPONSE");
});
