// Design Ref: §2.10 — AppShell을 caregiver 라우트에 적용
import { AppShell } from "@widgets/app-shell";

interface Props {
  children: React.ReactNode;
}

export default function CaregiverLayout({ children }: Props) {
  return <AppShell>{children}</AppShell>;
}
