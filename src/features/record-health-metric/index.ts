// Design Ref: §2 — FSD Public API pattern
// 이 슬라이스의 외부 노출 항목만 re-export.
//
// 예시 (기능 구현 시 교체):
// export { RecordHealthMetricForm } from './ui/RecordHealthMetricForm'
// FHIR Observation POST 로직은 api/ 세그먼트에 — 직접 구현 필요 (TODO)
export {};
