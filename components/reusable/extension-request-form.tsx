"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FormSelectField } from "@/components/reusable/form";
import { Form } from "@/components/ui/form";
import { createExtensionRequest } from "@/lib/actions/subscription-message.actions";
import { getActiveSubscriptionPlans } from "@/lib/actions/subscription-plan.actions";
import {
  calculateExtensionPrice,
  getDefaultSubscriptionPlan,
} from "@/lib/actions/subscription-calculation.actions";
import { getBankAccountNumber } from "@/lib/actions/subscription-config.actions";
import { toast } from "sonner";
import { Loader2, Upload, X, Image as ImageIcon, CreditCard } from "lucide-react";
import type { GasStationWithOwner } from "@/lib/services/gas-station.service";

type ExtensionRequestFormProps = {
  gasStation: GasStationWithOwner | null;
  onSuccess?: () => void;
};

type ExtensionRequestFormValues = {
  planId: string;
  durationMonths: string;
  reason: string;
};

export function ExtensionRequestForm({
  gasStation,
  onSuccess,
}: ExtensionRequestFormProps) {
  const [plans, setPlans] = useState<
    Array<{ id: string; name: string; price: number; duration: number }>
  >([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<Set<number>>(new Set());
  const [bankAccountNumber, setBankAccountNumber] = useState<string>("");

  const form = useForm<ExtensionRequestFormValues>({
    defaultValues: {
      planId: "",
      durationMonths: "",
      reason: "",
    },
  });

  const selectedPlanId = form.watch("planId");
  const selectedDurationMonths = form.watch("durationMonths");

  // Load plans and bank account number
  useEffect(() => {
    const loadData = async () => {
      try {
        const plansData = await getActiveSubscriptionPlans();
        setPlans(plansData);
        if (plansData.length > 0 && !form.getValues("planId")) {
          const defaultPlanResult = await getDefaultSubscriptionPlan();
          if (defaultPlanResult.success && defaultPlanResult.data) {
            form.setValue("planId", defaultPlanResult.data.id);
            form.setValue("durationMonths", "1");
          } else {
            // Fallback ke plan pertama
            form.setValue("planId", plansData[0].id);
            form.setValue("durationMonths", "1");
          }
        }

        // Load bank account number
        const accountNumber = await getBankAccountNumber();
        setBankAccountNumber(accountNumber);
      } catch (error) {
        toast.error("Gagal memuat data");
      } finally {
        setLoadingPlans(false);
      }
    };
    loadData();
  }, []);

  // Calculate price when plan or duration changes
  const [calculatedPrice, setCalculatedPrice] = useState<{
    pricePerMonth: number;
    totalPrice: number;
    planName: string;
  } | null>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);

  useEffect(() => {
    const calculatePrice = async () => {
      if (!selectedPlanId || !selectedDurationMonths) {
        setCalculatedPrice(null);
        return;
      }

      try {
        const duration = parseInt(selectedDurationMonths);
        if (isNaN(duration) || duration <= 0) {
          setCalculatedPrice(null);
          return;
        }

        setCalculatingPrice(true);
        const result = await calculateExtensionPrice(selectedPlanId, duration);
        if (result.success && result.data) {
          setCalculatedPrice(result.data);
        } else {
          setCalculatedPrice(null);
          if (result.message) {
            console.error("Error calculating price:", result.message);
          }
        }
      } catch (error) {
        console.error("Error calculating price:", error);
        setCalculatedPrice(null);
      } finally {
        setCalculatingPrice(false);
      }
    };

    calculatePrice();
  }, [selectedPlanId, selectedDurationMonths]);

  // Generate duration options
  const getDurationOptions = () => {
    const selectedPlan = plans.find((p) => p.id === selectedPlanId);
    if (!selectedPlan) return [];

    const options: Array<{ value: string; label: string }> = [];

    // Jika plan durasi 1 bulan (bulanan), bisa pilih 1-12 bulan
    if (selectedPlan.duration === 1) {
      for (let i = 1; i <= 12; i++) {
        options.push({
          value: i.toString(),
          label: `${i} ${i === 1 ? "bulan" : "bulan"}`,
        });
      }
    }
    // Jika plan durasi 12 bulan (tahunan), bisa pilih 1-5 tahun
    else if (selectedPlan.duration === 12) {
      for (let i = 1; i <= 5; i++) {
        options.push({
          value: (i * 12).toString(),
          label: `${i} ${i === 1 ? "tahun" : "tahun"} (${i * 12} bulan)`,
        });
      }
    }
    // Default: gunakan durasi plan sebagai opsi
    else {
      options.push({
        value: selectedPlan.duration.toString(),
        label: `${selectedPlan.duration} bulan`,
      });
    }

    return options;
  };

  const durationOptions = getDurationOptions();

  // Update duration when plan changes
  useEffect(() => {
    if (selectedPlanId && durationOptions.length > 0) {
      const currentDuration = form.getValues("durationMonths");
      if (
        !currentDuration ||
        !durationOptions.find((opt) => opt.value === currentDuration)
      ) {
        form.setValue("durationMonths", durationOptions[0].value);
      }
    }
  }, [selectedPlanId]);

  // Handle file upload
  const handleFileUpload = async (file: File, index: number) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Hanya file gambar yang diperbolehkan");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB");
      return;
    }

    setUploadingFiles((prev) => new Set(prev).add(index));

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload gagal");
      }

      const data = await response.json();
      setAttachments((prev) => [...prev, data.url]);
      toast.success("File berhasil diupload");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Gagal mengupload file");
    } finally {
      setUploadingFiles((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ExtensionRequestFormValues) => {
    if (!gasStation) {
      toast.error("SPBU tidak ditemukan");
      return;
    }

    if (!data.planId || !data.durationMonths) {
      toast.error("Pilih plan dan durasi terlebih dahulu");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createExtensionRequest(
        gasStation.id,
        data.planId,
        parseInt(data.durationMonths),
        data.reason || undefined,
        attachments.length > 0 ? attachments : undefined
      );

      if (result.success) {
        toast.success(result.message);
        form.reset();
        setAttachments([]);
        onSuccess?.();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Error creating extension request:", error);
      toast.error("Gagal mengirim request extension");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingPlans) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
        Memuat plans...
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        Belum ada subscription plan aktif. Hubungi administrator.
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormSelectField
          control={form.control}
          name="planId"
          label="Paket Subscription"
          placeholder="Pilih paket..."
          required
          options={plans.map((plan) => ({
            value: plan.id,
            label: `${plan.name} - ${plan.duration} bulan - Rp ${plan.price.toLocaleString("id-ID")}`,
          }))}
        />

        {selectedPlanId && durationOptions.length > 0 && (
          <FormSelectField
            control={form.control}
            name="durationMonths"
            label="Durasi Perpanjangan"
            placeholder="Pilih durasi..."
            required
            options={durationOptions}
          />
        )}

        {calculatedPrice && (
          <div className="rounded-lg border bg-muted/50 p-3 sm:p-4 space-y-2">
            <h4 className="text-xs sm:text-sm font-semibold">Ringkasan Pembayaran</h4>
            <div className="space-y-1">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-xs sm:text-sm text-muted-foreground">Paket:</span>
                <span className="text-xs sm:text-sm font-semibold sm:text-right break-words">
                  {calculatedPrice.planName}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-xs sm:text-sm text-muted-foreground">Durasi:</span>
                <span className="text-xs sm:text-sm font-semibold sm:text-right">
                  {selectedDurationMonths}{" "}
                  {selectedDurationMonths === "1" ? "bulan" : "bulan"}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Harga per bulan:
                </span>
                <span className="text-xs sm:text-sm font-semibold sm:text-right">
                  Rp {calculatedPrice.pricePerMonth.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 pt-2 border-t">
                <span className="text-xs sm:text-sm font-semibold">Total Pembayaran:</span>
                <span className="text-base sm:text-lg font-bold text-primary sm:text-right">
                  Rp {calculatedPrice.totalPrice.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
            {bankAccountNumber && (
              <div className="pt-3 border-t">
                <div className="flex items-start gap-2">
                  <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">
                      Transfer ke rekening:
                    </p>
                    <p className="text-xs sm:text-sm font-semibold font-mono break-all">
                      {bankAccountNumber}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                      Silakan transfer sesuai total pembayaran di atas dan upload bukti transfer sebagai lampiran.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="reason" className="text-xs sm:text-sm">Alasan (Opsional)</Label>
          <Textarea
            id="reason"
            {...form.register("reason")}
            placeholder="Jelaskan alasan permintaan perpanjangan..."
            rows={3}
            className="resize-none text-xs sm:text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs sm:text-sm">Bukti Transfer (Opsional)</Label>
          <div className="space-y-2">
            {attachments.map((url, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 border rounded-lg"
              >
                <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                <span className="text-xs sm:text-sm flex-1 truncate min-w-0">{url}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveAttachment(index)}
                  className="h-6 w-6 p-0 shrink-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}

            {attachments.length < 3 && (
              <div>
                <input
                  type="file"
                  id="file-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file, attachments.length);
                    }
                    e.target.value = ""; // Reset input
                  }}
                />
                <Label htmlFor="file-upload">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-xs sm:text-sm"
                    asChild
                  >
                    <span>
                      <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                      Upload Bukti Transfer
                    </span>
                  </Button>
                </Label>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  Maksimal 3 file, ukuran maksimal 5MB per file
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              form.reset();
              setAttachments([]);
            }}
            disabled={isSubmitting}
            className="flex-1 text-xs sm:text-sm"
          >
            Reset
          </Button>
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              !selectedPlanId ||
              !selectedDurationMonths ||
              !calculatedPrice
            }
            className="flex-1 text-xs sm:text-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                Mengirim...
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Kirim Request</span>
                <span className="sm:hidden">Kirim</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

