// 나만의 위치 안내 서비스 - 서버 파일
// Express로 public 폴더의 웹페이지를 보여주는 아주 간단한 서버입니다.

const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000; // 브라우저에서 접속할 포트 번호

// public 폴더 안의 파일(index.html 등)을 그대로 보여줍니다.
app.use(express.static(path.join(__dirname, "public")));

// 서버 시작
app.listen(PORT, () => {
  console.log("서버가 실행되었습니다!");
  console.log(`브라우저에서 http://localhost:${PORT} 로 접속하세요.`);
});
