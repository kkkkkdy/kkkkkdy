# Domain Model — Law / Procedure / Rule / Dependency

## 1. 설계 원칙

이 프로젝트의 핵심 데이터는 **Law(법령)**, **Procedure(행정절차)**, **Rule(적용판정 규칙)**, **Dependency(절차 의존관계)**를 분리한다.

```text
Law ──< ProcedureLegalBasis >── Procedure
                                ▲
                                │ selected by
                                │
ProjectInput ──> Rule ───────────┘
                                │
                                ▼
                       ProcedureInstance
                                │
                                ▼
                           Dependency
                                │
                                ▼
                         Timeline / DAG
```

Law는 법적 사실(source of truth), Rule은 적용 판단, Procedure는 기업이 수행하는 행위, ProcedureInstance는 특정 투자 프로젝트에 대한 판정 결과다.

## 2. PostgreSQL Schema

### laws

```sql
CREATE TABLE laws (
  id UUID PRIMARY KEY,
  law_name TEXT NOT NULL,
  law_type TEXT NOT NULL,
  law_identifier TEXT,
  article TEXT,
  paragraph TEXT,
  subparagraph TEXT,
  article_title TEXT,
  promulgation_date DATE,
  effective_date DATE,
  revision_date DATE,
  status TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_hash TEXT,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### procedures

```sql
CREATE TABLE procedures (
  id UUID PRIMARY KEY,
  procedure_code TEXT NOT NULL UNIQUE,
  procedure_name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT,
  applicant_type TEXT,
  responsible_ministry TEXT,
  responsible_agency TEXT,
  local_authority TEXT,
  application_method TEXT,
  required_documents JSONB NOT NULL DEFAULT '[]',
  statutory_days_min INTEGER,
  statutory_days_max INTEGER,
  statutory_day_type TEXT,
  duration_source TEXT,
  legal_verification_status TEXT NOT NULL,
  verification_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### procedure_legal_bases

```sql
CREATE TABLE procedure_legal_bases (
  procedure_id UUID NOT NULL REFERENCES procedures(id),
  law_id UUID NOT NULL REFERENCES laws(id),
  basis_role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (procedure_id, law_id, basis_role)
);
```

`basis_role` 예: `MANDATORY_BASIS`, `THRESHOLD_BASIS`, `EXEMPTION_BASIS`, `PROCESS_BASIS`.

### rules

```sql
CREATE TABLE rules (
  id UUID PRIMARY KEY,
  rule_code TEXT NOT NULL UNIQUE,
  version INTEGER NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL,
  condition JSONB NOT NULL,
  action JSONB NOT NULL,
  evidence JSONB NOT NULL DEFAULT '[]',
  effective_from DATE,
  effective_to DATE,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rule_code, version)
);
```

### projects

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  name TEXT,
  input_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

초기 MVP에서는 ProjectInput을 JSONB snapshot으로 저장한다. 이후 검색/통계 요구가 커지면 자주 필터링되는 속성만 정규화한다.

### procedure_instances

```sql
CREATE TABLE procedure_instances (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  procedure_id UUID NOT NULL REFERENCES procedures(id),
  status TEXT NOT NULL,
  reason_codes JSONB NOT NULL DEFAULT '[]',
  matched_rules JSONB NOT NULL DEFAULT '[]',
  input_facts_used JSONB NOT NULL DEFAULT '[]',
  excluded_by_rules JSONB NOT NULL DEFAULT '[]',
  missing_information JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, procedure_id)
);
```

### dependencies

```sql
CREATE TABLE dependencies (
  id UUID PRIMARY KEY,
  from_procedure_id UUID NOT NULL REFERENCES procedures(id),
  to_procedure_id UUID NOT NULL REFERENCES procedures(id),
  dependency_type TEXT NOT NULL,
  condition JSONB,
  source JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(from_procedure_id, to_procedure_id, dependency_type)
);
```

## 3. Supporting master data

MVP부터 다음 master data를 별도 entity로 둔다.

- `industries` — KSIC code hierarchy
- `regions` — 시·도 / 시·군·구 hierarchy
- `industrial_complexes` — 산단 유형 및 관리기관
- `authorities` — 중앙/지방/공공기관

이 데이터는 Rule의 문자열 오타를 줄이고 검색/필터링을 안정화한다.

## 4. Rule JSON Schema 개념

Rule은 다음 구조를 따른다.

```json
{
  "ruleCode": "FACTORY.NEW.MANUFACTURING.001",
  "version": 1,
  "priority": 100,
  "status": "ACTIVE",
  "when": {
    "all": [
      { "fact": "investment.type", "op": "eq", "value": "NEW_FACTORY" },
      { "fact": "industry.isManufacturing", "op": "eq", "value": true }
    ]
  },
  "then": [
    {
      "effect": "INCLUDE_PROCEDURE",
      "procedureCode": "FACTORY_ESTABLISHMENT",
      "status": "CONDITIONAL"
    }
  ],
  "evidence": [
    { "lawId": "...", "role": "MANDATORY_BASIS" }
  ]
}
```

### MVP operators

- `eq`
- `neq`
- `in`
- `not_in`
- `gt`
- `gte`
- `lt`
- `lte`
- `exists`
- `contains`
- `and`
- `or`
- `not`

복잡한 표현식 언어를 처음부터 도입하지 않는다.

## 5. Rule Action

지원하는 action은 최소화한다.

- `INCLUDE_PROCEDURE`
- `EXCLUDE_PROCEDURE`
- `REQUIRE_INFORMATION`
- `SET_STATUS`
- `ADD_REASON`
- `ADD_DEPENDENCY`

법적 근거가 없는 자유로운 텍스트 action은 허용하지 않는다.

## 6. 판정 결과

Rule Engine은 다음 형태의 결과를 반환한다.

```typescript
interface ProcedureResolution {
  procedureCode: string;
  status:
    | 'MANDATORY'
    | 'CONDITIONAL'
    | 'OPTIONAL_SUPPORT'
    | 'INFORMATION_REQUIRED'
    | 'NOT_APPLICABLE'
    | 'LEGAL_VERIFICATION_REQUIRED';
  matchedRules: string[];
  legalBasisIds: string[];
  inputFactsUsed: string[];
  excludedByRules: string[];
  missingInformation: string[];
  reasons: ExplanationReason[];
}
```

## 7. TypeScript Domain Model

```typescript
export type InvestmentType =
  | 'NEW_FACTORY'
  | 'FACTORY_EXPANSION'
  | 'FACTORY_RELOCATION'
  | 'PRODUCTION_LINE_EXPANSION'
  | 'RND_FACILITY'
  | 'LOGISTICS_FACILITY';

export type IndustrialComplexType =
  | 'NATIONAL'
  | 'GENERAL'
  | 'URBAN_HIGH_TECH'
  | 'AGRICULTURAL'
  | 'NONE'
  | 'UNKNOWN';

export interface ProjectInput {
  investmentType: InvestmentType;
  industry: {
    ksicCode?: string;
    isManufacturing: boolean;
  };
  location: {
    provinceCode?: string;
    municipalityCode?: string;
  };
  industrialComplex: {
    isInside: boolean;
    type: IndustrialComplexType;
    complexCode?: string;
  };
  land: {
    agricultural: boolean;
    forest: boolean;
    existingSite: boolean;
  };
  scale: {
    factoryAreaM2?: number;
    buildingAreaM2?: number;
    floorAreaM2?: number;
    investmentAmount?: number;
    employment?: number;
  };
  environment: {
    wastewater: boolean;
    airEmission: boolean;
    waste: boolean;
  };
  utilities: {
    waterM3PerDay?: number;
    electricityMW?: number;
  };
  chemicals: {
    hazardousChemical: boolean;
    dangerousGoods: boolean;
  };
  assessments: {
    environmentalImpact?: boolean;
    trafficImpact?: boolean;
    disasterImpact?: boolean;
    powerSystemImpact?: boolean;
  };
}
```

## 8. Dependency model

```typescript
export type DependencyType =
  | 'LEGAL_PREREQUISITE'
  | 'ADMINISTRATIVE_PREREQUISITE'
  | 'RECOMMENDED_SEQUENCE'
  | 'INFORMATION_DEPENDENCY';

export interface ProcedureDependency {
  fromProcedureCode: string;
  toProcedureCode: string;
  type: DependencyType;
  source: EvidenceReference[];
}
```

`LEGAL_PREREQUISITE`와 `RECOMMENDED_SEQUENCE`를 UI에서 동일한 화살표로 표시하지 않는다.

## 9. 법령 검증 상태

```typescript
export type LegalVerificationStatus =
  | 'VERIFIED'
  | 'REVIEW_REQUIRED'
  | 'OUTDATED'
  | 'SOURCE_REQUIRED';
```

`VERIFIED`는 API/source 확인을 통과했다는 의미이지 해당 사업에 대한 최종 법률판단을 의미하지 않는다.

## 10. 데이터 변경 전략

Law는 versioned data로 취급한다. 기존 record를 덮어써서 과거 판정의 근거를 잃지 않도록 한다.

Rule도 `rule_code + version`으로 관리한다.

Procedure Instance는 실행 당시의 matched rule version과 law evidence를 snapshot으로 보존한다.

## 11. Migration 우선순위

1. extensions / UUID strategy
2. laws
3. procedures
4. procedure_legal_bases
5. rules
6. projects
7. procedure_instances
8. dependencies
9. industries / regions / authorities / industrial_complexes

## 12. 구현 시 주의사항

- 법령 조문번호를 Rule JSON에 자유 텍스트로 입력하지 않고 Law ID를 참조한다.
- Rule은 반드시 하나 이상의 evidence를 가져야 한다. 단, 내부 UI/비법정 보조 Rule은 별도 source type으로 명확히 표시한다.
- Procedure는 법령과 1:1로 묶지 않는다. 하나의 절차가 여러 법령에 근거할 수 있다.
- 하나의 Law도 여러 Procedure의 법적 근거가 될 수 있다.
- Procedure dependency는 Rule과 분리하여 관리한다.
- 법령 변경 시 기존 판정 결과를 재현할 수 있어야 한다.
