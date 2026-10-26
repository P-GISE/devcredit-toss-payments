# 런타임 OS·Node library 보안 게이트 (2026-10-27)

확인한 실행 이미지에서 brace-expansion5.0.9·undici6.28.0·http-cache-semantics4.2.0은 global npm 소유였으며 앱 node_modules에는 없었다. 첫 Option A(Debian/glibc)는 실제 PR CI에서 빌드·앱 회귀를 통과했지만 OS inventory88에서 C1/H56이 남아 차단됐다. 이 기록을 보존하고 대안으로 공식 `node:24-alpine3.24@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53`를 고정한다. 모든 dependency/build/tools/runtime 단계를 같은 Alpine/musl ABI로 맞추며 `apk upgrade --no-cache`와 명시적 OpenSSL/CA 설치를 수행한다. 최종 앱 runtime에만 global npm/npx/yarn/corepack을 제거한다. 앱 node_modules·Node·USER·포트·환경 주입은 유지한다.

Alpine 전환만으로 경고 해결을 확정하지 않는다. 실제 이미지 CI가 OS+Node 검사와 기능 검증을 통과해야 한다. 기존 Debian CVE-2023-45853 등 vendor 후보와 첫 실패 기록은 보존하며 ignore/VEX·severity 완화·버전 위조를 추가하지 않는다.

Shop의 small image 게이트를 재사용해 실제 built image ID를 Trivy0.76.1로 검사한다. archive SHA256 `c7cbe3137fb8a48a17574bede3dd6beb16742d1e9772929940fc90082c39d9c0`을 확인하고, vuln-only·OS+library·모든 severity·텔레메트리 OFF·격리된 cwd/HOME·빈 config/ignore 입력을 사용한다. 알려진 Alpine OS inventory와 Node library inventory가 각각 양수여야 한다. CRITICAL/HIGH·scanner 오류·미검사/불완전 요약은 차단한다. OS-only 결과를 Node library까지 검사한 것으로 세지 않는다.

허용된 template/요약에는 OS/Node package 수와 scope별/전체 severity 수량만 포함한다. raw image config/env/target·scanner/container 로그·원문 보고서 artifact는 출력하거나 업로드하지 않는다. 기존 immutable image 배포 artifact와 기존 source security gate는 유지한다.

로컬 합성 회귀는 OS와 library 각각의 C/H 거부, 양쪽 inventory 필수, scanner 오류, 잘못된 자료형/중복 scope, 비밀 합성 marker 미출력을 검사한다. 실제 image 빌드/패키지 상태/서비스 기능 회귀는 정확한 GitHub CI에서 확인해야 한다. 변경 전 immutable image로 app만 되돌리는 기존 배포 rollback을 유지하며 운영 DB·schema·DNS·접근 정책은 바꾸지 않는다.

DevCredit은 dependency/tools/build의 npm/npx·Prisma generate 및 별도 tools image를 유지한다. 제거는 standalone runner에만 적용하며 CMD `node server.js`, USER node, port3000 및 기존 health/cookie/origin/일회용 CI PostgreSQL 회귀는 유지한다. Prisma7.8/Sharp0.35.5의 musl optional 패키지를 동일 ABI의 설치/빌드/실행 단계에서 선택하고 package-lock/schema/migration/seed/Compose는 바꾸지 않는다.

이 actual-image 게이트는 공개 앱 runner를 검사한다. 별도 tools artifact의 global npm을 제거하거나 그 이미지까지 경고가 해결됐다고 주장하지 않는다. tools는 기존 npx Prisma 명령을 사용하며 운영 migration을 이 변경에서 실행하지 않는다. tools에 대한 추가 보안 조치는 별도 범위로 추적해야 한다.

추가 CI는 실제 standalone 이미지에서 Sharp의 2×2 합성 PNG 생성·resize를 실행하고 네트워크 없는 tools 이미지에서 OpenSSL·Prisma CLI 로딩을 확인한다. 기존 Prisma generate 및 일회용 PostgreSQL migration/seed/가입·세션 회귀는 musl에서 그대로 실행돼야 한다. lockfile의 양쪽 libc optional 패키지 존재는 실행 성공의 증거로 대체하지 않는다.
