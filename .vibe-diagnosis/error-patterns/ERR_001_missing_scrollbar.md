# ERR_001_missing_scrollbar_and_darkmode

## 에러/경고 현상
- `ui-ux-diagnostic` 진단 중 "Custom styled scrollbar is missing" 경고 발생.
- `ui-ux-diagnostic` 진단 중 "No dark mode support detected" 경고 발생.

## 원인
1. 기본 브라우저 스크롤바가 그대로 노출되어 디자인의 완성도를 떨어뜨림.
2. 다크 모드가 없거나 미디어 쿼리가 구성되지 않아 다양한 환경의 사용자를 배려하지 못하고 시각적 고급감이 반감됨.

## 해결 방법
1. **커스텀 스크롤바 추가**:
   CSS에 `::-webkit-scrollbar` 및 하위 속성들(`::-webkit-scrollbar-track`, `::-webkit-scrollbar-thumb`)을 정의해 브라우저 기본 스크롤바를 얇고 둥근 형태로 트렌디하게 스타일링.
2. **다크 모드 및 미디어 쿼리 연동**:
   - `:root[data-theme="dark"]`에 다크모드 전용 변수 정의.
   - `@media (prefers-color-scheme: dark)` 미디어 쿼리를 추가해 시스템 테마가 다크모드일 때 자동으로 다크 스타일링이 매핑되도록 지원.
   - 사이드바 헤더 영역에 테마를 수동으로 변경할 수 있는 토글 버튼(`<button class="theme-toggle-btn">`) 추가.
   - 로컬 스토리지(`localStorage.setItem("theme", ...)`)를 연동하여 세션 간 사용자 테마 선호도 저장.
   - 다크 모드 활성화 시 카카오 지도의 시인성을 확보하기 위해 `#map`에 `invert(90%) hue-rotate(180deg) brightness(85%) contrast(90%)` 필터를 적용하여 멋스러운 다크 맵 연출.
