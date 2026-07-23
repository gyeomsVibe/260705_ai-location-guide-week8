const MOIS_BENEFITS_ENDPOINT = "https://api.odcloud.kr/api/gov24/v3/serviceList";

class BenefitApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function parsePositiveInteger(value, fallback, maximum, code, message) {
  if (value === undefined || value === null || value === "") return fallback;
  if (!/^\d+$/.test(String(value))) throw new BenefitApiError(400, code, message);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new BenefitApiError(400, code, message);
  return Math.min(parsed, maximum);
}

function cleanQueryText(value, maximumLength = 100) {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

function parseBenefitRequest(query = {}) {
  return {
    page: parsePositiveInteger(query.page, 1, 10000, "INVALID_PAGE", "page 값은 1 이상의 정수여야 합니다."),
    limit: parsePositiveInteger(query.limit, 5, 50, "INVALID_LIMIT", "limit 값은 1 이상의 정수여야 합니다."),
    queryText: cleanQueryText(query.q),
    organization: cleanQueryText(query.organization),
    userType: cleanQueryText(query.userType),
    serviceField: cleanQueryText(query.serviceField)
  };
}

function cleanText(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function normalizeBenefit(item) {
  const id = cleanText(item?.서비스ID);
  const name = cleanText(item?.서비스명);
  if (!id || !name) return null;

  return {
    id,
    name,
    summary: cleanText(item.서비스목적요약),
    supportType: cleanText(item.지원유형),
    target: cleanText(item.지원대상),
    selectionCriteria: cleanText(item.선정기준),
    support: cleanText(item.지원내용),
    applicationMethod: cleanText(item.신청방법),
    applicationDeadline: cleanText(item.신청기한),
    detailUrl: cleanText(item.상세조회URL),
    agency: cleanText(item.소관기관명),
    agencyType: cleanText(item.소관기관유형),
    department: cleanText(item.부서명),
    userTypes: cleanText(item.사용자구분),
    serviceField: cleanText(item.서비스분야),
    receptionAgency: cleanText(item.접수기관),
    phone: cleanText(item.전화문의),
    registeredAt: cleanText(item.등록일시),
    updatedAt: cleanText(item.수정일시)
  };
}

function normalizeBenefits(payload, limit = 5) {
  if (!Array.isArray(payload?.data)) {
    throw new BenefitApiError(502, "BENEFIT_API_INVALID_RESPONSE", "공공서비스 혜택 응답 형식이 올바르지 않습니다.");
  }

  const seen = new Set();
  return payload.data.map(normalizeBenefit).filter(Boolean).filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  }).slice(0, limit);
}

async function fetchBenefits(query, serviceKey, fetchImpl = fetch) {
  const request = parseBenefitRequest(query);
  const endpoint = new URL(MOIS_BENEFITS_ENDPOINT);
  endpoint.searchParams.set("serviceKey", serviceKey);
  endpoint.searchParams.set("page", String(request.page));
  endpoint.searchParams.set("perPage", String(request.limit));
  endpoint.searchParams.set("returnType", "JSON");
  if (request.queryText) endpoint.searchParams.set("cond[서비스명::LIKE]", request.queryText);
  if (request.organization) endpoint.searchParams.set("cond[소관기관명::LIKE]", request.organization);
  if (request.userType) endpoint.searchParams.set("cond[사용자구분::LIKE]", request.userType);
  if (request.serviceField) endpoint.searchParams.set("cond[서비스분야::LIKE]", request.serviceField);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetchImpl(endpoint, { signal: controller.signal, headers: { Accept: "application/json" } });
    const responseText = await response.text();
    if (!response.ok) {
      const code = response.status === 401 || response.status === 403 ? "BENEFIT_API_AUTH_ERROR" : "BENEFIT_API_ERROR";
      throw new BenefitApiError(502, code, "공공서비스 혜택을 불러오지 못했습니다.");
    }

    let payload;
    try {
      payload = JSON.parse(responseText);
    } catch {
      throw new BenefitApiError(502, "BENEFIT_API_INVALID_RESPONSE", "공공서비스 혜택 응답 형식이 올바르지 않습니다.");
    }

    const items = normalizeBenefits(payload, request.limit);
    return {
      items,
      count: items.length,
      page: Number(payload.page ?? request.page),
      totalCount: Number(payload.matchCount ?? payload.totalCount ?? items.length)
    };
  } catch (error) {
    if (error instanceof BenefitApiError) throw error;
    if (error?.name === "AbortError") {
      throw new BenefitApiError(504, "BENEFIT_API_TIMEOUT", "공공서비스 혜택 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.");
    }
    throw new BenefitApiError(502, "BENEFIT_API_ERROR", "공공서비스 혜택을 불러오지 못했습니다.");
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { BenefitApiError, fetchBenefits, normalizeBenefits, parseBenefitRequest };
