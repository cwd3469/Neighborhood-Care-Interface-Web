// Design Ref: §2 — FSD Public API pattern
// 이 슬라이스의 외부 노출 항목만 re-export.
// 세그먼트 내부 파일(ui/xxx.tsx)을 직접 import하지 말 것.
//
// 예시 (기능 구현 시 교체):
// export { PatientCard } from './ui/PatientCard'
// export type { Patient } from './model/types'
export {};
