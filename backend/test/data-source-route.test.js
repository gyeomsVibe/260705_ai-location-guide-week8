const test = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
process.env.MOIS_PUBLIC_SERVICE_API_KEY = "route-contract-test-secret";
const { app } = require("../server");

test("데이터 소스 공개 경로는 items 배열을 반환하고 인증키를 노출하지 않는다", async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once("listening", resolve));

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/data-sources`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(payload.items));
  assert.equal(JSON.stringify(payload).includes("route-contract-test-secret"), false);
});

test("기존 데이터 소스 상태 경로는 호환 별칭으로 유지된다", async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once("listening", resolve));

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/data-source-status`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(payload.items));
});
