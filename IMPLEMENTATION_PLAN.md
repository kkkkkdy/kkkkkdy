# 국내 지방투자 공장 신설·증설 인허가 및 행정절차 Swimlane Dashboard

## 1. 문서 목적

본 문서는 국내 지방투자 사업의 조건을 입력하면 적용 가능한 법적 절차·인허가·신고·협의·평가·심사·승인 및 후속 행정절차를 근거 기반으로 조립하고, 절차 간 의존관계와 병렬성을 반영한 Swimlane Dashboard로 시각화하는 서비스의 구현 계획이다.

현재 Repository는 빈 상태이므로 기존 애플리케이션 architecture를 보존할 필요가 없다. 다만 초기부터 법령 데이터, Business Rule, 절차 그래프, UI를 분리하여 향후 전국 단위 확장이 가능한 구조를 채택한다.

## 2. 현재 Repository 분석

- Repository: `kkkkkdy/kkkkkdy`
- Default branch: `main`
- 현재 파일/소스코드: 없음
- Frontend: 없음
- Backend: 없음
- Database schema: 없음
- Test suite: 없음
- CI/CD workflow: 없음

따라서 이번 단계에서는 기반 문서와 환경설정 파일만 생성하고, 실제 애플리케이션 구현은 후속 Phase에서 진행한다.

## 3. 핵심 설계 원칙

1. 법적 근거 없는 절차를 생성하지 않는다.
2. Law Data와 Business Rule을 분리한다.
3. Rule Engine의 모든 판정은 설명 가능하고 역추적 가능해야 한다.
4. 법정 처리기간과 예상 행정기간·기업 준비기간을 분리한다.
5. 절차는 선후관계가 아닌 DAG로 모델링하여 병렬 수행을 지원한다.
6. 중앙법령, 행정규칙, 자치법규, 공식 행정자료의 출처 계층을 구분한다.
7. 법령의 개정일과 시행일을 구분한다.
8. 판단에 필요한 정보가 부족하면 `information_required` 상태로 남기고 추가 질문을 생성한다.
9. AI는 법적 근거의 생성자가 아니라 검색·구조화·설명의 보조 계층으로 사용한다.
10. 비밀정보는 frontend에 전달하지 않는다.

## 4. 목표 Architecture

```text
[React + TypeScript Frontend]
          |
          v
[Application REST API]
          |
   +------+------------------+
   |                         |
   v                         v
[Rule Engine]          [Law Data Service]
   |                         |
   |                         v
   |                  [Law Source Adapter]
   |                         |
   |                  [국가법령정보센터 API]
   v
[Procedure Resolver]
   |
   v
[Dependency / DAG Builder]
   |
   v
[Timeline / Critical Path]
   |
   v
[Swimlane Dashboard]

                 [PostgreSQL]
                 /    |     \
              Laws Rules Procedures
```

### 권장 기술 스택

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Graph/Swimlane: React Flow 중심. Timeline은 별도 SVG/HTML 렌더러로 구현하고 필요 시 라이브러리 추가
- Backend: Node.js + TypeScript
- API: REST
- Database: PostgreSQL
- Validation: Zod 또는 동등한 schema validation
- Test: Vitest/Jest + API integration tests
- CI: GitHub Actions
- Deployment: Frontend Vercel, Backend managed Node hosting 등으로 분리 가능

MVP에서는 별도 마이크로서비스보다 단일 Backend Application + domain modules 구조를 권장한다. 법령 API adapter와 Rule Engine은 명확한 module boundary를 둔다.

## 5. Repository 구조

```text
/
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── services/
│   ├── stores/
│   ├── types/
│   └── utils/
├── backend/
│   ├── api/
│   ├── domain/
│   │   ├── law/
│   │   ├── procedure/
│   │   ├── rule/
│   │   ├── project/
│   │   └── timeline/
│   ├── services/
│   ├── repositories/
│   ├── integrations/
│   │   └── law-api/
│   └── database/
├── data/
│   ├── laws/
│   ├── procedures/
│   ├── rules/
│   ├── industries/
│   ├── regions/
│   └── authorities/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── scenarios/
├── docs/
├── .github/workflows/
├── .env.example
├── .gitignore
├── README.md
└── package.json
```

