# 프로젝트 명명 규약과 동기화 기준

## 정식 식별자

| 대상 | 정식 이름 | 용도 |
| --- | --- | --- |
| 통합 프로젝트 | AI Location Guide — Week 8–9 | 8주차 위치 안내 기반과 9주차 공공 카페 검색을 포함하는 제품·학습 범위 |
| 로컬 워크스페이스 | `260705_ai-location-guide-week8-9` | 개발·진단·로컬 파일의 물리적 기준 경로 |
| GitHub 저장소 | `gyeomsVibe/260705_ai-location-guide-week8-9` | 8~9주차 통합 기능 개발, 협업, GitHub Actions 및 배포 연결 기준 |
| 기본 브랜치 | `main` | 공유 최신 상태의 기준 브랜치 |

## 표기 규칙

- 현재 기능·계획·handoff 문서에서는 **Week 8–9** 또는 **8~9주차 통합**을 제품 범위로 사용합니다.
- 원격 주소, Git 명령, GitHub 링크에서는 반드시 `260705_ai-location-guide-week8-9`를 사용합니다.
- 8주차 강의안·회고처럼 과거 수업 자체를 설명하는 자료의 `8주차` 표기는 역사 기록이므로 변경하지 않습니다.
- 기존 Render 공개 URL에 포함된 `week8`은 운영 중인 외부 주소입니다. 이 문서의 명명 규약만으로 URL이나 Render 서비스명을 변경하지 않습니다.

## 최신성 확인 절차

1. 새 로컬 경로에서 `git fetch origin main`을 실행한다.
2. `HEAD`와 `origin/main`의 커밋 해시와 앞뒤 차이를 확인한다.
3. `git status --short`와 `git status --ignored --short`로 추적·무시 파일을 모두 감사한다.
4. 변경을 커밋할 때는 현재 작업 경로만 명시적으로 스테이징한다. `.env`, 키, 로컬 설정, 의존성 폴더는 포함하지 않는다.
5. push 뒤 `HEAD`와 `origin/main`이 일치하는지 재확인한다.