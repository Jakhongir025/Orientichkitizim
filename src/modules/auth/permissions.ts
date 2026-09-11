export const permissions = {
  SUPER_ADMIN: ["*"],
  ADMIN: [
    "dashboard.read",
    "employees.read",
    "attendance.read",
    "attendance.write",
    "reports.read",
    "reports.write",
    "cars.read",
    "cars.write",
    "services.write",
    "documents.read",
    "documents.write",
    "types.write",
    "rentals.read",
    "rentals.sensitive",
    "notifications.read",
  ],
  EMPLOYEE: [
    "dashboard.read",
    "attendance.write",
    "reports.write",
    "cars.read",
    "services.write",
    "rentals.read",
    "notifications.read",
  ],
};
export const hasPermission = (grants: string[], permission: string) =>
  grants.includes("*") || grants.includes(permission);