## 6. Domain Model

### 6.1 Law

법령 자체를 표현한다.

주요 필드:

- `law_id`
- `law_name`
- `law_type`
- `law_identifier`
- `article`
- `paragraph`
- `subparagraph`
- `article_title`
- `effective_date`
- `promulgation_date`
- `revision_date`
- `status`
- `source`
- `source_url`
- `last_verified_at`
- `raw_source_hash`

### 6.2 Procedure

기업이 실제로 수행해야 하는 행정행위를 표현한다.

- `procedure_id`
- `procedure_name`
- `category`
- `subcategory`
- `description`
- `applicant_type`
- `responsible_ministry`
- `responsible_agency`
- `local_authority`
- `application_method`
- `required_documents`
- `statutory_processing_period`
- `duration_source`
- `mandatory_status`
- `legal_verification_status`
- `verification_date`

### 6.3 ProcedureLegalBasis

하나의 절차가 여러 법령·조문을 근거로 가질 수 있으므로 별도 관계 테이블로 관리한다.

- `procedure_id`
- `law_id`
- `basis_role`
- `effective_from`
- `effective_to`

### 6.4 Rule

조건과 결과를 데이터로 관리한다.

```json
{
  "rule_id": "RULE_FACTORY_001",
  "version": 1,
  "priority": 100,
  "when": {
    "all": [
      { "field": "investment_type", "operator": "eq", "value": "new_factory" },
      { "field": "industry.is_manufacturing", "operator": "eq", "value": true }
    ]
  },
  "then": {
    "procedure_id": "FACTORY_ESTABLISHMENT",
    "status": "CONDITIONAL"
  },
  "evidence": ["LAW-..."],
  "last_verified_at": "YYYY-MM-DD"
}
```

Rule은 법령 문구 자체가 아니라 **적용조건과 판정 결과**를 표현한다.

### 6.5 ProjectInput

사용자가 입력한 투자계획의 정규화된 snapshot.

주요 영역:

- investment
- industry / KSIC
- location
- industrial_complex
- land
- building
- environment
- water
- wastewater
- electricity
- chemicals
- fire_safety
- assessments
- other_conditions

### 6.6 ProcedureInstance

특정 ProjectInput에 Rule Engine을 적용한 결과다.

- `instance_id`
- `project_id`
- `procedure_id`
- `status`
- `reason_codes`
- `matched_rules`
- `required_information`
- `confidence`는 법적 확률이 아니라 데이터 완결성/판정상태 보조정보로만 사용
- `created_at`

### 6.7 Dependency

절차 간 선행·후행 관계.

- `from_procedure_id`
- `to_procedure_id`
- `dependency_type`
- `condition`
- `source`

법적 선행관계와 실무상 권장 선행관계를 반드시 구분한다.

## 7. 상태 모델

내부적으로는 다음 enum을 사용한다.

- `MANDATORY`
- `CONDITIONAL`
- `OPTIONAL_SUPPORT`
- `INFORMATION_REQUIRED`
- `NOT_APPLICABLE`
- `LEGAL_VERIFICATION_REQUIRED`
- `REVIEW_REQUIRED`
- `OUTDATED`

UI에서는 요청된 5개 사용자 상태를 중심으로 보여주되, 법령 검증 상태는 별도 badge로 표시한다.

## 8. Rule Engine 설계

Rule Engine은 hard-coded IF문을 최소화하고 declarative rule을 사용한다.

### 평가 순서

1. ProjectInput schema validation
2. 기본 필수조건 계산
3. 산업분류/지역/산단 정규화
4. Rule candidate selection
5. Rule evaluation
6. Procedure deduplication
7. 제외 Rule 평가
8. 정보 부족 여부 계산
9. legal evidence 연결
10. dependency 생성
11. explanation 생성
12. 최종 ProcedureInstance 반환

### Rule 우선순위

