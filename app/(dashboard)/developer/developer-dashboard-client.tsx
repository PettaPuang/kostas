"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GasStationForm } from "@/components/welcome/gas-station-form";
import { UserForm } from "@/components/reusable/form";
import { ManageSubscriptionSheet } from "@/components/developer/manage-subscription-sheet";
import {
  createGasStation,
  updateGasStation,
} from "@/lib/actions/gas-station.actions";
import { createUser } from "@/lib/actions/user.actions";
import { toast } from "sonner";
import {
  Building2,
  Users,
  UserPlus,
  ArrowLeft,
  Plus,
  MapPin,
  UserCog,
  Shield,
  Calendar,
  CreditCard,
} from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  SubscriptionBadge,
  SubscriptionManageBadge,
} from "@/components/reusable/badges";
import { differenceInDays, format } from "date-fns";
import { id } from "date-fns/locale";
import type { GasStationWithOwner } from "@/lib/services/gas-station.service";
import { useSession } from "next-auth/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubscriptionPlanManager } from "@/components/developer/subscription-plan-manager";
import { PromoCodeManager } from "@/components/developer/promo-code-manager";
import { TrialPeriodManager } from "@/components/developer/trial-period-manager";
import { SubscriptionManagementToggle } from "@/components/developer/subscription-management-toggle";
import { ExtensionRequestsManager } from "@/components/developer/extension-requests-manager";
import { BankAccountManager } from "@/components/developer/bank-account-manager";

type DeveloperDashboardClientProps = {
  owners: Array<{
    id: string;
    name: string;
    ownerGroups: Array<{ id: string; name: string }>;
    administrators: Array<{ id: string; name: string }>;
  }>;
  roles: Array<{ value: string; label: string }>;
  gasStations: GasStationWithOwner[];
};

