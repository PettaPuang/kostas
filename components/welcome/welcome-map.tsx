"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import { Icon, LatLngBounds } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState, useMemo } from "react";
import { PropertyWithDetails } from "@/lib/services/property.service";

function MapUpdater({
  properties,
  selectedId,
}: {
  properties: PropertyWithDetails[];
  selectedId?: string | null;
}) {
  const map = useMap();
  const validProperties = useMemo(
    () => properties.filter((p) => p.latitude !== null && p.longitude !== null),
    [properties]
  );

  useEffect(() => {
    const handleResize = () => {
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [map]);

  useEffect(() => {
    if (validProperties.length > 0) {
      try {
        const bounds = new LatLngBounds(
          validProperties.map(
            (p) =>
              [p.latitude as number, p.longitude as number] as [number, number]
          )
        );
        map.fitBounds(bounds, { padding: [50, 50] });
      } catch (error) {
        console.error("Map fitBounds error:", error);
      }
    }
  }, [map, validProperties]);

  useEffect(() => {
    if (selectedId) {
      const selected = validProperties.find((p) => p.id === selectedId);
      if (selected && selected.latitude && selected.longitude) {
        try {
          map.flyTo([selected.latitude, selected.longitude], 15, {
            duration: 1,
          });
        } catch (error) {
          console.error("Map flyTo error:", error);
        }
      }
    }
  }, [selectedId, map, validProperties]);

  return null;
}

const createOrangeIcon = (number: number) => {
  return new Icon({
    iconUrl:
      "data:image/svg+xml;base64," +
      btoa(`
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="#f97316" stroke="#fff" stroke-width="2"/>
        <text x="16" y="20" font-family="Arial" font-size="11" font-weight="bold" fill="white" text-anchor="middle">${String(
          number
        ).padStart(2, "0")}</text>
      </svg>
    `),
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

const createGreenIcon = () => {
  return new Icon({
    iconUrl:
      "data:image/svg+xml;base64," +
      btoa(`
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="#22c55e" stroke="#fff" stroke-width="2"/>
      </svg>
    `),
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

type WelcomeMapProps = {
  properties?: PropertyWithDetails[];
  selectedId?: string | null;
};

export function WelcomeMap({ properties = [], selectedId }: WelcomeMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    delete (Icon.Default.prototype as any)._getIconUrl;
    Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });
    setMounted(true);
  }, []);

  const validProperties = useMemo(
    () => properties.filter((p) => p.latitude !== null && p.longitude !== null),
    [properties]
  );

  const center: [number, number] = useMemo(() => {
    if (validProperties.length > 0) {
      const avgLat =
        validProperties.reduce((sum, p) => sum + (p.latitude as number), 0) /
        validProperties.length;
      const avgLng =
        validProperties.reduce((sum, p) => sum + (p.longitude as number), 0) /
        validProperties.length;
      return [avgLat, avgLng];
    }
    return [-5.1477, 119.4327];
  }, [validProperties]);

  if (!mounted) {
    return <div className="h-full w-full bg-gray-900 animate-pulse" />;
  }

  return (
    <div
      className="h-full w-full"
      style={{
        filter: "brightness(1.2) contrast(1.0) saturate(0.75) sepia(0.08)",
      }}
    >
      <MapContainer
        center={center}
        zoom={validProperties.length > 0 ? 12 : 10}
        className="h-full w-full z-0"
        scrollWheelZoom={true}
      >
        <MapUpdater properties={validProperties} selectedId={selectedId} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          subdomains={["a", "b", "c"]}
        />
        {validProperties.length > 1 && (
          <Polyline
            positions={validProperties
              .slice(0, 3)
              .map(
                (p) =>
                  [p.latitude as number, p.longitude as number] as [
                    number,
                    number
                  ]
              )}
            pathOptions={{
              color: "#f97316",
              weight: 3,
              opacity: 0.8,
            }}
          />
        )}
        {validProperties.map((property, index) => (
          <Marker
            key={property.id}
            position={[
              property.latitude as number,
              property.longitude as number,
            ]}
            icon={
              index === 0 || index === validProperties.length - 1
                ? createGreenIcon()
                : createOrangeIcon(index + 1)
            }
          >
            <Popup>
              <div className="text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-semibold">{property.name}</h3>
                </div>
                <p className="text-xs text-gray-600">{property.address}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
