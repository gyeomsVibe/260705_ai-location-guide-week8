const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_TERMS = {
  all: "amenity",
  restaurant: "restaurant",
  cafe: "cafe",
  gym: "fitness centre",
  park: "park",
  hospital: "hospital",
  pharmacy: "pharmacy",
};

class PlaceApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "PlaceApiError";
    this.status = status;
    this.code = code;
  }
}

const CATEGORY_FILTERS = {
  all: '["name"]["amenity"~"restaurant|cafe|hospital|clinic|pharmacy|bank|community_centre",i]',
  restaurant: '["amenity"~"restaurant|fast_food|food_court",i]',
  cafe: '["amenity"="cafe"]',
  gym: '["leisure"="fitness_centre"]',
  park: '["leisure"~"park|garden",i]',
  hospital: '["amenity"~"hospital|clinic",i]',
  pharmacy: '["amenity"="pharmacy"]',
};

function numberInRange(value, fallback, minimum, maximum) {
  const parsed = value === undefined ? fallback : Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : NaN;
}

function parsePlaceRequest(query = {}) {
  const latitude = numberInRange(query.lat, 37.5665, -90, 90);
  const longitude = numberInRange(query.lng, 126.978, -180, 180);
  const radiusKm = numberInRange(query.radiusKm, 3, 0.2, 5);
  const limit = numberInRange(query.limit, 24, 1, 40);
  const category = String(query.category || "all").toLowerCase();
  const queryText = String(query.q || "").trim().slice(0, 60);

  if ([latitude, longitude].some(Number.isNaN)) {
    throw new PlaceApiError(400, "INVALID_LOCATION", "위치 좌표가 올바르지 않습니다.");
  }
  if (Number.isNaN(radiusKm)) {
    throw new PlaceApiError(400, "INVALID_RADIUS", "검색 반경은 0.2km에서 5km 사이여야 합니다.");
  }
  if (Number.isNaN(limit)) {
    throw new PlaceApiError(400, "INVALID_LIMIT", "결과 개수는 1개에서 40개 사이여야 합니다.");
  }
  if (!Object.hasOwn(CATEGORY_FILTERS, category)) {
    throw new PlaceApiError(400, "INVALID_CATEGORY", "지원하지 않는 장소 분류입니다.");
  }
  return { latitude, longitude, radiusKm, limit: Math.floor(limit), category, queryText };
}

function buildOverpassQuery(request) {
  const radius = Math.round(request.radiusKm * 1000);
  const filter = CATEGORY_FILTERS[request.category];
  return `[out:json][timeout:15];nwr(around:${radius},${request.latitude},${request.longitude})${filter};out center tags qt;`;
}

function haversineKm(aLat, aLng, bLat, bLng) {
  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const value = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function normalizePlaces(payload, request) {
  const items = Array.isArray(payload?.elements) ? payload.elements : [];
  const seen = new Set();
  const keyword = request.queryText.toLocaleLowerCase("ko-KR");

  return items.flatMap((element) => {
    const lat = Number(element.lat ?? element.center?.lat);
    const lng = Number(element.lon ?? element.center?.lon);
    const tags = element.tags || {};
    const name = String(tags["name:ko"] || tags.name || "이름 없는 장소").trim();
    const address = [tags["addr:city"], tags["addr:district"], tags["addr:street"], tags["addr:housenumber"]]
      .filter(Boolean)
      .join(" ");
    const category = String(tags.amenity || tags.leisure || tags.shop || request.category);
    const haystack = `${name} ${address} ${category}`.toLocaleLowerCase("ko-KR");
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (keyword && !haystack.includes(keyword))) return [];
    const id = `${element.type}-${element.id}`;
    if (seen.has(id)) return [];
    seen.add(id);
    return [{
      id,
      name,
      category,
      address: address || "지도에서 위치를 확인하세요",
      lat,
      lng,
      distanceKm: Number(haversineKm(request.latitude, request.longitude, lat, lng).toFixed(2)),
      sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    }];
  }).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, request.limit);
}

function buildNominatimUrl(request) {
  const latDelta = request.radiusKm / 111;
  const lngDelta = request.radiusKm / (111 * Math.max(Math.cos((request.latitude * Math.PI) / 180), 0.2));
  const endpoint = new URL(NOMINATIM_URL);
  endpoint.searchParams.set("format", "jsonv2");
  endpoint.searchParams.set("q", request.queryText || NOMINATIM_TERMS[request.category]);
  endpoint.searchParams.set("viewbox", [
    request.longitude - lngDelta,
    request.latitude + latDelta,
    request.longitude + lngDelta,
    request.latitude - latDelta,
  ].join(","));
  endpoint.searchParams.set("bounded", "1");
  endpoint.searchParams.set("limit", String(request.limit));
  endpoint.searchParams.set("accept-language", "ko");
  endpoint.searchParams.set("addressdetails", "1");
  return endpoint;
}

function normalizeNominatimPlaces(payload, request) {
  if (!Array.isArray(payload)) return [];
  return payload.flatMap((item) => {
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    const osmType = ["node", "way", "relation"].includes(item.osm_type) ? item.osm_type : "node";
    const name = String(item.name || item.display_name || "이름 없는 장소").split(",")[0].trim();
    return [{
      id: `nominatim-${item.place_id}`,
      name,
      category: String(item.type || item.category || request.category),
      address: String(item.display_name || "지도에서 위치를 확인하세요"),
      lat,
      lng,
      distanceKm: Number(haversineKm(request.latitude, request.longitude, lat, lng).toFixed(2)),
      sourceUrl: `https://www.openstreetmap.org/${osmType}/${item.osm_id}`,
    }];
  }).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, request.limit);
}

async function fetchNearbyPlaces(query, fetchImpl = fetch) {
  const request = parsePlaceRequest(query);
  let timedOut = false;
  const nominatimController = new AbortController();
  const nominatimTimeout = setTimeout(() => nominatimController.abort(), 10000);
  try {
    const response = await fetchImpl(buildNominatimUrl(request), {
      headers: {
        "Accept": "application/json",
        "User-Agent": "ai-location-guide/2.0 (educational local discovery service)",
      },
      signal: nominatimController.signal,
    });
    if (response.ok) {
      const items = normalizeNominatimPlaces(await response.json(), request);
      return { items, count: items.length, attribution: "© OpenStreetMap contributors" };
    }
  } catch (error) {
    if (error?.name === "AbortError") timedOut = true;
  } finally {
    clearTimeout(nominatimTimeout);
  }
  for (const endpoint of OVERPASS_URLS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "ai-location-guide/2.0 (educational local discovery service)",
        },
        body: new URLSearchParams({ data: buildOverpassQuery(request) }),
        signal: controller.signal,
      });
      if (!response.ok) continue;
      const payload = await response.json();
      const items = normalizePlaces(payload, request);
      return { items, count: items.length, attribution: "© OpenStreetMap contributors" };
    } catch (error) {
      if (error?.name === "AbortError") timedOut = true;
    } finally {
      clearTimeout(timeout);
    }
  }
  if (timedOut) throw new PlaceApiError(504, "PLACE_TIMEOUT", "주변 장소 응답이 늦어지고 있습니다.");
  throw new PlaceApiError(502, "PLACE_UPSTREAM_ERROR", "주변 장소 연결이 원활하지 않습니다.");
}

module.exports = { PlaceApiError, buildNominatimUrl, buildOverpassQuery, fetchNearbyPlaces, normalizeNominatimPlaces, normalizePlaces, parsePlaceRequest };
