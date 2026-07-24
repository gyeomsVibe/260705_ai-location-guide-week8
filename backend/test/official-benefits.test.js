const test = require("node:test");
const assert = require("node:assert/strict");
const { getOfficialBenefits } = require("../services/official-benefits");

test("API 키가 없어도 네 가지 빠른 탐색은 공식 카드와 링크를 반환한다", () => {
  for (const query of ["1인 창조기업", "소상공인", "예비창업", "신규 창업"]) {
    const result = getOfficialBenefits({ q: query, limit: "24" });
    assert.equal(result.degraded, true);
    assert.ok(result.items.length >= 2, `${query} 공식 카드가 부족합니다.`);
    assert.ok(result.items.every((item) => item.detailUrl.startsWith("https://")));
  }
});

test("일치하지 않는 검색어도 공식 통합 탐색 경로를 잃지 않는다", () => {
  const result = getOfficialBenefits({ q: "존재하지않는혜택검색어" });
  assert.ok(result.items.some((item) => item.id === "government24-benefits"));
  assert.ok(result.items.some((item) => item.id === "kstartup-programs"));
});