- 명시적 법정 제외 Rule
- 명시적 법정 적용 Rule
- 지역/산업 특화 Rule
- 보조적 행정자료 Rule
- 권고 Rule

동일 조건에서 충돌하면 더 높은 법적 근거 수준과 명시적 exclusion을 우선한다. 충돌을 자동 은폐하지 않고 `REVIEW_REQUIRED`로 남긴다.

## 9. 설명 가능성

각 ProcedureInstance에는 다음을 저장한다.

```text
matched_rules
legal_basis_ids
input_facts_used
reason_codes
excluded_by_rules
missing_facts
```

따라서 다음 질문에 답할 수 있어야 한다.

- 왜 표시됐는가?
- 어떤 입력값이 영향을 줬는가?
- 어떤 법령 근거가 연결됐는가?
- 어떤 Rule이 작동했는가?
- 왜 표시되지 않았는가?
- 어떤 정보가 부족한가?

## 10. 법령 API Architecture

Frontend에서 국가법령정보센터 API를 직접 호출하지 않는다.

```text
Frontend
  -> /api/laws/*
  -> LawDataService
  -> LawSourceAdapter
  -> 국가법령정보센터 API
```

환경변수:

```text
LAW_API_KEY=
LAW_API_BASE_URL=
DATABASE_URL=
```

### Adapter 책임

- authentication
- request construction
- response normalization
- retry
- timeout
- rate-limit handling
- source metadata preservation
- schema validation
- cache lookup

원본 API response를 그대로 domain model로 사용하지 않고 내부 canonical model로 변환한다.

## 11. 법령 검증 및 변경감지

Law record는 다음 상태를 가진다.

- `VERIFIED`
- `REVIEW_REQUIRED`
- `OUTDATED`
- `SOURCE_REQUIRED`

정기 동기화 시 법령명, 조문, 시행일, 개정일, 법령 상태 및 source hash를 비교한다.

변경이 감지되면 관련 Procedure와 Rule을 자동 삭제하지 않고 `REVIEW_REQUIRED`로 전환한다. 담당자가 검증한 후 새로운 version을 활성화한다.

## 12. 법령 출처 우선순위

1. 법률
2. 대통령령
3. 총리령·부령
4. 행정규칙
5. 자치법규
6. 중앙정부 공식자료
7. 공공기관 공식자료

블로그·카페·개인 홈페이지는 법적 근거 source로 등록하지 않는다.

## 13. 지역 모델

지역은 최소 다음 hierarchy를 가진다.

```text
국가
 └─ 시·도
     └─ 시·군·구
         └─ 읍·면·동 (필요 시)
```

자치법규와 산업단지 관리계획은 location scope를 별도로 관리한다.

## 14. 산업단지 모델

`industrial_complex_type` enum:

- `NATIONAL`
- `GENERAL`
- `URBAN_HIGH_TECH`
- `AGRICULTURAL`
- `NONE`
- `UNKNOWN`

산단별 관리기관, 관리계획, 입주조건을 별도 entity로 관리하여 특정 산단의 예외를 표현할 수 있게 한다.

## 15. 업종 모델

KSIC 기반 hierarchy를 사용한다.

```text
대분류
 └─ 중분류
     └─ 소분류
         └─ 세분류
             └─ 세세분류
```

사용자 UI에서는 검색 중심으로 제공하고 Rule Engine에는 정규화된 KSIC code를 전달한다.

## 16. Dependency / DAG

절차 그래프는 DAG를 기본으로 한다.

각 edge는 다음을 표현한다.

- legal prerequisite
- administrative prerequisite
- recommended sequence
- information dependency

순환 dependency가 발생하면 배포/활성화 전에 validation error로 처리한다.

### Critical Path

최단/일반/보수 기간을 계산할 때 각 procedure의 기간 source를 구분한다.

```text
project duration = critical path duration
```

단순 합산을 금지한다.

## 17. 기간 데이터

기간은 최소 다음을 구분한다.

- statutory_days
- administrative_estimate_days
- applicant_preparation_days
- calendar_or_working_days
- source
- verified_at

