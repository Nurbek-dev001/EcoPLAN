import type { UserRole } from "./train-data";

export function getCurrentRole(): UserRole {
  if (typeof window === "undefined") return "manager";
  return (sessionStorage.getItem("demo_role") as UserRole) || "manager";
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!sessionStorage.getItem("demo_auth");
}

export function canEdit(): boolean {
  const role = getCurrentRole();
  return role === "manager";
}

export function canViewReports(): boolean {
  const role = getCurrentRole();
  return role === "analyst" || role === "director" || role === "manager" || role === "checker";
}

export function canEditSettings(): boolean {
  const role = getCurrentRole();
  return role === "admin_nsi";
}

export function canCalculate(): boolean {
  const role = getCurrentRole();
  return role === "manager" || role === "analyst";
}

export function canApprove(): boolean {
  const role = getCurrentRole();
  return role === "checker" || role === "director";
}

export function canManageTariffs(): boolean {
  const role = getCurrentRole();
  return role === "admin_nsi";
}

export function canViewAuditLog(): boolean {
  const role = getCurrentRole();
  return role === "checker" || role === "admin_nsi" || role === "director";
}
