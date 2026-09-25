// 인증 전용 레이아웃 — 글로벌 네비게이션 없음
export default function LoginLayout({ children }: LayoutProps<"/login">) {
  return <>{children}</>;
}
