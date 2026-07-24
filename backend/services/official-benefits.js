const OFFICIAL_BENEFITS = [
  {
    id: "kstartup-one-person-centers",
    name: "1인 창조기업 지원센터 공식 찾기",
    summary: "전국 1인 창조기업 지원센터와 입주·사업화 지원 정보를 K-Startup에서 확인합니다.",
    agency: "중소벤처기업부 · K-Startup",
    target: "1인 창조기업",
    supportType: "공간·사업화 지원",
    detailUrl: "https://www.k-startup.go.kr/user/board/webFC_SP_NR_list_cmrczn_Tab3.do",
    tags: ["1인 창조기업", "신규 창업", "창업"],
  },
  {
    id: "kstartup-one-person-check",
    name: "1인 창조기업 자가진단",
    summary: "지원 대상 여부를 공식 자가진단에서 먼저 확인합니다.",
    agency: "K-Startup",
    target: "1인 창조기업",
    supportType: "자격 확인",
    detailUrl: "https://www.k-startup.go.kr/common/knProject/application/ac/coCheckPop.do",
    tags: ["1인 창조기업", "예비창업", "창업"],
  },
  {
    id: "sbiz24-support",
    name: "소상공인 지원사업 공식 확인",
    summary: "현재 모집 중인 소상공인 지원사업과 신청 상태를 소상공인24에서 확인합니다.",
    agency: "소상공인시장진흥공단",
    target: "소상공인",
    supportType: "사업·경영 지원",
    detailUrl: "https://www.sbiz24.kr/",
    tags: ["소상공인", "자영업", "신규 창업"],
  },
  {
    id: "kstartup-programs",
    name: "K-Startup 창업지원사업 찾기",
    summary: "창업 단계와 관심 분야에 맞는 최신 모집 공고를 공식 포털에서 비교합니다.",
    agency: "창업진흥원 · K-Startup",
    target: "예비창업자·창업기업",
    supportType: "창업 지원",
    detailUrl: "https://www.k-startup.go.kr/",
    tags: ["예비창업", "신규 창업", "창업", "청년 창업"],
  },
  {
    id: "kstartup-certification",
    name: "창업기업 확인서 공식 신청",
    summary: "창업기업 확인서 대상과 제출 서류를 확인하고 온라인으로 신청합니다.",
    agency: "중소벤처기업부",
    target: "신규 창업기업",
    supportType: "기업 확인",
    detailUrl: "https://cert.k-startup.go.kr/index.do",
    tags: ["신규 창업", "창업기업", "확인서"],
  },
  {
    id: "government24-benefits",
    name: "정부24 혜택알리미 간편찾기",
    summary: "개인·가구·사업 조건을 선택해 중앙부처와 지자체의 최신 지원 정보를 찾습니다.",
    agency: "정부24",
    target: "대한민국 국민·사업자",
    supportType: "정부 혜택 통합 검색",
    detailUrl: "https://plus.gov.kr/portal/benefitV2/benefitEasyFind/",
    tags: ["1인 창조기업", "소상공인", "예비창업", "신규 창업", "정부 혜택"],
  },
];

function getOfficialBenefits(query = {}) {
  const queryText = typeof query.q === "string" ? query.q.trim().toLocaleLowerCase("ko-KR") : "";
  const parsedLimit = Number(query.limit || 24);
  const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : 24;
  const matched = queryText
    ? OFFICIAL_BENEFITS.filter((item) => `${item.name} ${item.summary} ${item.target} ${item.tags.join(" ")}`.toLocaleLowerCase("ko-KR").includes(queryText))
    : OFFICIAL_BENEFITS;
  const items = (matched.length ? matched : OFFICIAL_BENEFITS.filter((item) => ["kstartup-programs", "government24-benefits"].includes(item.id)))
    .slice(0, limit)
    .map(({ tags, ...item }) => item);
  return { items, count: items.length, degraded: true, source: "official-guides" };
}

module.exports = { OFFICIAL_BENEFITS, getOfficialBenefits };
