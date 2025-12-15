import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MidtransService } from "@/lib/services/midtrans.service";
import { SubscriptionPlanService } from "@/lib/services/subscription-plan.service";
import { addDays } from "date-fns";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      order_id,
      transaction_status,
      status_code,
      gross_amount,
      signature_key,
      fraud_status,
    } = body;

    if (!order_id || !status_code || !gross_amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (signature_key) {
      const isValid = MidtransService.verifySignature(
        order_id,
        status_code,
        gross_amount,
        signature_key
      );

      if (!isValid) {
        console.error("Invalid signature:", { order_id, signature_key });
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    const parsedOrderId = MidtransService.parseOrderId(order_id);
    if (!parsedOrderId) {
      return NextResponse.json(
        { error: "Invalid order ID format" },
        { status: 400 }
      );
    }

    const { gasStationId, planId, durationMonths } = parsedOrderId;

    // Get plan untuk mendapatkan durasi default
    const plan = await SubscriptionPlanService.findById(planId);
    if (!plan) {
      return NextResponse.json(
        { error: "Subscription plan not found" },
        { status: 404 }
      );
    }

    // Gunakan durasi custom jika ada, jika tidak gunakan durasi plan
    const months = durationMonths ? parseInt(durationMonths) : plan.duration;

    const gasStation = await prisma.gasStation.findUnique({
      where: { id: gasStationId },
      include: {
        owner: {
          include: {
            profile: true,
            administrators: {
              where: {
                role: "ADMINISTRATOR",
              },
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!gasStation) {
      return NextResponse.json(
        { error: "Gas station not found" },
        { status: 404 }
      );
    }

    if (
      transaction_status === "settlement" ||
      transaction_status === "capture"
    ) {
      const currentEndDate =
        gasStation.subscriptionEndDate || new Date();
      const newEndDate = addDays(currentEndDate, months * 30);

      await prisma.gasStation.update({
        where: { id: gasStationId },
        data: {
          subscriptionType: "PAID",
          subscriptionStartDate:
            gasStation.subscriptionStartDate || new Date(),
          subscriptionEndDate: newEndDate,
          isTrial: false,
          paymentGateway: "MIDTRANS",
          paymentSubscriptionId: order_id,
          status: "ACTIVE",
        },
      });

      const ownerGroups = await prisma.user.findMany({
        where: {
          role: "OWNER_GROUP",
          ownerId: gasStation.ownerId,
        },
        select: {
          id: true,
        },
      });

      const userIds = [
        gasStation.ownerId,
        ...ownerGroups.map((og) => og.id),
        ...gasStation.owner.administrators.map((admin) => admin.id),
      ];

      await prisma.notification.createMany({
        data: userIds.map((userId) => ({
          userId,
          type: "SUBSCRIPTION_PAYMENT_SUCCESS",
          title: "Pembayaran Subscription Berhasil",
          message: `Pembayaran subscription untuk SPBU ${gasStation.name} berhasil. Subscription diperpanjang ${months} bulan.`,
          gasStationId: gasStation.id,
          isRead: false,
        })),
      });
    } else if (
      transaction_status === "pending" ||
      transaction_status === "deny" ||
      transaction_status === "expire" ||
      transaction_status === "cancel"
    ) {
      const userIds = [
        gasStation.ownerId,
        ...gasStation.owner.administrators.map((admin) => admin.id),
      ];

      await prisma.notification.createMany({
        data: userIds.map((userId) => ({
          userId,
          type: "PAYMENT_FAILED",
          title: "Pembayaran Subscription Gagal",
          message: `Pembayaran subscription untuk SPBU ${gasStation.name} gagal. Status: ${transaction_status}`,
          gasStationId: gasStation.id,
          isRead: false,
        })),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing Midtrans webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}



