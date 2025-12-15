import { Badge } from "@/components/ui/badge";
import { differenceInDays, addDays } from "date-fns";
import { cn } from "@/lib/utils";

type SubscriptionType = "FREE" | "TRIAL" | "PAID" | null | undefined;

type SubscriptionBadgeProps = {
  subscriptionType: SubscriptionType;
  subscriptionEndDate: Date | null | undefined;
  isTrial: boolean | null | undefined;
  notificationCount?: number;
  notificationBadgeColor?: string | null;
};

type SubscriptionManageBadgeProps = {
  subscriptionType: SubscriptionType;
  subscriptionEndDate: Date | null | undefined;
};

export function SubscriptionBadge({
  subscriptionType,
  subscriptionEndDate,
  isTrial,
  notificationCount,
  notificationBadgeColor,
}: SubscriptionBadgeProps) {
  const hasNotifications = notificationCount && notificationCount > 0 && notificationBadgeColor;

  // FREE
  if (subscriptionType === "FREE" || !subscriptionType) {
    return (
      <div className="relative inline-block">
        <Badge className="bg-green-100 text-green-800 border-green-300">
          FREE
        </Badge>
        {hasNotifications && (
          <Badge
            className={cn(
              "absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[8px] lg:text-[10px] rounded-full border",
              notificationBadgeColor
            )}
          >
            {notificationCount > 9 ? "9+" : notificationCount}
          </Badge>
        )}
      </div>
    );
  }

  // TRIAL
  if (isTrial) {
    return (
      <div className="relative inline-block">
        <Badge className="bg-orange-100 text-orange-800 border-orange-300">
          TRIAL
        </Badge>
        {hasNotifications && (
          <Badge
            className={cn(
              "absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[8px] lg:text-[10px] rounded-full border",
              notificationBadgeColor
            )}
          >
            {notificationCount > 9 ? "9+" : notificationCount}
          </Badge>
        )}
      </div>
    );
  }

  // PAID/SUBS dengan check expiry
  if (subscriptionEndDate) {
    const daysLeft = differenceInDays(
      new Date(subscriptionEndDate),
      new Date()
    );

    if (daysLeft < 0) {
      return (
        <div className="relative inline-block">
          <Badge variant="destructive">EXPIRED</Badge>
          {hasNotifications && (
            <Badge
              className={cn(
                "absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[8px] lg:text-[10px] rounded-full border",
                notificationBadgeColor
              )}
            >
              {notificationCount > 9 ? "9+" : notificationCount}
            </Badge>
          )}
        </div>
      );
    }

    if (daysLeft <= 3) {
      return (
        <div className="relative inline-block">
          <Badge className="bg-orange-100 text-orange-800 border-orange-300">
            EXPIRING
          </Badge>
          {hasNotifications && (
            <Badge
              className={cn(
                "absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[8px] lg:text-[10px] rounded-full border",
                notificationBadgeColor
              )}
            >
              {notificationCount > 9 ? "9+" : notificationCount}
            </Badge>
          )}
        </div>
      );
    }

    return (
      <div className="relative inline-block">
        <Badge className="bg-blue-100 text-blue-800 border-blue-300">
          SUBSCRIBED
        </Badge>
        {hasNotifications && (
          <Badge
            className={cn(
              "absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[8px] lg:text-[10px] rounded-full border",
              notificationBadgeColor
            )}
          >
            {notificationCount > 9 ? "9+" : notificationCount}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <Badge variant="secondary">UNKNOWN</Badge>
      {hasNotifications && (
        <Badge
          className={cn(
            "absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[8px] lg:text-[10px] rounded-full border",
            notificationBadgeColor
          )}
        >
          {notificationCount > 9 ? "9+" : notificationCount}
        </Badge>
      )}
    </div>
  );
}

export function SubscriptionManageBadge({
  subscriptionType,
  subscriptionEndDate,
}: SubscriptionManageBadgeProps) {
  // FREE tidak perlu manage badge
  if (subscriptionType === "FREE" || !subscriptionType) {
    return null;
  }

  // Jika tidak ada end date, default hijau
  if (!subscriptionEndDate) {
    return (
      <Badge
        variant="outline"
        className="text-xs bg-green-100 text-green-800 border-green-300"
      >
        Manage
      </Badge>
    );
  }

  const now = new Date();
  const endDate = new Date(subscriptionEndDate);
  const daysLeft = differenceInDays(endDate, now);
  const gracePeriodEnd = addDays(endDate, 3);

  // Lewat (expired + lewat grace period): Hitam
  if (gracePeriodEnd < now) {
    return (
      <Badge
        variant="outline"
        className="text-xs bg-black text-white border-black"
      >
        Manage
      </Badge>
    );
  }

  // Masa tenggang (expired tapi masih dalam grace period): Merah
  if (endDate < now && gracePeriodEnd >= now) {
    return (
      <Badge
        variant="outline"
        className="text-xs bg-red-100 text-red-800 border-red-300"
      >
        Manage
      </Badge>
    );
  }

  // Tinggal 15 hari lagi: Orange
  if (daysLeft <= 15) {
    return (
      <Badge
        variant="outline"
        className="text-xs bg-orange-100 text-orange-800 border-orange-300"
      >
        Manage
      </Badge>
    );
  }

  // Normal: Hijau
  return (
    <Badge
      variant="outline"
      className="text-xs bg-green-100 text-green-800 border-green-300"
    >
      Manage
    </Badge>
  );
}