export function DeveloperDashboardClient({
  owners,
  roles,
  gasStations,
}: DeveloperDashboardClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [editGasStationOpen, setEditGasStationOpen] = useState(false);
  const [selectedGasStation, setSelectedGasStation] =
    useState<GasStationWithOwner | null>(null);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [subscriptionSheetOpen, setSubscriptionSheetOpen] = useState(false);
  const [subscriptionGasStation, setSubscriptionGasStation] =
    useState<GasStationWithOwner | null>(null);

  // Frontend validation: Hanya DEVELOPER yang bisa akses
  useEffect(() => {
    if (session && session.user?.roleCode !== "DEVELOPER") {
      toast.error(
        "Akses ditolak. Hanya Developer yang bisa mengakses halaman ini."
      );
      router.push("/welcome");
    }
  }, [session, router]);

  // Jangan render jika bukan DEVELOPER
  if (session && session.user?.roleCode !== "DEVELOPER") {
    return null;
  }

  // Group gas stations by owner
  const groupedByOwner = useMemo(() => {
    const grouped: Record<
      string,
      {
        ownerId: string;
        ownerName: string;
        ownerGroups: Array<{ id: string; name: string }>;
        administrators: Array<{ id: string; name: string }>;
        gasStations: GasStationWithOwner[];
      }
    > = {};

    gasStations.forEach((gs) => {
      const ownerId = gs.ownerId;
      const ownerName = gs.owner.profile?.name || "Unknown Owner";

      if (!grouped[ownerId]) {
        const ownerData = owners.find((o) => o.id === ownerId);
        grouped[ownerId] = {
          ownerId,
          ownerName,
          ownerGroups: ownerData?.ownerGroups || [],
          administrators: ownerData?.administrators || [],
          gasStations: [],
        };
      }
      grouped[ownerId].gasStations.push(gs);
    });

    // Include owners yang belum punya SPBU
    owners.forEach((owner) => {
      if (!grouped[owner.id]) {
        grouped[owner.id] = {
          ownerId: owner.id,
          ownerName: owner.name,
          ownerGroups: owner.ownerGroups || [],
          administrators: owner.administrators || [],
          gasStations: [],
        };
      }
    });

    return Object.values(grouped).sort((a, b) =>
      a.ownerName.localeCompare(b.ownerName)
    );
  }, [gasStations, owners]);

  const handleCreateGasStation = async (data: any) => {
    const result = await createGasStation(data);
    if (result.success) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  const handleEditGasStation = (gs: GasStationWithOwner) => {
    setSelectedGasStation(gs);
    setEditGasStationOpen(true);
  };

  const handleUpdateGasStation = async (data: any) => {
    if (!selectedGasStation) return;
    const result = await updateGasStation(selectedGasStation.id, data);
    if (result.success) {
      toast.success(result.message);
      setEditGasStationOpen(false);
      setSelectedGasStation(null);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  const handleCreateUser = async (data: any) => {
    const result = await createUser(data);
    if (result.success) {
      toast.success(result.message);
      setUserFormOpen(false);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  const handleManageSubscription = (
    gs: GasStationWithOwner,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setSubscriptionGasStation(gs);
    setSubscriptionSheetOpen(true);
  };

  const getSubscriptionInfo = (gs: GasStationWithOwner) => {
    // FREE tidak perlu info, sudah terwakili badge
    if (gs.subscriptionType === "FREE" || !gs.subscriptionType) {
      return "";
    }
    if (gs.subscriptionEndDate) {
      const daysLeft = differenceInDays(
        new Date(gs.subscriptionEndDate),
        new Date()
      );
      const formattedDate = format(
        new Date(gs.subscriptionEndDate),
        "dd/MM/yy"
      );
      if (daysLeft < 0) {
        return `Kedaluwarsa: ${formattedDate}`;
      }
      return `${daysLeft} hari tersisa (${formattedDate})`;
    }
    return "Tidak ada informasi";
  };

  const getSubscriptionStartDate = (gs: GasStationWithOwner) => {
    if (gs.subscriptionStartDate) {
      return format(new Date(gs.subscriptionStartDate), "dd/MM/yy");
    }
    return "-";
  };

  const getSubscriptionEndDate = (gs: GasStationWithOwner) => {
    if (gs.subscriptionEndDate) {
      return format(new Date(gs.subscriptionEndDate), "dd/MM/yy");
    }
    return "-";
  };

  return (
    <div className="container mx-auto p-4 lg:p-6 max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push("/welcome")}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Welcome
          </Button>
          <h1 className="text-2xl lg:text-3xl font-bold">
            Developer Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">Kelola Owner dan SPBU</p>
        </div>
        <div className="flex gap-2">
          {roles.length > 0 && owners.length > 0 && (
            <UserForm
              roles={roles}
              ownerOnly={true}
              owners={owners}
              currentUserRole="DEVELOPER"
              trigger={
                <Button variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Buat Owner/Admin
                </Button>
              }
              open={userFormOpen}
              onOpenChange={setUserFormOpen}
            />
          )}
        </div>
      </div>

      <Tabs defaultValue="extension-requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="gas-stations">Gas Stations</TabsTrigger>
          <TabsTrigger value="subscription">
            Subscription Management
          </TabsTrigger>
          <TabsTrigger value="extension-requests">
            Extension Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gas-stations" className="space-y-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Owner</TableHead>
                  <TableHead className="w-[300px]">SPBU</TableHead>
                  <TableHead>Subscription</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedByOwner.map((group) => {
                  const spbuCount = group.gasStations.length;
                  const totalRows = spbuCount + 1; // +1 for "Buat SPBU" button row

                  return (
                    <React.Fragment key={group.ownerId}>
                      {/* Owner cell with rowspan */}
                      {group.gasStations.length > 0 ? (
                        // If has SPBU, show each SPBU in separate row
                        group.gasStations.map((gs, index) => (
                          <TableRow key={gs.id}>
                            {index === 0 && (
                              <TableCell
                                rowSpan={totalRows}
                                className="align-top border-r"
                              >
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2 font-semibold">
                                    <Image
                                      src="/logo/NozzlLogomark.svg"
                                      alt="Nozzl"
                                      width={20}
                                      height={20}
                                      className="h-5 w-5"
                                    />
                                    {group.ownerName}
                                  </div>
                                  {group.ownerGroups.length > 0 && (
                                    <div className="flex flex-col gap-2 pl-7">
                                      {group.ownerGroups.map((og) => (
                                        <div
                                          key={og.id}
                                          className="flex items-center gap-2 px-2 py-1 bg-blue-50 rounded-md border border-blue-200"
                                        >
                                          <Users className="h-3 w-3 text-blue-600" />
                                          <span className="text-sm text-blue-900">
                                            {og.name}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {group.administrators.length > 0 && (
                                    <div className="flex flex-col gap-2 pl-7">
                                      {group.administrators.map((admin) => (
                                        <div
                                          key={admin.id}
                                          className="flex items-center gap-2 px-2 py-1 bg-red-50 rounded-md border border-red-300"
                                        >
                                          <Shield className="h-3 w-3 text-red-700" />
                                          <span className="text-sm text-red-900 font-medium">
                                            {admin.name}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            )}

                            {/* SPBU Cell */}
                            <TableCell>
                              <div
                                onClick={() => handleEditGasStation(gs)}
                                className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md border cursor-pointer hover:bg-gray-100 transition-colors"
                              >
                                <MapPin className="h-4 w-4 text-gray-500" />
                                <span className="text-sm flex-1">
                                  {gs.name}
                                </span>
                                {gs.status === "INACTIVE" && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    INACTIVE
                                  </Badge>
                                )}
                              </div>
                            </TableCell>

                            {/* Subscription Cell */}
                            <TableCell>
                              <div
                                onClick={(e) => handleManageSubscription(gs, e)}
                                className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-md border h-full cursor-pointer hover:bg-gray-100 transition-colors"
                              >
                                <SubscriptionBadge
                                  subscriptionType={
                                    gs.subscriptionType as
                                      | "FREE"
                                      | "TRIAL"
                                      | "PAID"
                                      | null
                                      | undefined
                                  }
                                  subscriptionEndDate={gs.subscriptionEndDate}
                                  isTrial={gs.isTrial}
                                />
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    {getSubscriptionStartDate(gs)} -{" "}
                                    {getSubscriptionEndDate(gs)}
                                  </span>
                                </div>
                                {getSubscriptionInfo(gs) && (
                                  <span className="text-xs text-muted-foreground">
                                    ({getSubscriptionInfo(gs)})
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        // If no SPBU, show empty state
                        <TableRow key={`${group.ownerId}-empty`}>
                          <TableCell className="align-top border-r">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2 font-semibold">
                                <Image
                                  src="/logo/NozzlLogomark.svg"
                                  alt="Nozzl"
                                  width={20}
                                  height={20}
                                  className="h-5 w-5"
                                />
                                {group.ownerName}
                              </div>
                              {group.ownerGroups.length > 0 && (
                                <div className="flex flex-col gap-2 pl-7">
                                  {group.ownerGroups.map((og) => (
                                    <div
                                      key={og.id}
                                      className="flex items-center gap-2 px-2 py-1 bg-blue-50 rounded-md border border-blue-200"
                                    >
                                      <Users className="h-3 w-3 text-blue-600" />
                                      <span className="text-sm text-blue-900">
                                        {og.name}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {group.administrators.length > 0 && (
                                <div className="flex flex-col gap-2 pl-7">
                                  {group.administrators.map((admin) => (
                                    <div
                                      key={admin.id}
                                      className="flex items-center gap-2 px-2 py-1 bg-red-50 rounded-md border border-red-300"
                                    >
                                      <Shield className="h-3 w-3 text-red-700" />
                                      <span className="text-sm text-red-900 font-medium">
                                        {admin.name}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell
                            colSpan={2}
                            className="text-center text-muted-foreground text-sm"
                          >
                            Belum ada SPBU
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Button row for "Buat SPBU" */}
                      <TableRow
                        key={`${group.ownerId}-create`}
                        className="bg-gray-50/50"
                      >
                        <TableCell colSpan={2}>
                          <GasStationForm
                            owners={owners}
                            onSubmit={handleCreateGasStation}
                            isDeveloper={true}
                            userRole="DEVELOPER"
                            ownerId={group.ownerId}
                            trigger={
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start gap-2 text-xs"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Buat SPBU untuk {group.ownerName}</span>
                              </Button>
                            }
                          />
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-6">
          <SubscriptionManagementToggle />
          <BankAccountManager />
          <TrialPeriodManager />
          <SubscriptionPlanManager />
          <PromoCodeManager />
        </TabsContent>

        <TabsContent value="extension-requests" className="space-y-6">
          <ExtensionRequestsManager />
        </TabsContent>
      </Tabs>

      {/* Edit Gas Station Form */}
      <GasStationForm
        owners={owners}
        onSubmit={handleUpdateGasStation}
        isDeveloper={true}
        userRole="DEVELOPER"
        open={editGasStationOpen}
        onOpenChange={(open) => {
          setEditGasStationOpen(open);
          if (!open) setSelectedGasStation(null);
        }}
        editData={
          selectedGasStation
            ? {
                id: selectedGasStation.id,
                name: selectedGasStation.name,
                address: selectedGasStation.address,
                latitude: selectedGasStation.latitude?.toString() ?? null,
                longitude: selectedGasStation.longitude?.toString() ?? null,
                ownerId: selectedGasStation.ownerId,
                openTime: selectedGasStation.openTime,
                closeTime: selectedGasStation.closeTime,
                status: selectedGasStation.status,
                managerCanPurchase: selectedGasStation.managerCanPurchase,
                financeCanPurchase: selectedGasStation.financeCanPurchase,
                hasTitipan: selectedGasStation.hasTitipan,
                titipanNames: selectedGasStation.titipanNames,
              }
            : undefined
        }
      />

      {/* Subscription Management Sheet */}
      <ManageSubscriptionSheet
        open={subscriptionSheetOpen}
        onOpenChange={setSubscriptionSheetOpen}
        gasStation={subscriptionGasStation}
      />
    </div>
  );
}
