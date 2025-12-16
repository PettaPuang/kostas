"use client";

import { PropertyWithDetails } from "@/lib/services/property.service";
import { MapPin } from "lucide-react";

type PropertyInfoCardProps = {
  property: PropertyWithDetails;
  index: number;
  isSelected?: boolean;
  onPropertySelect?: (id: string) => void;
};

export function PropertyInfoCard({
  property,
  index,
  isSelected = false,
  onPropertySelect,
}: PropertyInfoCardProps) {
  return (
    <div
      className={`w-80 rounded-2xl p-4 text-white transition-all border border-orange-500/30 bg-transparent backdrop-blur-sm ${
        isSelected ? "shadow-[0_0_20px_rgba(249,115,22,0.3)]" : ""
      }`}
    >
      {/* Name & Address Section */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-green-400 bg-green-400/20 px-2 py-0.5 rounded">
            {String(index + 1).padStart(2, "0")}
          </span>
          <h3 className="font-semibold text-sm truncate text-white">
            {property.name}
          </h3>
        </div>
        <div className="flex items-start gap-2 text-xs text-white/70">
          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
          <span className="line-clamp-2">{property.address}</span>
        </div>
      </div>

      {/* Info Section - Capacity dan Free Slots */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[10px] text-white/50 mb-0.5">Capacity</span>
          <span className="text-sm font-bold text-white">16%</span>
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[10px] text-white/50 mb-0.5">Free Slots</span>
          <span className="text-sm font-bold text-white">2/3</span>
        </div>
      </div>
    </div>
  );
}
