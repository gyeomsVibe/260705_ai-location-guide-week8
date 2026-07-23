// 나만의 위치 안내 서비스 - 서버 파일
// Express로 프론트엔드를 제공하고, 공공 카페 데이터를 서버에서 안전하게 중계합니다.

const path = require("node:path");
const dotenv = require("dotenv");
const express = require("express");
const { CafeApiError, fetchNearbyCafes } = require("./services/semas-cafes");

// 인증키는 로컬 루트의 .env 또는 Render 환경변수에서만 읽습니다.
dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();
app.disable("x-powered-by");
const PORT = process.env.PORT || 3000;

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
    return res.status(200).json(result);
  } catch (error) {
    const status = error instanceof CafeApiError ? error.status : 502;
    const code = error instanceof CafeApiError ? error.code : "PUBLIC_API_ERROR";
    const message = error instanceof CafeApiError ? error.message : "카페 데이터를 불러오지 못했습니다.";
    return res.status(status).json({ error: { code, message } });
  }
});

// HTML은 캐시를 끄고, 정적 자원은 짧게 캐시해 이전 버전 오버랩을 방지합니다.
app.use(
  express.static(path.join(__dirname, "../frontend/public"), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
    }
  })
);

app.listen(PORT, () => {
  console.log("서버가 실행되었습니다!");
  console.log(`서버 주소: http://localhost:${PORT}`);
});