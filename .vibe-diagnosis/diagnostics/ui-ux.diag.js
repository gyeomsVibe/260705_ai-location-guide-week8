const fs = require("node:fs");
const path = require("node:path");

module.exports = {
  id: "ui-ux-diagnostic",
  name: "UI/UX Visual and Accessibility Diagnostic",
  layer: "FUNCTION",
  linkedTask: "TASK-002",

  async run(ctx) {
    const rootPath = ctx.cwd || process.cwd();
    const htmlPath = path.join(rootPath, "frontend", "public", "index.html");

    if (!fs.existsSync(htmlPath)) return { status: "ERROR", details: "frontend/public/index.html 파일이 없습니다." };

    const htmlContent = fs.readFileSync(htmlPath, "utf8");
    if (!htmlContent.includes('<html lang="ko">') && !htmlContent.includes('<html lang="en">')) return { status: "WARNING", details: "스크린 리더를 위해 html lang 속성이 필요합니다." };
    if (!htmlContent.includes(":root") || !htmlContent.includes("--primary")) return { status: "WARNING", details: "디자인 시스템용 CSS 변수를 확인하지 못했습니다." };
    if (!htmlContent.includes("transition:")) return { status: "WARNING", details: "상호작용 피드백용 transition이 없습니다." };
    if (!htmlContent.includes("::-webkit-scrollbar")) return { status: "WARNING", details: "스크롤바 스타일을 확인하지 못했습니다." };

    return { status: "OK", details: "기본 접근성·디자인 시스템·상호작용 구성이 확인되었습니다." };
  }
};