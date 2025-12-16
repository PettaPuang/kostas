"use client";

import { useState, useMemo } from "react";
import { MapPin, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { UserForm, PropertyForm } from "@/components/reusable/form";
import { Button } from "@/components/ui/button";
import { getUserById } from "@/lib/actions/user.actions";
import { toast } from "sonner";
import type { PropertyWithDetails } from "@/lib/services/property.service";
import type { OwnerForSelect } from "@/lib/services/user.service";
import type { RoleOption } from "@/lib/services/role.service";

type WelcomeSidebarProps = {
  owners: OwnerForSelect[];
  properties: PropertyWithDetails[];
  roles: RoleOption[];
  currentUserRole?: string;
  currentUserOwnerId?: string | null;
  onPropertySelect?: (propertyId: string) => void;
};

export function WelcomeSidebar({
  owners,
  properties,
  roles,
  currentUserRole,
  currentUserOwnerId,
  onPropertySelect,
}: WelcomeSidebarProps) {
  // Filter owners untuk sidebar:
  // - DEVELOPER: semua owner yang punya userId (punya User dengan role OWNER)
  // - OWNER/OWNERGROUP: hanya owner mereka sendiri (berdasarkan currentUserOwnerId)
  const sidebarOwners = useMemo(() => {
    let filtered = owners.filter((owner) => (owner as any).userId);

    // Jika OWNER atau OWNERGROUP, hanya tampilkan owner mereka sendiri
    if (
      (currentUserRole === "OWNER" || currentUserRole === "OWNERGROUP") &&
      currentUserOwnerId
    ) {
      filtered = filtered.filter((owner) => owner.id === currentUserOwnerId);
    }

    return filtered;
  }, [owners, currentUserRole, currentUserOwnerId]);

  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(
    sidebarOwners.length > 0 ? sidebarOwners[0].id : null
  );
  const [headerSlideDirection, setHeaderSlideDirection] = useState<
    "left" | "right" | null
  >(null);
  const [propertySlideDirection, setPropertySlideDirection] = useState<
    "left" | "right" | null
  >(null);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [editUserData, setEditUserData] = useState<{
    id: string;
    email: string;
    role: string;
    displayName?: string | null;
    ownerId?: string | null;
  } | null>(null);
  const [propertyFormOpen, setPropertyFormOpen] = useState(false);

  // Group properties by owner
  const propertiesByOwner = useMemo(() => {
    const grouped: Record<string, PropertyWithDetails[]> = {};
    properties.forEach((property) => {
      const ownerId = property.ownerId;
      if (!grouped[ownerId]) {
        grouped[ownerId] = [];
      }
      grouped[ownerId].push(property);
    });
    return grouped;
  }, [properties]);

  const selectedProperties = selectedOwnerId
    ? propertiesByOwner[selectedOwnerId] || []
    : [];

  // Get current owner index
  const currentOwnerIndex = selectedOwnerId
    ? sidebarOwners.findIndex((owner) => owner.id === selectedOwnerId)
    : -1;

  const currentOwner =
    currentOwnerIndex >= 0 ? sidebarOwners[currentOwnerIndex] : null;
  const propertyCount = currentOwner
    ? propertiesByOwner[currentOwner.id]?.length || 0
    : 0;

  // Handle owner name click to edit user
  const handleOwnerNameClick = async () => {
    if (!currentOwner) return;

    // currentOwner.id adalah Owner.id, tapi kita perlu userId untuk edit user
    const userId = (currentOwner as any).userId || currentOwner.id;
    const result = await getUserById(userId);
    if (result.success && result.data) {
      setEditUserData({
        id: result.data.id,
        email: result.data.email,
        role: result.data.role,
        displayName: result.data.displayName,
        ownerId: result.data.ownerId,
      });
      setUserFormOpen(true);
    } else {
      toast.error(result.message || "Gagal mengambil data user");
    }
  };

  // Navigate to previous/next owner with loop
  const navigateOwner = (direction: "prev" | "next") => {
    if (currentOwnerIndex === -1 || sidebarOwners.length === 0) return;

    // Set slide direction (out)
    const slideDir = direction === "prev" ? "right" : "left";
    setHeaderSlideDirection(slideDir);
    setPropertySlideDirection(slideDir);

    // Calculate next index with loop
    let nextIndex = currentOwnerIndex;
    if (direction === "prev") {
      nextIndex =
        currentOwnerIndex === 0
          ? sidebarOwners.length - 1
          : currentOwnerIndex - 1;
    } else {
      nextIndex =
        currentOwnerIndex === sidebarOwners.length - 1
          ? 0
          : currentOwnerIndex + 1;
    }

    // Update owner after slide out animation
    setTimeout(() => {
      setSelectedOwnerId(sidebarOwners[nextIndex].id);

      // Reset header slide (slide in) after 200ms
      setTimeout(() => {
        setHeaderSlideDirection(null);
      }, 200);

      // Reset property slide (slide in) after 350ms
      setTimeout(() => {
        setPropertySlideDirection(null);
      }, 350);
    }, 100);
  };

  return (
    <div className="fixed left-6 top-24 bottom-6 z-20 pointer-events-auto">
      <div className="rounded-3xl w-80 h-full flex flex-col overflow-hidden">
        {/* Owner Header dengan Chevron */}
        <div className="relative border-b border-white/10 px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Chevron Left - Always visible for loop */}
            {sidebarOwners.length > 1 && (
              <button
                onClick={() => navigateOwner("prev")}
                className="flex items-center transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-white hover:text-orange-500 interactive-hover" />
              </button>
            )}
            {sidebarOwners.length <= 1 && <div className="w-5" />}

            {/* Owner Name with slide transition */}
            <div className="flex-1 text-center overflow-hidden relative">
              <div
                className={`transition-transform duration-500 ease-in-out ${
                  headerSlideDirection === "left"
                    ? "translate-x-full"
                    : headerSlideDirection === "right"
                    ? "-translate-x-full"
                    : "translate-x-0"
                }`}
              >
                <button
                  onClick={handleOwnerNameClick}
                  className="text-white font-bold text-sm hover:text-orange-500 interactive-hover transition-all cursor-pointer"
                >
                  {currentOwner?.name || "No Owner"}
                </button>
              </div>
            </div>

            {/* Chevron Right - Always visible for loop */}
            {sidebarOwners.length > 1 && (
              <button
                onClick={() => navigateOwner("next")}
                className="flex items-center transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-white hover:text-orange-500 interactive-hover" />
              </button>
            )}
            {sidebarOwners.length <= 1 && <div className="w-5" />}
          </div>
        </div>

        {/* Property List - Scrollable di bawah */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div
            className={`p-4 space-y-2 transition-transform duration-500 ease-in-out ${
              propertySlideDirection === "left"
                ? "translate-x-full"
                : propertySlideDirection === "right"
                ? "-translate-x-full"
                : "translate-x-0"
            }`}
          >
            {currentOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPropertyFormOpen(true)}
                className="w-full text-xs justify-start"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Property
              </Button>
            )}
            {selectedProperties.map((property) => (
              <button
                key={property.id}
                onClick={() => onPropertySelect?.(property.id)}
                className="w-full flex items-start gap-2 px-4 py-3 rounded-xl text-sm transition-all text-white hover:text-orange-500 hover:font-bold hover:scale-105 text-left"
              >
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{property.name}</div>
                  <div className="text-xs text-white/70 line-clamp-2 mt-1">
                    {property.address}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* User Form for editing owner */}
        {roles.length > 0 && (
          <UserForm
            trigger={null}
            roles={roles}
            owners={owners}
            ownerOnly={true}
            currentUserRole="DEVELOPER"
            allowRoleChange={false}
            editData={editUserData || undefined}
            open={userFormOpen}
            onOpenChange={(open) => {
              setUserFormOpen(open);
              if (!open) {
                setEditUserData(null);
              }
            }}
          />
        )}

        {/* Property Form for creating property */}
        {currentOwner && (
          <PropertyForm
            trigger={null}
            owners={owners}
            defaultOwnerId={currentOwner.id}
            editData={undefined}
            open={propertyFormOpen}
            onOpenChange={(open) => {
              setPropertyFormOpen(open);
            }}
          />
        )}
      </div>
    </div>
  );
}
