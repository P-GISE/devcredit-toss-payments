# DevCredit 배포 준비

## 상태와 범위

이 변경은 main에 검토할 실행 패키지와 CI다. 운영 서버·DNS·DB·Toss 계정은 변경하지 않았다. 기존 `docker-compose.yml`은 개발용이며 운영에는 사용하지 않는다. CI의 Postgres와 계정은 합성 임시 데이터다.

Next.js 단일 앱 → 이 프로젝트 전용 Postgres 16. 앱만 `127.0.0.1:3504`에 바인딩하고 DB는 내부 네트워크와 `devcredit_postgres` 볼륨에 둔다. 초기 예산은 앱 512MiB, DB 384MiB이며 실측 전 용량 보장이 아니다. 새 서버·유료 서비스는 생성하지 않는다.

## 환경 계약

`.env.production.example`의 비어 있는 값을 설치 승인 후 서버의 Git 밖 `/etc/devcredit/production.env`에 저장한다(소유자만 읽기, 로그에 출력 금지).

| 키 | 조건 |
|---|---|
| APP_VERSION | 검토된 커밋 SHA와 동일한 이미지 태그 |
| APP_PORT | 제안 3504, 설치 전 점유 확인 |
| POSTGRES_PASSWORD | 새 랜덤 비밀번호, 개발 기본값 사용 금지 |
| DATABASE_URL | `postgresql://devcredit:<URL 인코딩한 비밀번호>@db:5432/devcredit` |
| NEXTAUTH_SECRET / API_KEY_PEPPER | 서로 다른 32자 이상 랜덤 값. 교체 시 세션/기존 API 키 영향 |
| APP_URL / NEXTAUTH_URL | 동일한 HTTPS origin, 마지막 `/` 없이. 제안 `https://devcredit.pigs0516.com`, 아직 연결 안 됨 |
| TOSS_CLIENT_KEY / TOSS_SECRET_KEY | 해당 상점의 **test_ck_ / test_sk_** 개별 연동 키. 서버 비밀을 프런트 환경변수에 넣지 않음 |

키 누락, HTTP 공개 주소, 짧은 서버 비밀, live 결제 키는 운영 서버 시작 시 거절한다. 이번 패키지는 테스트 결제 전용이다. 실제 자금 결제는 별도 검토 대상이며 CI는 Toss에 요청하지 않는다. 테스트 키도 현재 연결하지 않았으므로 결제창·승인 성공을 주장하지 않는다.

## 승인 후 설치 순서

운영 명령은 담당 에이전트가 수행한다. 아래는 검토와 재현을 위한 절차이며 이 PR에서 실행한 운영 작업이 아니다.

1. `/opt/devcredit`에 승인된 SHA checkout, 환경 파일 준비, 포트·메모리·디스크 여유 확인.
2. `docker compose --env-file /etc/devcredit/production.env -f compose.production.yaml --profile tools build`로 해당 버전 앱과 tools 이미지를 만든다. 빌드는 운영 비밀 없이 가능하다.
3. **새 DB 생성 승인 후에만** `... up -d --wait db`, `... --profile tools run --rm migrate`를 실행한다. `...`는 위 compose 공통 인수다. 기존 DB 재사용이나 자동 마이그레이션은 없다.
4. 상품 패키지가 필요하면 기존 `prisma/seed.ts`를 먼저 검토하고 별도 승인 후 `... --profile tools run --rm migrate npx prisma db seed`. 시작/일반 재배포에는 seed를 넣지 않는다.
5. `... up -d --no-deps --wait app`; 로컬 `/api/health` 200과 공개 전 합성 회원가입·로그인·쿠키·문서 이동을 확인한다. health는 DB 연결만 확인하므로 schema와 사용자 흐름을 따로 검증한다.
6. 호스트·터널·HTTPS 규칙은 별도 승인 후 연결한다. 공개 브라우저에서 로그인 POST→303→GET, Secure/HttpOnly 쿠키와 재접속을 확인한다. 실결제는 하지 않는다.

## GitHub 업데이트와 재배포

CI는 PR과 main에서 테스트, Next 빌드, Docker 빌드, 합성 DB migration, 실제 컨테이너 회원가입/로그인을 검증한다. 저장소 비밀이나 운영 접근은 필요 없다. CI 성공이 자동 운영 배포를 뜻하지 않는다.

운영 연결 승인 후 기존 서버 pull 방식으로 **이 저장소의 main + 성공 CI + 새 SHA**만 배포하도록 연결할 계획이다. 별도 읽기 전용 저장소 인증, project 경로, systemd timer를 설치하는 단계는 아직 적용하지 않았다. 일반 배포는 새 앱 이미지만 교체하고 DB/migrate/seed는 실행하지 않는다. 앱 health 실패 시 이전 SHA 이미지로 복구하며, DB 변경이 포함된 커밋은 자동 처리하지 않는다.

## 업데이트·롤백

배포 전 현재 SHA·이미지 ID·환경 파일 경로를 기록하고 DB 백업을 승인된 보관 위치에 만든다. 새 SHA image build 후 app만 교체한다. health·로그인 실패 시 APP_VERSION을 이전 SHA로 되돌리고 `... up -d --no-deps --wait app`한다. DB와 볼륨은 유지한다. `down -v`, `prisma migrate reset`, 운영 `migrate dev` 금지.

스키마 변경은 별도 유지보수 계획과 백업/복구 검증을 요구한다. Prisma가 자동 역마이그레이션을 제공한다고 가정하지 않는다. 초기 설치 중 실패하면 app만 중지하고 생성된 DB/볼륨을 보존하며 DNS를 연결하지 않는다.

## 검증 범위

CI smoke는 임시 데이터로 DB 연결, 회원가입, 응답 쿠키 속성, 쿠키를 이용한 dashboard 조회, 재로그인, 로그아웃을 확인한다. 실제 브라우저 쿠키 저장, Cloudflare, Toss 승인, 부하·백업 복구는 별도 공개 전 검증 대상이다. 기존 API 남용 방지/CSRF 및 실결제 운영 검토도 공개 전 필요하며 이번 변경이 전체 보안 감사를 대신하지 않는다.

근거: [Next instrumentation](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation), [Toss API 키](https://docs.tosspayments.com/reference/using-api/api-keys). 테스트 키 제한은 이 준비 패키지의 명시적 운영 경계다.
