const test = require("node:test");
const assert = require("node:assert/strict");
const { createDataSourceMonitor } = require("../services/data-source-status");

test("데이터 소스 상태는 인증키 값을 노출하지 않고 설정 여부만 반환한다", () => {
  const secret = "절대로-노출되면-안되는-테스트키";
  const monitor = createDataSourceMonitor({ MOIS_PUBLIC_SERVICE_API_KEY: secret, SEMAS_STORE_API_KEY: "" });
  const snapshot = monitor.snapshot();
  assert.equal(snapshot.find((item) => item.id === "moisBenefits").configured, true);
  assert.equal(snapshot.find((item) => item.id === "semasStores").configured, false);
  assert.equal(JSON.stringify(snapshot).includes(secret), false);
});

test("연결 실패 후에도 마지막 성공 시각을 보존한다", () => {
  const timestamps = [new Date("2026-07-24T00:00:00.000Z"), new Date("2026-07-24T01:00:00.000Z")];
  const monitor = createDataSourceMonitor({ MOIS_PUBLIC_SERVICE_API_KEY: "configured" }, () => timestamps.shift());
  monitor.recordSuccess("moisBenefits");
  monitor.recordFailure("moisBenefits", "BENEFIT_API_TIMEOUT");
  const source = monitor.snapshot().find((item) => item.id === "moisBenefits");
  assert.equal(source.verificationStatus, "failed");
  assert.equal(source.lastSuccessAt, "2026-07-24T00:00:00.000Z");
  assert.equal(source.lastErrorCode, "BENEFIT_API_TIMEOUT");
});
