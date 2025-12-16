"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User } from "lucide-react";
import {
  FormInputField,
  FormSelectField,
} from "@/components/reusable/form";
import {
  createUserWithProfileSchema,
  updateUserWithProfileSchema,
  type CreateUserWithProfileInput,
  type UpdateUserWithProfileInput,
} from "@/lib/validations/user.validation";
import { createUser, updateUser } from "@/lib/actions/user.actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type RoleOption =
  | { value: string; label: string } // Format standar
  | { id: string; name: string; code: string }; // Format dari settings

type UserFormProps = {
  trigger: React.ReactNode | null;
  roles: RoleOption[]; // Menerima format fleksibel
  gasStationId?: string;
  ownerOnly?: boolean;
  staffOnly?: boolean; // Jika true, hanya tampilkan MANAGER, UNLOADER, OPERATOR, FINANCE, ACCOUNTING
  allowRoleChange?: boolean; // Default true, set false untuk disable role change
  currentUserRole?: string; // Role dari current user untuk permission check
  currentUserOwnerId?: string | null; // OwnerId dari current user (untuk admin yang membuat OWNER_GROUP/ADMINISTRATOR)
  owners?: Array<{ id: string; name: string }>; // Untuk memilih owner saat membuat ADMINISTRATOR (jika bukan ownerOnly)
  editData?: {
    id: string;
    email: string;
    role: string; // Role enum
    displayName?: string | null;
    ownerId?: string | null;
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function UserForm({
  trigger,
  roles,
  gasStationId,
  ownerOnly = false,
  staffOnly = false,
  allowRoleChange = true,
  currentUserRole,
  currentUserOwnerId = null,
  owners = [],
  editData,
  open: controlledOpen,
  onOpenChange,
}: UserFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingData, setPendingData] = useState<
    CreateUserWithProfileInput | UpdateUserWithProfileInput | null
  >(null);
  const router = useRouter();

  // Use controlled open if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // Normalize roles to standard format { value, label }
  const normalizedRoles = roles.map((role) => {
    if ("value" in role && "label" in role) {
      return role; // Sudah dalam format standar
    }
    // Format { id, name, code } -> { value, label }
    return {
      value: role.code,
      label: role.name,
    };
  });

  // Filter roles based on ownerOnly prop sesuai schema Prisma
  // ownerOnly = true: hanya OWNER dan OWNERGROUP (untuk admin panel)
  // ownerOnly = false: semua role kecuali OWNER dan DEVELOPER (untuk gas station)
  // staffOnly = true: hanya STAFF dan FINANCE (untuk settings card di office tab)
  let availableRoles = ownerOnly
    ? normalizedRoles.filter(
        (role) =>
          role.value === "OWNER" || role.value === "OWNERGROUP"
      )
    : staffOnly
    ? normalizedRoles.filter(
        (role) =>
          role.value === "STAFF" || role.value === "FINANCE"
      )
    : normalizedRoles.filter(
        (role) =>
          role.value !== "OWNER" && role.value !== "DEVELOPER"
      );
  
  // Filter hanya role yang ada di schema Prisma
  const schemaRoles = ["DEVELOPER", "OWNER", "OWNERGROUP", "STAFF", "FINANCE"];
  availableRoles = availableRoles.filter((role) =>
    schemaRoles.includes(role.value)
  );

  // Filter roles based on currentUserRole sesuai schema
  // DEVELOPER: bisa membuat semua (OWNER, OWNERGROUP, STAFF, FINANCE)
  // OWNER: bisa membuat STAFF dan FINANCE
  // Jika staffOnly = true, skip filter currentUserRole karena sudah di-filter sebelumnya
  if (!staffOnly) {
    if (currentUserRole === "OWNER") {
      // OWNER bisa membuat STAFF dan FINANCE
      availableRoles = availableRoles.filter(
        (role) => role.value === "STAFF" || role.value === "FINANCE"
      );
    } else if (currentUserRole !== "DEVELOPER") {
      // Untuk role selain DEVELOPER dan OWNER, filter out semua
      availableRoles = availableRoles.filter(
        (role) =>
          role.value !== "DEVELOPER" &&
          role.value !== "OWNER" &&
          role.value !== "OWNERGROUP"
      );
    }
    // DEVELOPER tidak perlu filter, bisa akses semua
  }

  // Get owner role for default value
  const ownerRole = availableRoles.find((role) => role.value === "OWNER");
  // Gunakan useMemo untuk menghindari perubahan reference setiap render
  const defaultRoleValue = useMemo(() => {
    return ownerRole?.value || "";
  }, [ownerRole]);

  // Watch roleId untuk show/hide ownerId field
  const form = useForm<CreateUserWithProfileInput | UpdateUserWithProfileInput>(
    {
      resolver: zodResolver(
        editData ? updateUserWithProfileSchema : createUserWithProfileSchema
      ) as any,
      defaultValues: editData
        ? {
            email: editData.email,
            roleId: editData.role,
            displayName: editData.displayName || "",
            ownerId: editData.ownerId || "",
            password: "",
            confirmPassword: "",
          }
        : {
            email: "",
            password: "",
            confirmPassword: "",
            roleId: ownerOnly && defaultRoleValue ? defaultRoleValue : "",
            displayName: "",
            ownerId: "",
          },
    }
  );

  const selectedRoleId = form.watch("roleId");

  // Reset form ketika Sheet dibuka atau editData berubah
  useEffect(() => {
    if (open) {
      if (editData) {
        form.reset({
          email: editData.email,
          roleId: editData.role,
          displayName: editData.displayName || "",
          ownerId: editData.ownerId || "",
          password: "",
          confirmPassword: "",
        });
      } else {
        form.reset({
          email: "",
          password: "",
          confirmPassword: "",
          roleId: ownerOnly && defaultRoleValue ? defaultRoleValue : "",
          displayName: "",
          ownerId: "",
        });
      }
    } else {
      // Reset form ketika Sheet ditutup
      form.reset({
        email: "",
        password: "",
        confirmPassword: "",
        roleId: ownerOnly && defaultRoleValue ? defaultRoleValue : "",
        displayName: "",
        ownerId: "",
      });
      setPendingData(null);
    }
  }, [open, editData, ownerOnly, defaultRoleValue, form]);

  const handleSubmit: SubmitHandler<
    CreateUserWithProfileInput | UpdateUserWithProfileInput
  > = async (data) => {
    // For edit mode, remove password fields if empty
    const submitData = editData
      ? {
          ...data,
          ...(data.password === "" && { password: undefined }),
          ...(data.confirmPassword === "" && { confirmPassword: undefined }),
        }
      : data;
    setPendingData(
      submitData as CreateUserWithProfileInput | UpdateUserWithProfileInput
    );
    setConfirmDialogOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!pendingData) return;

    setLoading(true);
    try {
      // Prepare submit data - hapus roleId jika tidak boleh ubah role
      let submitData =
        editData && !allowRoleChange
          ? { ...pendingData, roleId: undefined } // Hapus roleId jika tidak boleh ubah role
          : pendingData;


      // For owner creation, don't pass gasStationId
      const result = editData
        ? await updateUser(editData.id, submitData as any)
        : await createUser(
            submitData as CreateUserWithProfileInput,
            ownerOnly ? undefined : gasStationId
          );

      if (result.success) {
        toast.success(result.message);
        setConfirmDialogOpen(false);
        setOpen(false);
        form.reset({
          email: "",
          password: "",
          confirmPassword: "",
          roleId: (ownerOnly && defaultRoleValue
            ? defaultRoleValue
            : "") as any,
          displayName: "",
          ownerId: "",
        });
        setPendingData(null);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = availableRoles; // Sudah dalam format { value, label }

  return (
      <Sheet open={open} onOpenChange={setOpen} key={editData?.id || "new"}>
        {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
        <SheetContent className="p-2 bottom-0 right-0 left-auto translate-x-0 translate-y-0" side="bottom">
        <SheetHeader className="px-2 pt-2">
          <SheetTitle className="text-base lg:text-xl">
            {editData
              ? "Edit User"
              : ownerOnly
              ? "Create New Owner"
              : "Create New User"}
          </SheetTitle>
          <SheetDescription className="text-xs lg:text-sm">
            {editData
              ? "Update user account information"
              : ownerOnly
              ? "Add a new owner account"
              : "Add a new user"}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-2 lg:space-y-4 px-2 lg:px-4"
            autoComplete="off"
          >
            {/* Account Information */}
            <div className="space-y-2 lg:space-y-3 rounded-lg border border-orange-500/30 bg-black/20 backdrop-blur-sm p-2 lg:p-4">
              <div className="flex items-center gap-1.5 lg:gap-2 pb-1.5 lg:pb-2 border-b border-orange-500/20">
                <User className="h-3 w-3 lg:h-4 lg:w-4 text-orange-500" />
                <h3 className="font-semibold text-xs lg:text-sm text-white">
                  Account Information
                </h3>
              </div>

              <FormInputField
                control={form.control}
                name="email"
                label="Email"
                type="email"
                placeholder="Enter email"
                required
              />

              <FormInputField
                control={form.control}
                name="displayName"
                label="Display Name"
                placeholder="Enter display name"
              />

              <FormSelectField
                control={form.control}
                name="roleId"
                label="Role"
                placeholder="Select role"
                options={roleOptions}
                required
                disabled={!allowRoleChange}
              />

              {/* Owner selection untuk OWNERGROUP */}
              {selectedRoleId === "OWNERGROUP" &&
               owners.length > 0 && (
                <FormSelectField
                  control={form.control}
                  name="ownerId"
                  label="Owner"
                  placeholder="Pilih Owner"
                  options={owners.map((owner) => ({
                    value: owner.id,
                    label: owner.name,
                  }))}
                />
              )}

              <FormInputField
                control={form.control}
                name="password"
                label={
                  editData
                    ? "New Password (leave blank to keep current)"
                    : "Password"
                }
                type="password"
                placeholder={
                  editData ? "Leave blank to keep current" : "Enter password"
                }
                required={!editData}
                showPasswordToggle
              />

              <FormInputField
                control={form.control}
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                placeholder={
                  editData ? "Leave blank to keep current" : "Confirm password"
                }
                required={!editData}
                showPasswordToggle
              />
            </div>

            <div className="flex justify-end gap-1.5 lg:gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset({
                    email: "",
                    password: "",
                    confirmPassword: "",
                    roleId:
                      ownerOnly && defaultRoleValue ? defaultRoleValue : "",
                    displayName: "",
                    ownerId: "",
                  });
                  setPendingData(null);
                  setOpen(false);
                }}
                size="sm"
                className="text-xs lg:text-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                size="sm"
                className="text-xs lg:text-sm bg-orange-500/90 hover:bg-orange-500 text-white"
              >
                {loading
                  ? "Saving..."
                  : editData
                  ? "Update User"
                  : "Create User"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="p-2 lg:p-6 max-w-[90vw] lg:max-w-md bg-black/60 backdrop-blur-md border-2 border-orange-500/50 text-white">
          <DialogHeader>
            <DialogTitle className="text-base lg:text-xl text-white">
              Konfirmasi {editData ? "Update" : "Create"} User
            </DialogTitle>
            <DialogDescription className="text-xs lg:text-sm text-white/70">
              Yakin ingin {editData ? "mengupdate" : "membuat"} user{" "}
              <span className="font-semibold text-white">{pendingData?.email}</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-1.5 lg:gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={loading}
              size="sm"
              className="text-xs lg:text-sm border-orange-500/50 text-white hover:bg-orange-500/20 hover:border-orange-500"
            >
              Batal
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              disabled={loading}
              size="sm"
              className="text-xs lg:text-sm bg-orange-500/90 hover:bg-orange-500 text-white"
            >
              {loading ? "Processing..." : "Ya, Lanjutkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
