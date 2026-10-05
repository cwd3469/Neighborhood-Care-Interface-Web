// Design Ref: §2 — admin-dashboard public API
// Server helpers (app/admin/page.tsx에서 import)
export { fetchAdminUsers } from "./api/fetchAdminUsers";
export { fetchAllSchedules } from "./api/fetchAllSchedules";

// Client helpers (UI 컴포넌트에서 import)
export { deactivateUser } from "./api/deactivateUser";
export { createSenior, updateSenior, deleteSenior } from "./api/seniors";
export {
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from "./api/schedules";

// UI 컴포넌트
export { AdminUserChart } from "./ui/AdminUserChart";
export { UserTable } from "./ui/UserTable";
export { UserTabs } from "./ui/UserTabs";
export { SeniorTable } from "./ui/SeniorTable";
export { ScheduleTable } from "./ui/ScheduleTable";

// API
export { createUser } from "./api/createUser";
export type { CreateUserRequest, CreateUserRole } from "./api/createUser";