근거 없는 숫자는 production data에 입력하지 않는다.

MVP에서 근거가 없는 예상기간은 `정보 부족`으로 표시할 수 있으며 임의의 숫자로 대체하지 않는다.

## 18. Frontend 화면 구조

### Stepper

1. 투자유형
2. 업종
3. 지역
4. 산업단지
5. 규모
6. 환경·전력·용수·화학 등 특수조건
7. 결과 생성

### Dashboard

상단 summary:

- 총 절차
- 필수
- 조건부
- 확인 필요
- 최소/일반/보수 기간

중앙:

- Swimlane
- Timeline
- Procedure Card

우측:

- Procedure Detail Panel
- 법적 근거
- 적용 이유
- 선행/후행
- 제출서류

## 19. Swimlane 구현

기관별 lane은 실제 ProcedureInstance가 존재하는 기관만 표시한다.

카드에는 다음을 표시한다.

- procedure name
- authority
- status
- duration
- prerequisite
- legal basis

React Flow를 활용하되, 시간축은 x-coordinate 계산을 별도 domain utility로 관리한다. 그래프 UI와 시간 계산을 결합하지 않는다.

## 20. “왜 표시됐나요?” / “왜 빠졌나요?”

Explanation engine을 별도 module로 둔다.

예:

```text
적용 이유
① investment_type = new_factory
② industry.is_manufacturing = true
③ industrial_complex_type = GENERAL
④ Rule RULE_FACTORY_001 matched
⑤ Law LAW_001 Article ... linked
```

제외:

```text
현재 입력값에서는 사업면적이 확인되지 않아
환경영향평가 대상 여부를 확정할 수 없습니다.
→ INFORMATION_REQUIRED
```

## 21. AI Architecture

AI는 다음 영역에서만 사용한다.

- 자연어 → ProjectInput 후보 변환
- 추가 질문 생성
- 법령 검색 query 생성
- 공식 source 요약
- procedure 설명

AI가 직접 `procedure_id`, 조문번호, 법적 의무를 창작하지 못하도록 한다.

```text
User natural language
      ↓
AI structured extraction
      ↓
Schema validation
      ↓
Law/Rule retrieval
      ↓
Deterministic Rule Engine
      ↓
Evidence-backed answer
```

## 22. MVP 범위

### Case 1

반도체 제조 / 전북 / 산업단지 / 신규 투자

### Case 2

자동차부품 / 경남 / 산업단지 / 증설

### Case 3

일반 제조 / 개별입지 / 신규 설립

### Case 4

화학물질 취급 제조 / 산업단지 / 신규 설립

MVP는 전국 모든 지자체를 데이터화하지 않는다. 대표 케이스를 통해 architecture와 Rule Engine을 검증한다.

## 23. 테스트 전략

### Unit

- Rule operators
- Rule precedence
- status calculation
- dependency validation
- critical path calculation
- law status filtering

### Integration

- ProjectInput → Rule Engine
- Law Adapter → canonical Law
- Procedure → legal basis
- DAG → timeline

### Scenario

1. 산업단지 + 제조업 + 신규
2. 개별입지 + 제조업 + 신규
3. 산업단지 + 기존공장 + 증설
4. 농지
5. 산지
6. 폐수
7. 대기배출시설
8. 유해화학물질
9. 대규모 전력
10. 대규모 용수

테스트는 '절차가 많이 나오는가'가 아니라 **예상되는 법적 근거와 상태가 정확히 매칭되는가**를 검증해야 한다.

## 24. 보안

- `LAW_API_KEY`는 backend 환경변수
- `.env`, `.env.local` commit 금지
- `.env.example`에는 key 이름만 기록
- 사용자 입력은 schema validation
- 외부 API response도 validation
- secret은 로그에 출력하지 않음
- 법령 원문은 source URL을 보존

## 25. CI/CD

GitHub Actions 기본 pipeline:

```text
install
 → lint
 → typecheck
 → unit test
 → integration test
 → build
```

법령 데이터 변경 PR에서는 별도의 data validation을 실행한다.

