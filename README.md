# 국내 지방투자 공장 인허가 Swimlane Dashboard

기업의 국내 지방투자 계획을 입력하면 법령과 검증된 Business Rule에 따라 필요한 인허가·신고·협의·평가·승인 절차를 선별하고, 절차 간 선후관계와 병렬처리를 Swimlane Dashboard로 보여주는 프로젝트입니다.

## 핵심 원칙

- 법적 근거 없는 절차를 임의 생성하지 않습니다.
- Law Data와 Business Rule을 분리합니다.
- 모든 판정은 적용 근거와 입력조건을 역추적할 수 있어야 합니다.
- 법정 처리기간과 예상기간을 구분합니다.
- AI는 법적 근거를 생성하지 않고 검색·구조화·설명을 보조합니다.
- 국가법령정보센터 등 공식 출처를 우선합니다.

## 개발계획

상세 architecture, 데이터 모델, Rule Engine, 법령 API, MVP 및 단계별 구현계획은 [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md)를 참고하세요.

## 현재 상태

Phase 1 — Foundation 설계 단계

현재 Repository에는 기존 애플리케이션 코드가 없으며, 초기 architecture를 새로 구축하고 있습니다.

## 면책

본 서비스는 관련 법령 및 공개된 행정자료를 기반으로 인허가 절차를 안내하기 위한 참고용 서비스이며, 개별 사업에 대한 최종적인 법률적 판단 또는 행정기관의 처분을 대신하지 않습니다.
