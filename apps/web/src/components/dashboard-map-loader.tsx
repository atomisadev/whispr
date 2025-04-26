// apps/web/src/components/dashboard-map-loader.tsx
"use client"; // <--- Mark this as a Client Component

import React from "react";
import dynamic from "next/dynamic";
import { APIProvider } from "@vis.gl/react-google-maps";
import { Sidepanel } from "./side-panel";

// Define the dynamic import *inside* the client component
const DynamicMapComponent = dynamic(
  // Adjust the path if google-map.tsx is elsewhere
  () => import("./google-maps").then((mod) => mod.GoogleMapComponent),
  {
    loading: () => (
      <div className="flex items-center justify-center h-full">
        Loading map...
      </div>
    ),
    ssr: false, // This is now allowed because we are in a Client Component
  }
);

export default function DashboardMapLoader() {
  // Read the public env var directly in the client component
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
