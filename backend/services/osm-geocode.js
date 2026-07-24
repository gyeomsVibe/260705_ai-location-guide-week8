const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

class GeocodeApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "GeocodeApiError";
    this.status = status;
    this.code = code;
  }
}

function parseGeocodeRequest(query = {}) {
  const queryText = typeof query.q === "string" ? query.q.trim().slice(0, 80) : "";
  const limitValue = query.limit === undefined ? 5 : Number(query.limit);
  if (queryText.length < 2) {
    throw new GeocodeApiError(400, "INVALID_REGION_QUERY", "전국 시·군·구·동 이름을 2자 이상 입력해 주세요.");
  }
  if (!Number.isInteger(limitValue) || limitValue < 1 || limitValue > 8) {
    throw new GeocodeApiError(400, "INVALID_GEOCODE_LIMIT", "지역 검색 결과 개수는 1개에서 8개 사이여야 합니다.");
  }
  return { queryText, limit: limitValue };
}

function buildGeocodeUrl(request) {
  const endpoint = new URL(NOMINATIM_URL);
  endpoint.searchParams.set("format", "jsonv2");
  endpoint.searchParams.set("q", request.queryText);
  endpoint.searchParams.set("countrycodes", "kr");
  endpoint.searchParams.set("accept-language", "ko");
  endpoint.searchParams.set("addressdetails", "1");
  endpoint.searchParams.set("limit", String(request.limit));
  return endpoint;
}

function normalizeGeocodeResults(payload, limit = 5) {
  if (!Array.isArray(payload)) {
    throw new GeocodeApiError(502, "GEOCODE_INVALID_RESPONSE", "지역 검색 응답 형식이 올바르지 않습니다.");
  }
  const seen = new Set();
  return payload.flatMap((item) => {
    const lat = Number(item?.lat);
    const lng = Number(item?.lon);
    const displayName = String(item?.display_name || "").trim();
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !displayName) return [];
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{
      label: displayName.split(",").slice(0, 3).map((part) => part.trim()).join(" · "),
      lat,
      lng,
    }];
  }).slice(0, limit);
}

async function geocodeKoreanRegion(query, fetchImpl = fetch) {
  const request = parseGeocodeRequest(query);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetchImpl(buildGeocodeUrl(request), {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "ai-location-guide/2.0 (educational local discovery service)",
      },
    });
    if (!response.ok) {
      throw new GeocodeApiError(502, "GEOCODE_UPSTREAM_ERROR", "지역 검색 연결이 원활하지 않습니다.");
    }
    const items = normalizeGeocodeResults(await response.json(), request.limit);
    return { items, count: items.length, attribution: "© OpenStreetMap contributors" };
  } catch (error) {
    if (error instanceof GeocodeApiError) throw error;
    if (error?.name === "AbortError") {
      throw new GeocodeApiError(504, "GEOCODE_TIMEOUT", "지역 검색 응답이 지연되고 있습니다.");
    }
    throw new GeocodeApiError(502, "GEOCODE_UPSTREAM_ERROR", "지역 검색 연결이 원활하지 않습니다.");
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  GeocodeApiError,
  buildGeocodeUrl,
  geocodeKoreanRegion,
  normalizeGeocodeResults,
  parseGeocodeRequest,
};
