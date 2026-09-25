// Design Ref: §3.6 — auth-login layout과 동일 구조
// 인증 전용 레이아웃 — 글로벌 네비게이션 없음
export default function SignupLayout({ children }: LayoutProps<"/signup">) {
  return <>{children}</>;
}
