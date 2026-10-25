# DevCredit

개발자용 API 크레딧 충전 SaaS 예제입니다.

공개 사이트: **https://devcredit.pigs0516.com** · [운영·자동배포·롤백 안내](docs/deployment.md)

AWS에서 전용 Compose·네트워크·PostgreSQL·볼륨·환경설정으로 운영합니다. `main` 업데이트의 CI가 성공하면 서버 timer가 검증한 이미지를 받아 DevCredit 앱만 재배포합니다. 서버 재부팅과 DB 재시작은 하지 않습니다. 방문자는 Tailscale 없이 접속하며 Tailscale은 관리 접속용입니다.

현재 결제는 Toss **test 모드**이고 초기 크레딧 상품3개를 구성했습니다. 공개 HTTPS 가입·로그인·API key 권한을 합성 데이터로 확인했으며, 실제/테스트 결제 생성·승인과 모바일 실기기는 아직 검증하지 않았습니다.

사용자는 회원가입 후 API Key를 발급받고, 샘플 API를 호출하면 크레딧이 차감됩니다. 크레딧 충전은 Toss Payments 테스트 결제 승인 흐름으로 처리합니다.

## 한눈에 보기

| 항목 | 내용 |
| --- | --- |
| 한국어 프로젝트명 | 토스페이먼츠 결제 학습 프로젝트 |
| 저장소 성격 | API key + 크레딧 과금 + Toss Payments 결제 실습용 SaaS |
| 주요 사용자 | 결제 승인/크레딧 차감 흐름을 학습하려는 개발자 |
| 실행 형태 | Next.js App Router |
| DB | PostgreSQL + Prisma |
| 결제 | Toss Payments 테스트 결제창과 Confirm API |
| 인증 | 이메일/비밀번호 세션 인증 |

## 소스 검토 기준

이 README는 `src/app`, `src/lib`, `prisma/schema.prisma`, `tests`, `package.json`, `.env.example`을 기준으로 다시 작성했습니다. 실제 `.env`, 결제 시크릿, DB 파일, `node_modules`, 빌드 산출물은 문서 근거에서 제외했습니다.

검토 결과 이 프로젝트는 Toss Payments 결제창만 붙인 예제가 아니라, 크레딧 상품 구매, 결제 준비/승인, 중복 승인 방지, 크레딧 원장, API Key 발급/폐기, 사용량 차감, 데모 API 호출까지 이어지는 작은 SaaS 과금 흐름입니다.

## 소스 기준 기능 지도

| 기능 영역 | 확인한 주요 파일 | 실제로 구현된 내용 |
| --- | --- | --- |
| 화면 라우트 | `src/app/**/page.tsx` | 랜딩, 회원가입/로그인, 대시보드, 크레딧 구매, 결제 성공/실패, 사용량 화면 |
| 결제 API | `src/app/api/payments/prepare`, `src/app/api/payments/confirm`, `src/lib/payments.ts`, `src/lib/toss.ts` | 결제 주문 생성, Toss 승인 요청, 금액/상태 검증, idempotency key 사용 |
| 크레딧 처리 | `src/lib/payment-service.ts`, `src/lib/credits.ts` | 결제 완료 시 사용자 잔액 증가, 크레딧 원장 기록, 중복 승인 방지 |
| API Key | `src/app/api/api-keys`, `src/lib/api-keys.ts` | API Key 생성, 해시 저장, 생성 직후 1회만 평문 표시, 폐기 처리 |
| Demo API | `src/app/api/demo/*`, `src/lib/demo-api.ts` | Bearer API Key 인증 후 데모 엔드포인트 사용량 기록과 크레딧 차감 |
| 인증/환경 | `src/lib/auth.ts`, `src/lib/session.ts`, `src/lib/env.ts` | 이메일/비밀번호 세션 인증, 필수 환경변수 zod 검증 |
| DB 모델 | `prisma/schema.prisma` | 사용자, API Key, 크레딧 상품, 결제, 크레딧 원장, 사용 로그 |
| 테스트 | `tests/**/*.test.ts` | API Key, 크레딧, 결제 승인, Toss 오류, 회원가입 오류 흐름 검증 |

## 처음 검토할 때 볼 순서

1. `prisma/schema.prisma`에서 결제와 크레딧 원장 구조를 확인합니다.
2. `src/lib/payments.ts`와 `src/lib/payment-service.ts`에서 결제 준비/완료의 핵심 규칙을 확인합니다.
3. `src/app/api/payments`에서 외부 결제 승인 API가 어떻게 노출되는지 봅니다.
4. `src/app/api/api-keys`와 `src/app/api/demo`를 보면 크레딧이 실제 API 사용으로 이어지는 흐름을 볼 수 있습니다.
5. `tests`를 보면 중복 결제, 금액 불일치, Toss 오류, API Key 폐기 같은 위험 지점을 어떻게 검증했는지 확인할 수 있습니다.

## 서비스 사용 흐름

1. 사용자가 회원가입 후 로그인합니다.
2. Dashboard에서 API Key를 발급합니다.
3. 발급된 API Key 원문은 한 번만 표시되고, DB에는 hash와 prefix만 저장됩니다.
4. 사용자가 Demo API를 호출하면 API Key Bearer 인증을 통과한 뒤 크레딧이 차감됩니다.
5. 크레딧이 부족하면 `/billing`에서 결제 패키지를 선택합니다.
6. Toss Payments 결제창이 열리고, 성공 redirect 후 서버가 Confirm API를 호출합니다.
7. 결제 완료 시 Payment, User creditBalance, CreditLedger가 하나의 transaction으로 갱신됩니다.

