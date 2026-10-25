# DevCredit 운영과 자동배포

## 현재 운영 경계

2026-10-26 한국시간 기준 공개 주소는 **https://devcredit.pigs0516.com**이다. Cloudflare의 이 호스트 전용 DNS·터널 경로가 기존 AWS 서버의 `127.0.0.1:3504`로 연결된다. HTTP는 같은 호스트 HTTPS로301 전환하며 경로·쿼리를 유지한다. 방문자는 Tailscale 없이 접속한다. Tailscale은 서버 관리 접속용으로 유지한다.

| 구분 | 실제 구성 |
|---|---|
| 앱 | `/opt/devcredit`, Compose project `devcredit`, 서비스 `app`, Next.js |
| DB | 이 프로젝트 전용 PostgreSQL16, 서비스 `db`, 외부 공개 포트 없음 |
| 네트워크 | `devcredit_web`, 내부 DB 네트워크 `devcredit_database` |
| 영속 데이터 | 프로젝트 전용 `devcredit_postgres` 볼륨 |
| 환경설정 | 서버 Git 밖 `/opt/devcredit/.env`, root0600 |
| 이미지 선택 | `compose.production.yaml` + `compose.image.yaml`, 검증한 immutable 이미지 ID |
| 배포 설정 | `/etc/five-sites-deploy/devcredit.json`, root 소유 |
| 배포 기록 | `/var/lib/five-sites-deploy/devcredit/deployed.json` |
| 자동배포 | `five-sites-deploy@devcredit.timer` → 성공한 main CI artifact 확인 |

앱512MiB·DB384MiB 상한을 설정했다. 기존 서버 CPU·메모리·디스크는 다른 프로젝트와 공유하므로 물리적 장애 격리를 의미하지 않는다. 새 유료 서버·유료 결제 구독은 생성하지 않았다.

## 환경과 초기 DB

`.env.production.example`은 키 이름·형식만 설명한다. 실제 DB 비밀번호, 세션 secret, API key pepper, Toss secret을 GitHub·문서·CI 출력에 저장하지 않는다. `NEXTAUTH_SECRET`과 `API_KEY_PEPPER`는 서로 다른 랜덤 값이다. `APP_URL`과 `NEXTAUTH_URL`은 `https://devcredit.pigs0516.com`으로 일치한다.

현재 Toss는 **test 결제 모드**다. 운영 검증기는 live 결제 키와 HTTP 공개 origin을 거절한다. 해당 계정의 개별 테스트 키로 존재하지 않는 합성 주문 GET의404 응답을 확인했으며, 결제를 생성하거나 승인하지 않았다. 실제 자금 결제와 테스트 결제창→승인 전체 흐름은 미검증이다.

새 DB의 migration은 초기 설치에서만 수동 실행했다. 상품·결제 행이 모두0임을 확인한 뒤 승인된 tools 이미지의 `prisma/seed.ts`를 검증하고 다음 상품3개만 초기화했다. 사용자·고정 비밀번호·결제 행은 만들지 않았다.

| 상품 | 표시 가격(원) | 크레딧 |
|---|---:|---:|
| Starter Pack | 1000 | 1000 |
| Builder Pack | 5000 | 5500 |
| Pro Pack | 10000 | 12000 |

이 값은 테스트 모드의 상품 설정이다. 앱 시작과 일반 배포는 migration·seed를 실행하지 않는다. seed를 반복하면 기존 상품 값을 덮어쓸 수 있으므로 일반 재배포 명령에 넣지 않는다.

## GitHub 업데이트가 배포되는 과정

