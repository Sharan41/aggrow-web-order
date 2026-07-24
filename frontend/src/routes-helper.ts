import type { UserRole } from "./types";

export function homeForRole(role: UserRole): string {
  switch (role) {
    case "CUSTOMER":
      return "/customer/orders";
    case "HEAD_OFFICE":
      return "/ho/dashboard";
    case "ADMIN":
      return "/admin/dashboard";
    case "FACTORY":
      return "/factory/pending";
    default:
      return "/";
  }
}
