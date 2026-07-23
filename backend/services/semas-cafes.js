const SEMAS_RADIUS_ENDPOINT = "https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInRadius";
const DEFAULT_CENTER = { latitude: 37.5665, longitude: 126.9780 };
const ALLOWED_RADIUS_KM = new Set([1, 3, 5]);
const MAX_PUBLIC_API_PAGES = 3;

class CafeApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function parseNumber(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function parseRequest(query = {}) {
  const requestedLatitude = parseNumber(query.lat);
  const requestedLongitude = parseNumber(query.lng);

  if (Number.isNaN(requestedLatitude) || Number.isNaN(requestedLongitude)) {
    throw new CafeApiError(400, "INVALID_LOCATION", "위도 또는 경도 값이 올바르지 않습니다.");
  }

  const latitude = requestedLatitude ?? DEFAULT_CENTER.latitude;
  const longitude = requestedLongitude ?? DEFAULT_CENTER.longitude;

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new CafeApiError(400, "INVALID_LOCATION", "위도 또는 경도 범위가 올바르지 않습니다.");
  }

  const requestedRadius = parseNumber(query.radiusKm);
  if (Number.isNaN(requestedRadius)) {
    throw new CafeApiError(400, "INVALID_RADIUS", "반경은 1km, 3km, 5km 중에서 선택해야 합니다.");
  }

  const radiusKm = requestedRadius ?? 1;
  if (!ALLOWED_RADIUS_KM.has(radiusKm)) {
    throw new CafeApiError(400, "INVALID_RADIUS", "반경은 1km, 3km, 5km 중에서 선택해야 합니다.");
  }

  const requestedLimit = parseNumber(query.limit);
  if (Number.isNaN(requestedLimit)) {
    throw new CafeApiError(400, "INVALID_LIMIT", "limit 값은 수치여야 합니다.");
  }

  const limit = Math.min(Math.max(Math.floor(requestedLimit ?? 20), 1), 50);
  const queryText = typeof query.q === "string" ? query.q.trim().slice(0, 60) : "";

  return { latitude, longitude, radiusKm, limit, queryText };
}

function calculateDistanceKm(latitudeA, longitudeA, latitudeB, longitudeB) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(latitudeB - latitudeA);
  const longitudeDelta = toRadians(longitudeB - longitudeA);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(latitudeA)) * Math.cos(toRadians(latitudeB)) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function extractItems(payload) {
  const candidates = [
    payload?.body?.items?.item,
    payload?.body?.items,
    payload?.items?.item,
    payload?.items,
    payload?.data
  ];
  const items = candidates.find((candidate) => Array.isArray(candidate));
  return items || [];
}

function toCafeItem(item, center) {
  const latitude = parseNumber(item.lat ?? item.latitude ?? item.y);
  const longitude = parseNumber(item.lon ?? item.lng ?? item.longitude ?? item.x);
  const name = String(item.bizesNm ?? item.storeName ?? item.name ?? "").trim();
  const industryLabels = [item.indsSclsNm, item.indsMclsNm, item.indsLclsNm, item.category]
    .filter(Boolean)
    .map((label) => String(label).trim())
    .filter(Boolean);
  const cafeCategory = industryLabels.find((label) => /(카페|커피|음료|coffee)/i.test(label));
  const address = String(item.rdnmAdr ?? item.lnoAdr ?? item.address ?? "").trim();

  if (!name || latitude === undefined || longitude === undefined || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  // 표준산업분류명만으로는 슈퍼마켓 같은 비카페 업소가 음료 업종으로 오인될 수 있으므로,
  // 실제 상권 업종명 필드에서만 카페·커피·음료를 판정한다.
  if (!cafeCategory) {
    return null;
  }

  return {
    id: String(item.bizesId ?? item.id ?? `${name}-${latitude}-${longitude}`),
    name,
    category: cafeCategory,
    address: address || "주소 정보 없음",
    latitude,
    longitude,
    distanceKm: Number(calculateDistanceKm(center.latitude, center.longitude, latitude, longitude).toFixed(2))
  };
}

function normalizeCafes(payload, request) {
  const seen = new Set();
  const keyword = request.queryText.toLocaleLowerCase("ko-KR");

  return extractItems(payload)
    .map((item) => toCafeItem(item, request))
    .filter(Boolean)
    .filter((item) => {
      const duplicateKey = `${item.id}|${item.name}|${item.latitude}|${item.longitude}`;
      if (seen.has(duplicateKey)) return false;
      seen.add(duplicateKey);
      if (!keyword) return true;
      return `${item.name} ${item.category} ${item.address}`.toLocaleLowerCase("ko-KR").includes(keyword);
    })
    .sort((left, right) => left.distanceKm - right.distanceKm)
    .slice(0, request.limit);
}

function throwIfPublicApiError(payload) {
  const resultCode = String(payload?.header?.resultCode ?? payload?.response?.header?.resultCode ?? "00");
  if (resultCode !== "00") {
    throw new CafeApiError(502, "PUBLIC_API_ERROR", "카페 데이터를 불러오지 못했습니다.");
  }
}

async function fetchNearbyCafes(query, serviceKey, fetchImpl = fetch) {
  const request = parseRequest(query);
  const endpoint = new URL(SEMAS_RADIUS_ENDPOINT);
  endpoint.searchParams.set("ServiceKey", serviceKey);
  endpoint.searchParams.set("radius", String(request.radiusKm * 1000));
  endpoint.searchParams.set("cx", String(request.longitude));
  endpoint.searchParams.set("cy", String(request.latitude));
  endpoint.searchParams.set("pageNo", "1");
  endpoint.searchParams.set("numOfRows", "100");
  endpoint.searchParams.set("type", "json");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const collectedItems = [];

    for (let pageNo = 1; pageNo <= MAX_PUBLIC_API_PAGES; pageNo += 1) {
      endpoint.searchParams.set("pageNo", String(pageNo));
      const response = await fetchImpl(endpoint, { signal: controller.signal, headers: { Accept: "application/json" } });
      const responseText = await response.text();
      if (!response.ok) {
        throw new CafeApiError(502, "PUBLIC_API_ERROR", "카페 데이터를 불러오지 못했습니다.");
      }

      let payload;
      try {
        payload = JSON.parse(responseText);
      } catch {
        throw new CafeApiError(502, "PUBLIC_API_ERROR", "카페 데이터를 불러오지 못했습니다.");
      }

      throwIfPublicApiError(payload);
      const pageItems = extractItems(payload);
      if (pageItems.length === 0) break;
      collectedItems.push(...pageItems);

      const cafes = normalizeCafes({ body: { items: collectedItems } }, request);
      if (cafes.length >= request.limit) {
        return { items: cafes, count: cafes.length };
      }
    }

    const items = normalizeCafes({ body: { items: collectedItems } }, request);
    return { items, count: items.length };
  } catch (error) {
    if (error instanceof CafeApiError) throw error;
    throw new CafeApiError(502, "PUBLIC_API_ERROR", "카페 데이터를 불러오지 못했습니다.");
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { CafeApiError, fetchNearbyCafes, normalizeCafes, parseRequest };