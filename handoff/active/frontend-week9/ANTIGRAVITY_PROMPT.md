# Antigravity 프론트엔드 작업 지시문

아래 내용을 Antigravity에서 새 프론트엔드 작업으로 그대로 사용한다.

```text
이 프로젝트의 9주차 프론트엔드 병렬 작업을 맡아 주세요.

먼저 handoff/active/frontend-week9/README.md 전체를 읽고, 그 계약을 반드시 지키세요.

작업 소유권은 frontend/public/index.html과 handoff 문서뿐입니다. backend/**, render.yaml, package.json, .env, .gitignore, Render와 Kakao 설정은 수정하지 마세요. 패키지도 설치하지 마세요. 인증키나 공공데이터 API를 브라우저에서 직접 호출하면 안 됩니다.

현재 상태:
- 기존 UI는 Kakao keywordSearch() 기반 2km 장소 검색입니다.
- 현재 백엔드에는 /api/cafes가 없으며 404가 정상입니다.
- 백엔드가 준비되기 전에는 기존 검색의 기본 동작을 깨지 마세요.

구현 순서:
1. 내 주변 카페 찾기 UI, 1km/3km/5km 반경 칩, 결과 수·상태 메시지 영역을 추가합니다.
2. 공공 카페 표준 항목(name/category/address/latitude/longitude/distanceKm)을 안전하게 렌더링할 DOM·마커·선택 동기화 함수를 구현합니다. 외부 데이터는 innerHTML에 넣지 말고 textContent를 사용하세요.
3. 반경 원과 위치 권한 거부 fallback UI를 구현합니다.
4. fetchCafes 어댑터를 구현하되, API가 아직 없으므로 자동 호출은 백엔드 완료 전까지 활성화하지 마세요. 요청 취소와 늦은 응답 무시를 구현하세요.

완료 후 보고 형식:
1. 수정한 파일
2. 구현한 기능
3. node --check 및 로컬 지도 확인 결과
4. backend API 부재로 아직 검증하지 못한 항목
5. 남은 위험

커밋, push, 배포는 하지 마세요.
```
