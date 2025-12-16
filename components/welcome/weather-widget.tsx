"use client";

import { format } from "date-fns";

export function WeatherWidget() {
  const now = new Date();
  const temperature = 28;
  const windDirection = "NNW";
  const windSpeed = "13 km/h";

  return (
    <div className="bg-gray-800 rounded-lg p-4 text-white min-w-[200px]">
      <div className="text-2xl font-bold mb-1">{temperature}°</div>
      <div className="text-xs text-gray-400 mb-2">
        {windDirection} {windSpeed}
      </div>
      <div className="text-xs text-gray-400">
        {format(now, "EEE, dd MMM, yyyy / hh:mm a")}
      </div>
    </div>
  );
}

