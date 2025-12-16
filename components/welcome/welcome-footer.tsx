"use client";

import { UserForm } from "@/components/reusable/form";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import type { RoleOption } from "@/lib/services/role.service";

type WelcomeFooterProps = {
  roles: RoleOption[];
  owners?: Array<{ id: string; name: string }>;
  currentUserRole?: string;
  currentUserOwnerId?: string | null;
  gasStationId?: string;
};

export function WelcomeFooter({
  roles,
  owners = [],
  currentUserRole,
  currentUserOwnerId = null,
  gasStationId,
}: WelcomeFooterProps) {
  // Hanya DEVELOPER yang bisa akses
  const isDeveloper = currentUserRole === "DEVELOPER";

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
      <div className="rounded-2xl px-6 py-3">
        <div className="flex items-center justify-between gap-8">
          <div className="text-white text-sm">
            <span className="font-semibold">KOSTAS</span>
            <span className="text-white/70 ml-2">© 2024</span>
          </div>
          {isDeveloper && (
            <UserForm
              trigger={
                <Button variant="secondary">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
              }
              roles={roles}
              owners={owners}
              currentUserRole={currentUserRole}
              currentUserOwnerId={currentUserOwnerId}
              gasStationId={gasStationId}
              ownerOnly={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}

