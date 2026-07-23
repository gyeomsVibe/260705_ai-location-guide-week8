const fs = require("node:fs");
const path = require("node:path");

module.exports = {
  id: "project-diagnostic",
  name: "Project Structure and Code Integrity Diagnostic",
  layer: "SYSTEM",
  linkedTask: "TASK-001",

  async run(ctx) {
    const rootPath = ctx.cwd || process.cwd();
    const serverPath = path.join(rootPath, "backend", "server.js");
    const htmlPath = path.join(rootPath, "frontend", "public", "index.html");

    if (!fs.existsSync(serverPath)) return { status: "ERROR", details: "backend/server.js 파일이 없습니다." };

    const serverContent = fs.readFileSync(serverPath, "utf8");
    if (!serverContent.includes("express")) return { status: "ERROR", details: "backend/server.js가 Express를 사용하지 않습니다." };
    if (!serverContent.includes('disable("x-powered-by")')) return { status: "WARNING", details: "Express x-powered-by 헤더 차단이 필요합니다." };
    if (!serverContent.includes("process.env.PORT")) return { status: "WARNING", details: "Render 호환을 위해 process.env.PORT 바인딩이 필요합니다." };
    if (!serverContent.includes("../frontend/public")) return { status: "ERROR", details: "정적 프론트엔드 경로가 ../frontend/public을 가리키지 않습니다." };

    if (!fs.existsSync(htmlPath)) return { status: "ERROR", details: "frontend/public/index.html 파일이 없습니다." };

    const htmlContent = fs.readFileSync(htmlPath, "utf8");
    if (!htmlContent.includes("dapi.kakao.com/v2/maps/sdk.js")) return { status: "ERROR", details: "Kakao Maps SDK 스크립트를 찾을 수 없습니다." };
    if (!htmlContent.includes("const ZONES_DATA")) return { status: "ERROR", details: "ZONES_DATA 위치 데이터가 없습니다." };

    return { status: "OK", details: "분리된 서버·프론트엔드 구조와 지도 기본 구성이 확인되었습니다." };
  }
};