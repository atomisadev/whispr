// apps/web/src/components/mapbox.tsx
"use client";

import React, { useEffect, useRef } from "react";
import mapboxgl, { Map as MapboxMap } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export function MapComponent() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapboxMap | null>(null);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    if (!mapboxToken) {
      console.error("Mapbox Token is missing inside useEffect.");
      return;
    }

    mapboxgl.accessToken = mapboxToken;

    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/standard",
      center: [-74.5, 40.5],
      zoom: 10,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken]);

  if (!mapboxToken) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        Mapbox Token is missing. Configure NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN.
      </div>
    );
  }

  return <div ref={mapContainer} className="h-full w-full" />;
}
