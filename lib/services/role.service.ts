export type RoleOption = {
  value: string;
  label: string;
};

// Role sesuai schema Prisma
const SCHEMA_ROLES = {
  DEVELOPER: "DEVELOPER",
  OWNER: "OWNER",
  OWNERGROUP: "OWNERGROUP",
  STAFF: "STAFF",
  FINANCE: "FINANCE",
} as const;

const SCHEMA_ROLE_LABELS: Record<string, string> = {
  DEVELOPER: "Developer",
  OWNER: "Owner",
  OWNERGROUP: "Owner Group",
  STAFF: "Staff",
  FINANCE: "Finance",
};

export class RoleService {
  /**
   * Get all available roles (enum values sesuai schema Prisma)
   */
  static findAllActive(): RoleOption[] {
    return Object.values(SCHEMA_ROLES)
      .map((role) => ({
        value: role,
        label: SCHEMA_ROLE_LABELS[role] || role,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }
}

export type ActiveRole = RoleOption;
