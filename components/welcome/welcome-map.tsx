"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon, LatLngBounds } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState, useMemo, useRef } from "react";
import { PropertyWithDetails } from "@/lib/services/property.service";
import { PropertyInfoCard } from "./property-info-card";

function MapUpdater({
  properties,
  selectedId,
  popupRefs,
  popupTrigger,
}: {
  properties: PropertyWithDetails[];
  selectedId?: string | null;
  popupRefs: React.MutableRefObject<Record<string, any>>;
  popupTrigger?: number;
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
      if (
        selected &&
        selected.latitude !== null &&
        selected.longitude !== null
      ) {
        try {
          map.flyTo([selected.latitude, selected.longitude], 15, {
            duration: 1,
          });

          // Open popup for selected marker - always open even if already closed
          setTimeout(() => {
            const marker = popupRefs.current[selectedId];
            if (marker) {
              // Close first to ensure it can be opened again
              marker.closePopup();
              // Then open it after a short delay
              setTimeout(() => {
                if (marker) {
                  marker.openPopup();
                }
              }, 150);
            }
          }, 1000);
        } catch (error) {
          console.error("Map flyTo error:", error);
        }
      }
    } else {
      // Close all popups when nothing is selected
      map.eachLayer((layer: any) => {
        if (layer instanceof (window as any).L?.Marker) {
          layer.closePopup();
        }
      });
    }
  }, [selectedId, map, validProperties, popupRefs, popupTrigger]);

  return null;
}

function MarkerWithPopup({
  property,
  index,
  totalLength,
  isSelected,
  onPropertySelect,
  popupRefs,
  selectedId,
}: {
  property: PropertyWithDetails;
  index: number;
  totalLength: number;
  isSelected: boolean;
  onPropertySelect?: (id: string) => void;
  popupRefs: React.MutableRefObject<Record<string, any>>;
  selectedId?: string | null;
}) {
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (markerRef.current) {
      popupRefs.current[property.id] = markerRef.current;
    }
  }, [property.id, popupRefs]);

  useEffect(() => {
    if (markerRef.current && isSelected && selectedId === property.id) {
      // Delay untuk memastikan map sudah selesai flyTo
      const timeoutId = setTimeout(() => {
        if (markerRef.current) {
          // Close first to ensure it can be opened again
          markerRef.current.closePopup();
          // Then open it after a short delay
          setTimeout(() => {
            if (markerRef.current) {
              markerRef.current.openPopup();
            }
          }, 50);
        }
      }, 1100);

      return () => clearTimeout(timeoutId);
    }
  }, [isSelected, selectedId, property.id]);

  return (
    <Marker
      ref={markerRef}
      position={[property.latitude as number, property.longitude as number]}
      icon={
        index === 0 || index === totalLength - 1
          ? createGreenIcon()
          : createOrangeIcon(index + 1)
      }
    >
      <Popup closeOnClick={true} className="custom-popup">
        <PropertyInfoCard
          property={property}
          index={index}
          isSelected={isSelected}
          onPropertySelect={onPropertySelect}
        />
      </Popup>
    </Marker>
  );
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
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
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
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

type WelcomeMapProps = {
  properties?: PropertyWithDetails[];
  selectedId?: string | null;
  onPropertySelect?: (id: string) => void;
  popupTrigger?: number;
};

export function WelcomeMap({
  properties = [],
  selectedId,
  onPropertySelect,
  popupTrigger = 0,
}: WelcomeMapProps) {
  const [mounted, setMounted] = useState(false);
  const popupRefs = useRef<Record<string, any>>({});

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
        filter: "brightness(2) contrast(1) saturate(0.5) sepia(0.5)",
      }}
    >
      <MapContainer
        center={center}
        zoom={validProperties.length > 0 ? 12 : 10}
        className="h-full w-full z-0"
        scrollWheelZoom={true}
      >
        <MapUpdater
          properties={validProperties}
          selectedId={selectedId}
          popupRefs={popupRefs}
          popupTrigger={popupTrigger}
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          subdomains={["a", "b", "c"]}
        />
        {validProperties.map((property, index) => {
          const isSelected = selectedId === property.id;
          return (
            <MarkerWithPopup
              key={property.id}
              property={property}
              index={index}
              totalLength={validProperties.length}
              isSelected={isSelected}
              onPropertySelect={onPropertySelect}
              popupRefs={popupRefs}
              selectedId={selectedId}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
