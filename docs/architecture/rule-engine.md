# Rule Engine Architecture

## 1. 목적

Rule Engine은 사용자 입력을 법령 데이터와 Business Rule에 대조하여 **특정 투자 프로젝트에 적용되는 Procedure 목록**을 결정한다.

핵심 원칙은 deterministic evaluation이다. AI가 최종 적용 여부를 결정하지 않는다.

## 2. 실행 흐름

```text
ProjectInput
    ↓
Schema Validation
    ↓
Fact Normalization
    ↓
Candidate Rule Selection
    ↓
Rule Evaluation
    ↓
Conflict Resolution
    ↓
Procedure Resolution
    ↓
Evidence Validation
    ↓
Explanation Generation
    ↓
Procedure Instances
```

## 3. Fact model

Rule은 UI 입력 객체에 직접 의존하지 않고 normalized fact를 사용한다.

예:

```typescript
{
  key: 'industrialComplex.type',
  value: 'GENERAL',
  source: 'USER_INPUT'
}
```

Fact source:

- `USER_INPUT`
- `DERIVED`
- `LAW_LOOKUP`
- `OFFICIAL_DATA`

## 4. Candidate Rule Selection

모든 Rule을 매번 평가하지 않는다.

초기에는 category/index 기반으로 candidate를 좁힌다.

예:

```text
investmentType = NEW_FACTORY
industry.isManufacturing = true
industrialComplex.type = GENERAL
```

→ factory / industrial-complex / manufacturing 관련 Rule 후보만 평가한다.

향후 PostgreSQL JSONB index 또는 별도 rule tags를 사용한다.

## 5. Rule evaluation

MVP에서는 다음 recursive evaluator를 사용한다.

```typescript
function evaluate(condition: Condition, facts: FactMap): boolean {
  switch (condition.type) {
    case 'ALL':
      return condition.items.every(item => evaluate(item, facts));
    case 'ANY':
      return condition.items.some(item => evaluate(item, facts));
    case 'NOT':
      return !evaluate(condition.item, facts);
    case 'COMPARISON':
      return compare(condition.operator, getFact(facts, condition.fact), condition.value);
  }
}
```

실제 구현에서는 `any`/`all`을 JSON schema로 제한하여 무한 재귀나 임의 코드 실행을 방지한다.

## 6. Conflict resolution

예:

```text
Rule A → INCLUDE procedure X
Rule B → EXCLUDE procedure X
```

다음 우선순위로 판단한다.

1. 명시적 법정 exclusion
2. 명시적 법정 inclusion
3. 더 구체적인 Rule
4. 높은 priority
5. 최신 검증 version

그래도 충돌이 해결되지 않으면 자동 결정하지 않고 `REVIEW_REQUIRED`를 반환한다.

## 7. Mandatory / Conditional

Rule Action은 Procedure의 상태를 직접 결정할 수 있다.

- 법적 의무가 조건 없이 성립 → `MANDATORY`
- 특정 조건에서만 성립 → `CONDITIONAL`
- 기업 선택/지원 신청 → `OPTIONAL_SUPPORT`
- 판단에 필요한 fact 없음 → `INFORMATION_REQUIRED`
- 조건 불충족 → `NOT_APPLICABLE`

## 8. Evidence gate

Procedure를 결과에 표시하기 전 evidence를 검증한다.

```text
Procedure
  ↓
Legal basis exists?
  ├─ NO → LEGAL_VERIFICATION_REQUIRED
  └─ YES
       ↓
Law status current?
  ├─ NO → REVIEW_REQUIRED / OUTDATED
  └─ YES → display
```

조문번호를 Rule에서 생성하지 않는다. Rule은 `lawId`를 참조하고 실제 조문은 Law record에서 가져온다.

## 9. Explanation engine

각 판정은 explanation tree를 만든다.

```typescript
interface ExplanationReason {
  code: string;
  message: string;
  facts: string[];
  ruleCode?: string;
  lawIds?: string[];
}
```

UI:

```text
왜 필요한가?

① 투자유형 = 신규 공장
② 제조업 = 예
③ 산업단지 = 일반산업단지
④ RULE_FACTORY_001 적용
⑤ 관련 법령 근거 확인됨
```

## 10. Negative explanation

제외된 Procedure도 reason을 보존한다.

예:

```text
NOT_APPLICABLE

제외 이유:
사업이 산업단지 내에 위치하여
해당 개별입지 개발행위 절차의 적용조건을 충족하지 않음.

적용 Rule:
RULE_LAND_014
```

정보 부족:

```text
INFORMATION_REQUIRED

사업면적이 입력되지 않아
해당 평가 대상 여부를 확정할 수 없음.

필요 입력:
land.projectAreaM2
```

## 11. Rule versioning

Rule은 수정하지 않고 새 version을 만든다.

```text
RULE_ENV_001 v1 → retired
RULE_ENV_001 v2 → active
```

과거 ProjectInstance에는 사용 당시 version을 보존한다.

## 12. Rule testing

각 Rule은 최소 다음 fixture를 가진다.

```typescript
interface RuleFixture {
  name: string;
  input: ProjectInput;
  expected: {
    procedureCode: string;
    status: string;
  }[];
}
```

경계값 테스트가 특히 중요하다.

예:

```text
threshold - 1
threshold
threshold + 1
```

## 13. 금지사항

- JavaScript 문자열을 Rule로 실행하지 않는다.
- eval/new Function을 사용하지 않는다.
- AI output을 그대로 Rule Engine input으로 사용하지 않는다.
- 법령 근거가 없는 Rule을 법정 의무 Rule처럼 표시하지 않는다.
- Rule 충돌을 조용히 덮어쓰지 않는다.