1. 검토한 변경을 이 저장소의 **main**에 반영한다. 다른 브랜치 push만으로 운영이 바뀌지 않는다.
2. GitHub Actions `ci.yml`이 테스트·타입·Next/Docker 빌드와 임시 DB의 회원가입·로그인 smoke를 통과해야 한다. CI의 DB는 운영 DB와 별개다.
3. push CI가 SHA가 표시된 앱 이미지를 `five-sites-app-<SHA>` artifact로 보관한다. tools artifact는 초기 DB 작업용이며 timer가 실행하지 않는다.
4. AWS의 timer가 기존 저장소 인증으로 GitHub에 나가는 요청을 하여 main·CI 성공·artifact digest·이미지 checksum·OCI revision을 확인한다. GitHub에서 서버로 SSH 접속하거나 Tailscale에 가입할 필요가 없다.
5. main이 전진했고 schema·migration·Compose·배포 기반 파일이 바뀌지 않은 경우에만 **DevCredit 앱 컨테이너**를 교체한다. DB와 다른 프로젝트는 재시작하지 않는다. 서버 OS를 재부팅하지 않는다.
6. 새 이미지·컨테이너 health와 로컬 API health를 확인한 뒤 새 SHA·이미지·CI run·이전 이미지·배포 시각을 기록한다. 공개 HTTPS와 주요 사용자 흐름은 별도로 확인한다.

CI 대기·실패 중에는 기존 버전을 유지한다. artifact 보관기간은14일이며 만료된 artifact는 새 배포에 사용할 수 없다. 설정/스키마 변경, 강제 push 등 비전진 이력, 자원 부족, 배포 중단 표식이 있으면 자동 처리를 보류하고 검토한다. timer 간 공통 lock으로 같은 서버의 이 배포 작업들이 겹치지 않도록 한다.

## 검증 결과와 한계

초기 버전 `e4850330ac75b5c16b5ccf914d57cf790b0afd54`를 공개 HTTPS에서 합성 계정2개로 검증했다. 가입·로그인303→dashboard200, Secure/HttpOnly/SameSite=Lax 쿠키, 잘못된 비밀번호 거절, API key 생성201·개인별 목록·타인 폐기404·잔액 부족402·폐기 key401·로그아웃을 확인했다. 정확한 합성 계정과 연결 행은 정리했고 다른 프로젝트 컨테이너는 유지했다.

HTTP 검증은 실제 브라우저의 쿠키 저장이나 모든 모바일 기기 성공을 증명하지 않는다. 실제/테스트 결제 승인, 성공한 유료 demo 호출, 부하 및 백업 복원은 아직 검증하지 않았다. 운영 공개가 전체 보안 감사를 뜻하지 않는다.

## 실패 처리와 롤백

새 앱의 health 또는 보존 검증에 실패하면 배포기는 기존 환경·이미지로 **앱만** 되돌린다. DB·볼륨·DNS는 변경하지 않는다. 중단/실패 후 `in-progress`가 남으면 반복 배포를 중단한다. 담당자가 현재 앱·기존 이미지 health·실행 중 작업을 확인한 뒤 복구해야 하며 표식을 무작정 삭제하지 않는다.

배포가 성공한 뒤 기능 회귀를 발견하면 검토한 코드 revert를 main에 반영해 CI→배포하는 방법을 우선한다. 긴급 이미지 복구는 timer를 보류하고 `deployed.json`의 previous SHA/image와 보호된 `previous-environment`를 확인한 담당자가 수행한다. 환경 원문은 출력하지 않고, 앱만 이전 이미지로 교체·health·공개 로그인·배포 기록의 일치를 확인한다. 완료 후 timer를 재개한다. 단순히 이전 image만 실행하고 배포 상태를 새 SHA로 남겨두지 않는다.

DB 스키마 변경은 별도 백업·복원·유지보수 계획이 필요하다. Prisma의 자동 역마이그레이션을 가정하지 않는다. `down -v`, `prisma migrate reset`, 운영 `migrate dev`는 사용하지 않는다. 초기 상품3개를 되돌려야 하면 초기 생성 ID·값 일치와 Payment 참조0을 확인한 경우에만 해당 행을 삭제한다.