## 26. 개발 Phase

### Phase 1 — Foundation

- Repository 초기화
- README
- IMPLEMENTATION_PLAN
- package configuration
- env/gitignore
- 기본 CI

### Phase 2 — UI skeleton

- Input wizard
- Dashboard
- Swimlane
- Procedure card
- Detail panel

### Phase 3 — Rule Engine

- ProjectInput schema
- Rule schema
- rule evaluator
- explanation
- 4개 MVP case

### Phase 4 — Data model

- PostgreSQL
- Law/Procedure/Rule/Region/Industry/Authority
- migrations
- seed

### Phase 5 — Law API

- adapter
- caching
- retry
- rate limit
- normalization

### Phase 6 — Verification

- legal evidence
- effective date
- obsolete filtering
- change detection

### Phase 7 — DAG / Timeline

- dependencies
- parallel processing
- critical path
- duration source distinction

### Phase 8 — Test hardening

- unit
- integration
- scenario
- data validation

### Phase 9 — Production

- deployment
- environment variables
- monitoring
- scheduled law synchronization

## 27. 기술적 리스크

### 법령 API 변경

Adapter를 독립 module로 두고 canonical model을 사용한다.

### 법령 변경과 Rule 불일치

Law version과 Rule version을 별도로 관리하고 변경 시 review queue를 생성한다.

### 지역별 예외 폭증

전국 확장 전에 scope hierarchy와 override mechanism을 정의한다.

### DAG cycle

Rule activation 시 graph validation을 수행한다.

### 데이터 품질

각 Procedure/Rule에 source와 verification metadata를 강제한다.

### UI 복잡성

MVP에서는 카드/필터/detail 중심으로 구현하고 복잡한 그래프 interaction은 후순위로 둔다.

## 28. 법적/운영상 리스크

1. 법령 원문과 행정기관 실제 처리방식이 다를 수 있다.
2. 자치법규와 개별 산업단지 관리계획의 최신성이 다를 수 있다.
3. 사업 조건이 부족하면 법적 적용 여부를 확정할 수 없다.
4. 행정기관의 내부 처리기간은 법정기간과 다를 수 있다.
5. 본 서비스는 법률자문이나 행정기관의 처분을 대체하지 않는다.

UI 면책 문구:

> 본 서비스는 관련 법령 및 공개된 행정자료를 기반으로 인허가 절차를 안내하기 위한 참고용 서비스이며, 개별 사업에 대한 최종적인 법률적 판단 또는 행정기관의 처분을 대신하지 않습니다.

## 29. 데이터 품질 Gate

Production에 활성화할 Procedure/Rule은 최소한 다음을 만족해야 한다.

- legal basis 존재
- source URL 존재
- effective date 확인
- verification date 존재
- applicability rule 존재 또는 명시적 universal applicability 근거
- 담당기관 확인

이를 만족하지 못하면 `SOURCE_REQUIRED` 또는 `REVIEW_REQUIRED` 상태로 둔다.

## 30. 이번 커밋 범위

이번 Phase 1에서는 다음 파일만 기반으로 생성한다.

- `IMPLEMENTATION_PLAN.md`
- `README.md`
- `.gitignore`
- `.env.example`
- `package.json`

실제 Frontend/Backend/DB 구현은 계획 검토 이후 다음 Phase에서 진행한다.

## 31. Definition of Done

Phase 1 완료 조건:

- Repository 구조가 문서화됨
- architecture가 문서화됨
- Law/Procedure/Rule 모델이 정의됨
- Rule Engine 흐름이 정의됨
- DAG/critical path 구조가 정의됨
- 법령 API adapter 경계가 정의됨
- MVP가 정의됨
- 테스트 전략이 정의됨
- 법적/기술적 리스크가 정의됨
- secret 관리 원칙이 정의됨

다음 단계는 Phase 2의 UI skeleton 구현이다. 단, Phase 2 전에 DB schema와 Rule schema를 실제 TypeScript/Zod 모델로 구체화하는 작업을 먼저 수행한다.