## 주요 기능

- 이메일/비밀번호 기반 회원가입과 로그인
- bcrypt 기반 비밀번호 해싱
- API Key 발급, prefix 표시, 원문 1회 노출
- API Key hash 저장과 Bearer 인증
- 샘플 API 호출 시 크레딧 차감
- Toss Payments 결제창 연동
- 결제 준비, 승인, idempotency 처리
- 결제 완료 시 크레딧 충전과 CreditLedger 기록
- PostgreSQL/Prisma 기반 데이터 관리

## 기술 스택

- Next.js App Router
- React
- TypeScript
- Prisma ORM
- PostgreSQL
- Tailwind CSS
- bcryptjs
- Toss Payments 결제창 SDK
- Toss Payments Confirm API
- Vitest
- Zod

## 프로젝트 구조

```text
토스페이먼츠공부/
  src/app/               화면과 API route
  src/components/        인증, 결제, API Key UI
  src/lib/               결제, 크레딧, API Key, 환경변수 로직
  prisma/                DB schema, migration, seed
  tests/                 결제, 크레딧, API Key 테스트
  docker-compose.yml     로컬 PostgreSQL
```

## 실행 방법

```bash
npm install
```

환경변수 파일을 준비합니다.

```bash
cp .env.example .env
```

필수 환경변수:

```text
DATABASE_URL
NEXTAUTH_SECRET
API_KEY_PEPPER
TOSS_CLIENT_KEY
TOSS_SECRET_KEY
APP_URL
```

로컬 PostgreSQL 실행:

```bash
docker compose up -d postgres
```

마이그레이션과 seed:

```bash
npm run db:migrate -- --name init
npm run db:seed
```

개발 서버:

```bash
npm run dev
```

기본 주소:

```text
http://localhost:3000
```

## 결제 흐름

1. 사용자가 `/billing`에서 크레딧 패키지를 선택합니다.
2. `/api/payments/prepare`가 PENDING Payment를 만들고 `orderId`, `amount`, `orderName`을 반환합니다.
3. 클라이언트가 Toss Payments 결제창을 엽니다.
4. 성공 시 `/billing/success`에서 `/api/payments/confirm`을 호출합니다.
5. 서버가 DB에 저장된 금액과 요청 금액을 비교합니다.
6. Toss Confirm API를 `Idempotency-Key`와 함께 호출합니다.
7. 응답이 `DONE`이면 DB transaction 안에서 Payment 상태 변경, User 크레딧 증가, CreditLedger 기록을 함께 처리합니다.
8. 이미 완료된 결제는 다시 충전하지 않습니다.

## 주요 데이터 모델

| 모델 | 설명 |
| --- | --- |
| `User` | 로그인 사용자와 현재 크레딧 잔액 |
| `ApiKey` | API Key hash, prefix, 상태, 마지막 사용 시각 |
| `CreditPackage` | 판매할 크레딧 패키지 |
| `Payment` | Toss 결제 준비/승인/실패 상태 |
| `CreditLedger` | 충전, 사용, 환불, 조정 이력 |
| `UsageLog` | API 호출 비용, 응답 코드, request id |

## 주요 화면과 API

- `/signup`, `/login`: 인증 화면
- `/dashboard`: API Key 발급과 현재 크레딧 확인
- `/usage`: API 사용 로그 확인
- `/billing`: 크레딧 패키지 선택과 결제 시작
- `/billing/success`: Toss 결제 성공 redirect 처리
- `/api/api-keys`: API Key 발급/조회
- `/api/demo/ping`: 크레딧을 차감하는 샘플 API
- `/api/payments/prepare`: 결제 준비
- `/api/payments/confirm`: 결제 승인

## Demo API

Dashboard에서 API Key를 발급한 뒤 호출합니다.

```bash
curl http://localhost:3000/api/demo/ping \
  -H "Authorization: Bearer dc_test_..."
```

## 구현 포인트

- API Key 원문은 발급 직후 한 번만 보여주고 DB에는 hash와 prefix만 저장합니다.
- 결제 승인은 금액 검증, Toss Confirm API, DB transaction을 한 서비스 흐름으로 묶었습니다.
- 완료된 결제의 중복 승인 요청은 추가 충전 없이 같은 결과를 반환하도록 처리했습니다.
- 크레딧 증감 이력을 CreditLedger로 분리해 결제와 API 사용 기록을 추적할 수 있습니다.

## Toss Payments 테스트 메모

- Toss 테스트 client key는 브라우저에서 결제창을 여는 데 사용됩니다.
- Toss secret key는 서버의 Confirm API 호출에만 사용하고 공개 저장소에 올리지 않습니다.
- 결제 승인 시 요청 금액과 DB에 저장된 Payment 금액을 비교해 클라이언트 조작을 막습니다.
- `Idempotency-Key`를 사용해 같은 결제 승인 요청이 반복되어도 중복 충전되지 않게 처리합니다.

## 검증

```bash
npm test
npm run typecheck
npm run build
```

## GitHub 업로드 전 주의

- `.env`의 Toss Secret Key, DB URL, API Key pepper, session secret은 커밋하지 않습니다.
- Toss 테스트 키도 공개 저장소에 올리지 않습니다.
- `.next`, `node_modules`, 로그, 로컬 빌드 산출물은 업로드 대상에서 제외합니다.
