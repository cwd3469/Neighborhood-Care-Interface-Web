// middleware.ts가 role 기반으로 리디렉션 처리
// 이 페이지는 미들웨어 미동작 시 fallback
import { redirect } from 'next/navigation'

export default function DashboardPage() {
  redirect('/login')
}
