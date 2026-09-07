# DevCredit

개발자용 API 크레딧 충전 SaaS 예제입니다.

사용자는 회원가입 후 API Key를 발급받고, 샘플 API를 호출하면 크레딧이 차감됩니다. 크레딧 충전은 Toss Payments 테스트 결제 승인 흐름으로 처리합니다.

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
