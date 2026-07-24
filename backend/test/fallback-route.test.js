const test = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
delete process.env.MOIS_PUBLIC_SERVICE_API_KEY;
const { app } = require("../server");

async function withServer(t, callback) {
  const server = app.listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  return callback(`http://127.0.0.1:${port}`);
}

test("혜택 인증키가 없는 실제 라우트도 공식 카드로 200을 반환한다", async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/benefits?q=${encodeURIComponent("소상공인")}&limit=24`);
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.degraded, true);
    assert.ok(Array.isArray(payload.items));
    assert.ok(payload.items.length >= 2);
    assert.equal(JSON.stringify(payload).includes("serviceKey"), false);
  });
});

test("전국 지역 검색의 무효 입력은 외부 호출 전에 400으로 차단한다", async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/geocode?q=${encodeURIComponent("서")}`);
    const payload = await response.json();
    assert.equal(response.status, 400);
    assert.equal(payload.error.code, "INVALID_REGION_QUERY");
  });
});
