"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { WelcomeNavbar } from "../../../components/welcome/navbar";
import { WelcomeSidebar } from "@/components/welcome/welcome-sidebar";
import { WelcomeFooter } from "@/components/welcome/welcome-footer";
import { PropertyWithDetails } from "@/lib/services/property.service";
import type { RoleOption } from "@/lib/services/role.service";
import type { OwnerForSelect } from "@/lib/services/user.service";

const WelcomeMap = dynamic(
  () =>
    import("@/components/welcome/welcome-map").then((mod) => ({
      default: mod.WelcomeMap,
    })),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-gray-900 animate-pulse" />,
  }
);

type WelcomeClientProps = {
  userName: string;
  userRole: string;
  properties: PropertyWithDetails[];
  roles: RoleOption[];
  owners: OwnerForSelect[];
  currentUserOwnerId?: string | null;
};

export function WelcomeClient({
  userName,
  userRole,
  properties,
  roles,
  owners,
  currentUserOwnerId = null,
}: WelcomeClientProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    null
  );
  const [popupTrigger, setPopupTrigger] = useState(0);

  const handlePropertySelect = (propertyId: string) => {
    // Jika property yang sama dipilih, reset dulu lalu set lagi untuk trigger popup
    if (selectedPropertyId === propertyId) {
      setSelectedPropertyId(null);
      setPopupTrigger((prev) => prev + 1);
      setTimeout(() => {
        setSelectedPropertyId(propertyId);
      }, 10);
    } else {
      setSelectedPropertyId(propertyId);
      setPopupTrigger((prev) => prev + 1);
    }
  };

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <WelcomeMap
          properties={properties}
          selectedId={selectedPropertyId}
          onPropertySelect={handlePropertySelect}
          popupTrigger={popupTrigger}
        />
      </div>
      <div
        className="absolute inset-0 z-5 pointer-events-none"
        style={{
          background: `
            linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 10%, rgba(0,0,0,0.1) 20%, transparent 30%),
            linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 10%, rgba(0,0,0,0.1) 20%, transparent 30%),
            linear-gradient(to left, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 15%, rgba(0,0,0,0.2) 25%, transparent 40%),
            linear-gradient(to right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 15%, rgba(0,0,0,0.2) 25%, transparent 40%)
          `,
        }}
      />
      <div className="absolute inset-0 z-10 pointer-events-none">
        <WelcomeNavbar userName={userName} userRole={userRole} />
        <WelcomeSidebar
          owners={owners}
          properties={properties}
          roles={roles}
          currentUserRole={userRole}
          currentUserOwnerId={currentUserOwnerId}
          onPropertySelect={handlePropertySelect}
        />
        <WelcomeFooter
          roles={roles}
          owners={owners}
          currentUserRole={userRole}
          currentUserOwnerId={currentUserOwnerId}
        />
      </div>
    </div>
  );
}
