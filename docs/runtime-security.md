# 런타임 OS·Node library 보안 게이트 (2026-10-27)

확인한 실행 이미지에서 brace-expansion5.0.9·undici6.28.0·http-cache-semantics4.2.0은 global npm 소유였으며 앱 node_modules에는 없었다. 같은 Debian/glibc ABI를 유지하고 공식 `node:24-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205`를 고정한다. 이미지 빌드 중 APT 갱신을 적용하고, 설치·빌드가 끝난 **최종 앱 runtime에만** 불필요한 global npm/npx/yarn/corepack을 제거한다. 앱 node_modules와 Node 실행 파일·USER·포트·환경 주입은 유지한다.

APT 갱신 결과는 빌드 시점 저장소 상태에 따라 달라진다. 실제 CI 전에는 OS 경고가 없어졌다고 판정하지 않는다. CVE-2023-45853 등 vendor 비영향 후보도 이 변경에서 ignore/VEX로 제외하지 않는다. [Debian vendor 기록](https://security-tracker.debian.org/tracker/CVE-2023-45853)의 조건과 패키지 provenance는 별도 근거로 보존하며 raw 경고가 남으면 게이트는 계속 차단한다.

Shop의 small image 게이트를 재사용해 실제 built image ID를 Trivy0.76.1로 검사한다. archive SHA256 `c7cbe3137fb8a48a17574bede3dd6beb16742d1e9772929940fc90082c39d9c0`을 확인하고, vuln-only·OS+library·모든 severity·텔레메트리 OFF·격리된 cwd/HOME·빈 config/ignore 입력을 사용한다. 알려진 Debian OS inventory와 Node library inventory가 각각 양수여야 한다. CRITICAL/HIGH·scanner 오류·미검사/불완전 요약은 차단한다. OS-only 결과를 Node library까지 검사한 것으로 세지 않는다.

허용된 template/요약에는 OS/Node package 수와 scope별/전체 severity 수량만 포함한다. raw image config/env/target·scanner/container 로그·원문 보고서 artifact는 출력하거나 업로드하지 않는다. 기존 immutable image 배포 artifact와 기존 source security gate는 유지한다.

로컬 합성 회귀는 OS와 library 각각의 C/H 거부, 양쪽 inventory 필수, scanner 오류, 잘못된 자료형/중복 scope, 비밀 합성 marker 미출력을 검사한다. 실제 image 빌드/패키지 상태/서비스 기능 회귀는 정확한 GitHub CI에서 확인해야 한다. 변경 전 immutable image로 app만 되돌리는 기존 배포 rollback을 유지하며 운영 DB·schema·DNS·접근 정책은 바꾸지 않는다.

DevCredit은 dependency/tools/build의 npm/npx·Prisma generate 및 별도 tools image를 유지한다. 제거는 standalone runner에만 적용하며 CMD `node server.js`, USER node, port3000 및 기존 health/cookie/origin/일회용 CI PostgreSQL 회귀는 유지한다. glibc와 Prisma7.8/Sharp0.35.5의 ABI 경계를 유지하고 package-lock/schema/migration/seed/Compose는 바꾸지 않는다.

이 actual-image 게이트는 공개 앱 runner를 검사한다. 별도 tools artifact의 global npm을 제거하거나 그 이미지까지 경고가 해결됐다고 주장하지 않는다. tools는 기존 npx Prisma 명령을 사용하며 운영 migration을 이 변경에서 실행하지 않는다. tools에 대한 추가 보안 조치는 별도 범위로 추적해야 한다.
