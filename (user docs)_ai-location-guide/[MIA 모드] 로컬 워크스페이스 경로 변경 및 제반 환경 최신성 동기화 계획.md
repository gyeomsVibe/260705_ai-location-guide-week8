# [MIA 모드] 로컬 워크스페이스 경로 변경 및 제반 환경 최신성 동기화 계획

로컬 워크스페이스 경로가 `D:\D_Workspace_NB\-google-workspace\-antigravity-workspace\260705_ai-location-guide-week8-9`로 변경됨에 따라, 워크스페이스 내부의 상대/절대 경로 표기, 문서 최신화, Git 추적 상태 정제, 및 Remote GitHub 저장소와의 무결성 동기화를 수행합니다.

## User Review Required

> [!IMPORTANT]
> - **Git 변경사항 수용 및 푸시**: 삭제된 바이너리 잔재(`.vibe-diagnosis.zip`)의 `git rm` 처리 및 `.gitignore` 강화를 포함하여 워크스페이스 최신화 커밋을 작성하고 `origin/main`으로 `git push`를 진행합니다.
> - **경로 및 문서 최신성 유지**: 기존 `week8` 경로를 가리키던 내부 문서(`STATE_BOUNDARY.md`, 사용자 계획서 등)의 경로 표기를 신규 물리 경로인 `week8-9`로 통일합니다.

## Open Questions

- 현재 원격 깃허브 리포지토리는 `git@github.com:gyeomsVibe/260705_ai-location-guide-week9.git`로 매핑되어 있습니다. 로컬 폴더 명칭 `260705_ai-location-guide-week8-9`와 정상 연동되어 있습니다. 추가적인 원격 저장소 URL 변경이 필요하지 않으시다면 그대로 유지합니다.

---

## MIA Stage & Decision Memo

- **Stage**: `실행` (Execution)
- **Decision Gate**: `Go` (워크스페이스 교정 및 최신화 작업 진행)
- **주요 목표**:
  1. 워크스페이스 내 잔재 및 구 경로 표기 정제
  2. 물리적 워크스페이스 디렉터리 상태와 Git 추적 상태 완전 일치화
  3. Git Commit & Push 및 푸시 후 무결성 검증 (`Post-Push Verification Protocol`)

---

## Proposed Changes

### Workspace Configuration & Documentation

#### [MODIFY] [STATE_BOUNDARY.md](file:///d:/D_Workspace_NB/-google-workspace/-antigravity-workspace/260705_ai-location-guide-week8-9/STATE_BOUNDARY.md)
- `Source Code (Workspace)` 경로를 `.../260705_ai-location-guide-week8-9/`로 수정.

#### [MODIFY] [README.md](file:///d:/D_Workspace_NB/-google-workspace/-antigravity-workspace/260705_ai-location-guide-week8-9/README.md)
- 메인 타이틀을 `Week 8-9 (8~9주차 통합)` 표기로 정제 및 최신화.

#### [MODIFY] [README.en.md](file:///d:/D_Workspace_NB/-google-workspace/-antigravity-workspace/260705_ai-location-guide-week8-9/README.en.md)
- 메인 타이틀을 `Week 8-9` 표기로 정제.

#### [MODIFY] [backend/package.json](file:///d:/D_Workspace_NB/-google-workspace/-antigravity-workspace/260705_ai-location-guide-week8-9/backend/package.json)
- description 항목을 `8~9주차 실습 및 공공 카페 데이터 연동`으로 갱신.

#### [MODIFY] [(user docs)_ai-location-guide 계획 문서들](file:///d:/D_Workspace_NB/-google-workspace/-antigravity-workspace/260705_ai-location-guide-week8-9/(user%20docs)_ai-location-guide/)
- 구 `260705_ai-location-guide-week8` 경로를 포함하던 마크다운 링크들을 신규 경로 `260705_ai-location-guide-week8-9`로 수정.

### Git Tracking & Hygiene

#### [MODIFY] [.gitignore](file:///d:/D_Workspace_NB/-google-workspace/-antigravity-workspace/260705_ai-location-guide-week8-9/.gitignore)
- `*.zip` 구문을 추가하여 진단도구 생성 임시 압축 파일 등이 깃에 추적되지 않도록 방지.

#### [DELETE] `.vibe-diagnosis.zip` (Git tracking removal)
- 이미 로컬에서 삭제된 `.vibe-diagnosis.zip` 파일의 git delete 상태를 스테이징 처리 (`git rm .vibe-diagnosis.zip`).

---

## Verification Plan

### Automated Tests & Checks
1. `npm run diag:sys` 또는 진단 명령으로 워크스페이스 정제 상태 확인.
2. `git status -s` 및 `git status --ignored` 실행으로 추적 불일치 항목(Untracked/Ignored leak)이 없는지 물리적 전체 트리 검사 (`Full-Tree Tracking & Audit Rule`).

### Git Push Verification
1. `git commit -m "chore: 워크스페이스 경로(week8-9) 변경에 따른 문서 및 환경 최신성 동기화"`
2. `git push origin main`
3. `Post-Push Verification Protocol`: `git log -1` 및 `git status`로 로컬 `HEAD`와 `origin/main`이 일치하는지 확인.
