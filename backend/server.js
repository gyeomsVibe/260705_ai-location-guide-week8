const path = require("node:path");
const fs = require("node:fs");
const dotenv = require("dotenv");
const express = require("express");
const { CafeApiError, fetchNearbyCafes } = require("./services/semas-cafes");
const { BenefitApiError, fetchBenefits } = require("./services/mois-benefits");
const { createDataSourceMonitor } = require("./services/data-source-status");
const { PlaceApiError, fetchNearbyPlaces } = require("./services/osm-places");
const { GeocodeApiError, geocodeKoreanRegion } = require("./services/osm-geocode");
const { getOfficialBenefits } = require("./services/official-benefits");

// 인증키는 로컬 루트의 .env 또는 Render 환경변수에서만 읽습니다.
// 테스트에서는 process.env만 주입해 로컬 비밀 파일을 읽지 않습니다.
if (process.env.NODE_ENV !== "test") {
  dotenv.config({ path: path.join(__dirname, "../.env") });
}

const app = express();
app.disable("x-powered-by");
const PORT = process.env.PORT || 3000;

const monitor = createDataSourceMonitor(process.env);

app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.tile.openstreetmap.org",
    "connect-src 'self'",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join("; "));
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(self), camera=(), microphone=()");
  if (req.secure || req.get("x-forwarded-proto") === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000");
  }
  next();
});

app.get("/api/health", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    status: "ready",
    capabilities: {
      places: "available",
      optionalDataSources: monitor.snapshot().map(({ id, configured, verificationStatus }) => ({
        id,
        configured,
        verificationStatus,
      })),
    },
    checkedAt: new Date().toISOString(),
  });
});

app.get("/api/cafes", async (req, res) => {
  const serviceKey = process.env.SEMAS_STORE_API_KEY;
  res.setHeader("Cache-Control", "no-store");

  if (!serviceKey) {
    return res.status(503).json({
      error: {
        code: "PUBLIC_API_NOT_CONFIGURED",
        message: "카페 데이터 연결이 아직 설정되지 않았습니다."
      }
    });
  }

  try {
    const result = await fetchNearbyCafes(req.query, serviceKey);
    monitor.recordSuccess("semasStores");
    return res.status(200).json(result);
  } catch (error) {
    const status = error instanceof CafeApiError ? error.status : 502;
    const code = error instanceof CafeApiError ? error.code : "PUBLIC_API_ERROR";
    const message = error instanceof CafeApiError ? error.message : "카페 데이터를 불러오지 못했습니다.";
    monitor.recordFailure("semasStores", code);
    return res.status(status).json({ error: { code, message } });
  }
});

app.get("/api/benefits", async (req, res) => {
  const serviceKey = process.env.MOIS_PUBLIC_SERVICE_API_KEY;
  res.setHeader("Cache-Control", "no-store");

  if (!serviceKey) {
    return res.status(200).json(getOfficialBenefits(req.query));
  }

  try {
    const result = await fetchBenefits(req.query, serviceKey);
    monitor.recordSuccess("moisBenefits");
    return res.status(200).json(result);
  } catch (error) {
    const status = error instanceof BenefitApiError ? error.status : 502;
    const code = error instanceof BenefitApiError ? error.code : "PUBLIC_API_ERROR";
    const message = error instanceof BenefitApiError ? error.message : "공공서비스 혜택 데이터를 불러오지 못했습니다.";
    monitor.recordFailure("moisBenefits", code);
    return res.status(status).json({ error: { code, message } });
  }
});

app.get("/api/places", async (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=60");
  try {
    return res.status(200).json(await fetchNearbyPlaces(req.query));
  } catch (error) {
    const status = error instanceof PlaceApiError ? error.status : 502;
    const code = error instanceof PlaceApiError ? error.code : "PLACE_UPSTREAM_ERROR";
    const message = error instanceof PlaceApiError ? error.message : "주변 장소를 불러오지 못했습니다.";
    return res.status(status).json({ error: { code, message, retryable: status >= 500 } });
  }
});

app.get("/api/geocode", async (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=300");
  try {
    return res.status(200).json(await geocodeKoreanRegion(req.query));
  } catch (error) {
    const status = error instanceof GeocodeApiError ? error.status : 502;
    const code = error instanceof GeocodeApiError ? error.code : "GEOCODE_UPSTREAM_ERROR";
    const message = error instanceof GeocodeApiError ? error.message : "지역을 찾지 못했습니다.";
    return res.status(status).json({ error: { code, message, retryable: status >= 500 } });
  }
});

function sendDataSourceStatus(req, res) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    items: monitor.snapshot(),
    checkedAt: new Date().toISOString()
  });
}

// 공개 프론트엔드 계약을 정식 경로로 유지하고, 기존 API 소비자는 별칭으로 지원합니다.
app.get("/api/data-sources", sendDataSourceStatus);
app.get("/api/data-source-status", sendDataSourceStatus);

// HTML은 캐시를 끄고, 정적 자원은 짧게 캐시해 이전 버전 오버랩을 방지합니다.
const frontendDist = path.join(__dirname, "../frontend/dist");
const frontendRoot = fs.existsSync(frontendDist)
  ? frontendDist
  : path.join(__dirname, "../frontend/public");

app.use(
  express.static(frontendRoot, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
    }
  })
);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log("서버가 실행되었습니다!");
    console.log(`서버 주소: http://localhost:${PORT}`);
  });
}

module.exports = { app };
