"use client";

import { useState, useEffect } from "react";
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
import { Building2, MapPin } from "lucide-react";
import { FormInputField, FormSelectField } from "@/components/reusable/form";
import {
  createPropertySchema,
  updatePropertySchema,
  type CreatePropertyInput,
  type UpdatePropertyInput,
} from "@/lib/validations/property.validation";
import { createProperty, updateProperty } from "@/lib/actions/property.actions";
import { toast } from "sonner";

type PropertyFormProps = {
  trigger: React.ReactNode | null;
  owners: Array<{ id: string; name: string }>;
  defaultOwnerId?: string;
  editData?: {
    id: string;
    ownerId: string;
    name: string;
    address: string;
    latitude?: number | null;
    longitude?: number | null;
    status: string;
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function PropertyForm({
  trigger,
  owners,
  defaultOwnerId,
  editData,
  open: controlledOpen,
  onOpenChange,
}: PropertyFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingData, setPendingData] = useState<
    CreatePropertyInput | UpdatePropertyInput | null
  >(null);

  // Use controlled open if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  type FormValues = {
    ownerId: string;
    name: string;
    address: string;
    latitude: string;
    longitude: string;
    status: "ACTIVE" | "INACTIVE";
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(
      editData ? updatePropertySchema : createPropertySchema
    ) as any,
    defaultValues: editData
      ? {
          ownerId: editData.ownerId,
          name: editData.name,
          address: editData.address,
          latitude: editData.latitude?.toString() || "",
          longitude: editData.longitude?.toString() || "",
          status: editData.status as "ACTIVE" | "INACTIVE",
        }
      : {
          ownerId: defaultOwnerId || "",
          name: "",
          address: "",
          latitude: "",
          longitude: "",
          status: "ACTIVE",
        },
  });

  // Reset form when Sheet opens or editData changes
  useEffect(() => {
    if (open) {
      if (editData) {
        form.reset({
          ownerId: editData.ownerId,
          name: editData.name,
          address: editData.address,
          latitude: editData.latitude?.toString() || "",
          longitude: editData.longitude?.toString() || "",
          status: editData.status as "ACTIVE" | "INACTIVE",
        });
      } else {
        form.reset({
          ownerId: defaultOwnerId || "",
          name: "",
          address: "",
          latitude: "",
          longitude: "",
          status: "ACTIVE",
        });
      }
    } else {
      form.reset({
        ownerId: defaultOwnerId || "",
        name: "",
        address: "",
        latitude: "",
        longitude: "",
        status: "ACTIVE",
      });
      setPendingData(null);
    }
  }, [open, editData, defaultOwnerId, form]);

  const handleSubmit: SubmitHandler<FormValues> = async (data) => {
    const submitData = {
      ownerId: data.ownerId,
      name: data.name,
      address: data.address,
      latitude: data.latitude === "" ? undefined : parseFloat(data.latitude),
      longitude: data.longitude === "" ? undefined : parseFloat(data.longitude),
      status: data.status,
    };
    setPendingData(submitData as CreatePropertyInput | UpdatePropertyInput);
    setConfirmDialogOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!pendingData) return;

    setLoading(true);
    setConfirmDialogOpen(false);

    try {
      const result = editData
        ? await updateProperty(editData.id, pendingData as UpdatePropertyInput)
        : await createProperty(pendingData as CreatePropertyInput);

      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        form.reset();
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

  const ownerOptions = owners.map((owner) => ({
    value: owner.id,
    label: owner.name,
  }));

  const statusOptions = [
    { value: "ACTIVE", label: "Active" },
    { value: "INACTIVE", label: "Inactive" },
  ];

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen} key={editData?.id || "new"}>
        {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
        <SheetContent
          className="p-2 top-0 left-0 translate-x-0 translate-y-0"
          side="left"
        >
          <SheetHeader className="px-2 pt-2">
            <SheetTitle className="text-base lg:text-xl">
              {editData ? "Edit Property" : "Create New Property"}
            </SheetTitle>
            <SheetDescription className="text-xs lg:text-sm">
              {editData ? "Update property information" : "Add a new property"}
            </SheetDescription>
          </SheetHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-2 lg:space-y-4 px-2 lg:px-4"
              autoComplete="off"
            >
              <div className="space-y-2 lg:space-y-3 rounded-lg border border-orange-500/30 bg-black/20 backdrop-blur-sm p-2 lg:p-4">
                <div className="flex items-center gap-1.5 lg:gap-2 pb-1.5 lg:pb-2 border-b border-orange-500/20">
                  <Building2 className="h-3 w-3 lg:h-4 lg:w-4 text-orange-500" />
                  <h3 className="font-semibold text-xs lg:text-sm text-white">
                    Property Information
                  </h3>
                </div>

                <FormSelectField
                  control={form.control}
                  name="ownerId"
                  label="Owner"
                  placeholder="Select owner"
                  options={ownerOptions}
                  required
                />

                <FormInputField
                  control={form.control}
                  name="name"
                  label="Property Name"
                  placeholder="Enter property name"
                  required
                />

                <FormInputField
                  control={form.control}
                  name="address"
                  label="Address"
                  placeholder="Enter address"
                  required
                />

                <FormInputField
                  control={form.control}
                  name="latitude"
                  label="Latitude"
                  type="text"
                  placeholder="Enter latitude"
                />

                <FormInputField
                  control={form.control}
                  name="longitude"
                  label="Longitude"
                  type="text"
                  placeholder="Enter longitude"
                />

                <FormSelectField
                  control={form.control}
                  name="status"
                  label="Status"
                  placeholder="Select status"
                  options={statusOptions}
                  required
                />
              </div>

              <div className="flex justify-end gap-1.5 lg:gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset({
                      ownerId: defaultOwnerId || "",
                      name: "",
                      address: "",
                      latitude: "",
                      longitude: "",
                      status: "ACTIVE",
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
                    ? "Processing..."
                    : editData
                    ? "Update Property"
                    : "Create Property"}
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="bg-black/40 backdrop-blur-md border-2 border-orange-500/50 text-white">
          <DialogHeader>
            <DialogTitle>
              Konfirmasi {editData ? "Update" : "Create"} Property
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Yakin ingin {editData ? "mengupdate" : "membuat"} property{" "}
              {pendingData && "name" in pendingData
                ? `"${pendingData.name}"`
                : ""}
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              disabled={loading}
              size="sm"
              className="bg-orange-500/90 hover:bg-orange-500 text-white"
            >
              {editData ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
