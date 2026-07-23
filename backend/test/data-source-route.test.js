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

test("헬스 경로는 준비 상태와 비밀값 없는 기능 상태를 반환한다", async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once("listening", resolve));

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/health`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.status, "ready");
  assert.equal(payload.capabilities.places, "available");
  assert.ok(Array.isArray(payload.capabilities.optionalDataSources));
  assert.equal(JSON.stringify(payload).includes("route-contract-test-secret"), false);
});

test("공개 응답에는 기본 보안 헤더가 적용된다", async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once("listening", resolve));

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/health`);

  assert.match(response.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.match(response.headers.get("permissions-policy"), /geolocation=\(self\)/);
});
