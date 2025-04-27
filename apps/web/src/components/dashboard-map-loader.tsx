"use client";

import React from "react";
import dynamic from "next/dynamic";
import { APIProvider } from "@vis.gl/react-google-maps";
import { Sidepanel } from "./side-panel";

const DynamicMapComponent = dynamic(
  () => import("./google-maps").then((mod) => mod.GoogleMapComponent),
  {
    loading: () => (
      <div className="flex items-center justify-center h-full">
        Loading map...
      </div>
    ),
    ssr: false,
  }
);

export default function DashboardMapLoader() {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY;

  if (!googleMapsApiKey) {
    return (
      <div className="flex items-center justify-center h-full text-red-500 p-4">
        Error: Google Maps API Key is missing. Configure
        NEXT_PUBLIC_Maps_API_KEY.
      </div>
    );
  }

  return (
    <APIProvider apiKey={googleMapsApiKey}>
      <div className="h-full w-full">
        <DynamicMapComponent />
      </div>
    </APIProvider>
  );
}
