const test = require("node:test");
const assert = require("node:assert/strict");
const { createNominatimClient } = require("../services/nominatim-client");

test("Nominatim 요청을 직렬화하고 시작 간격을 1초 이상 유지한다", async () => {
  let clock = 0;
  const starts = [];
  const client = createNominatimClient({
    minIntervalMs: 1000,
    cacheTtlMs: 5000,
    now: () => clock,
    sleep: async (milliseconds) => { clock += milliseconds; },
  });
  const fetchImpl = async (url) => {
    starts.push({ url: String(url), at: clock });
    return { ok: true, status: 200, json: async () => [{ place_id: starts.length }] };
  };

  const first = client.request("https://nominatim.test/search?q=seoul", { fetchImpl });
  const second = client.request("https://nominatim.test/search?q=busan", { fetchImpl });
  await Promise.all([first, second]);

  assert.deepEqual(starts.map((entry) => entry.at), [0, 1000]);
});

test("동일 질의는 TTL 동안 외부 요청 없이 캐시를 재사용한다", async () => {
  let clock = 0;
  let calls = 0;
  const client = createNominatimClient({
    minIntervalMs: 1000,
    cacheTtlMs: 5000,
    now: () => clock,
    sleep: async (milliseconds) => { clock += milliseconds; },
  });
  const fetchImpl = async () => {
    calls += 1;
    return { ok: true, status: 200, json: async () => [{ place_id: calls }] };
  };

  const first = await client.request("https://nominatim.test/search?q=seoul", { fetchImpl });
  clock += 100;
  const cached = await client.request("https://nominatim.test/search?q=seoul", { fetchImpl });

  assert.equal(calls, 1);
  assert.deepEqual(cached.payload, first.payload);
  assert.equal(cached.fromCache, true);
});
