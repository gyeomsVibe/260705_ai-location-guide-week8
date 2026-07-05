// 나만의 위치 안내 서비스 - 서버 파일
// Express로 public 폴더의 웹페이지를 보여주는 아주 간단한 서버입니다.

const express = require("express");
const path = require("node:path");

const app = express();
app.disable("x-powered-by"); // Express 버전 정보 헤더 노출 차단 (보안 개선)
const PORT = process.env.PORT || 3000; // 브라우저에서 접속할 포트 번호 (배포용 동적 포트 반영)

// public 폴더 안의 파일(index.html 등)을 그대로 보여줍니다.
app.use(express.static(path.join(__dirname, "public")));

// 서버 시작
app.listen(PORT, () => {
  console.log("서버가 실행되었습니다!");
  console.log(`서버 주소: http://localhost:${PORT}`);
});
