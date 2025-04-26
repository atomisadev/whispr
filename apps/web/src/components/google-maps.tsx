// apps/web/src/components/google-map.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
} from "@vis.gl/react-google-maps";

// Define the structure of a Whisper (same as before)
interface Whisper {
  Location: string; // "latitude,longitude"
  Data: string;
  DataType: string;
  MaxListens: number;
  AmountListens: number;
  Emotions: string[];
  _id: string;
}

// Define the structure for the backend API response (same as before)
interface WhisperApiResponse {
  status: number;
  message: string;
  data?: {
    data: Whisper[];
  };
}

interface LatLngLiteral {
  lat: number;
  lng: number;
}

const DEFAULT_CENTER: LatLngLiteral = { lat: 40.5, lng: -74.5 }; // Default: somewhere in NJ
const DEFAULT_ZOOM = 10;
// Backend expects radius in the same "units" as the coordinate difference calculation.
// Since the backend calculation is flawed (treats degrees as Cartesian),
// this radius value might need significant tuning based on observed behavior.
// A more robust backend would use proper geospatial queries (e.g., meters/km).
const BACKEND_RADIUS_UNITS = 5 * 100; // Arbitrary scaling factor for the flawed backend calculation. TUNE THIS!

// --- !!! IMPORTANT BACKEND NOTE !!! ---
// The current backend calculation in GetWhispers treats latitude/longitude degrees
// as if they were points on a flat Cartesian plane (Euclidean distance).
// This is inaccurate for calculating real-world distances on a sphere.
// For accurate results, the backend should use:
// 1. MongoDB's geospatial queries ($nearSphere with a 2dsphere index).
// 2. Haversine formula or similar geodetic calculations if not using DB queries.
// The `BACKEND_RADIUS_UNITS` constant above is a crude attempt to map KM to
// the backend's flawed unit system and WILL require tuning.
// -------------------------------------

// Helper function to parse location string
const parseLocation = (locationString: string): LatLngLiteral | null => {
  try {
    const [latStr, lngStr] = locationString.split(",");
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  } catch (e) {
    console.error(`Error parsing location string: ${locationString}`, e);
  }
  return null;
};

export function GoogleMapComponent() {
  const [userLocation, setUserLocation] = useState<LatLngLiteral | null>(null);
  const [mapCenter, setMapCenter] = useState<LatLngLiteral>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState<number>(DEFAULT_ZOOM);
  const [whispers, setWhispers] = useState<Whisper[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openInfoWindowMarkerId, setOpenInfoWindowMarkerId] = useState<
    string | null
  >(null);

  // Function to fetch whispers (mostly unchanged, uses userLocation state)
  const fetchWhispers = useCallback(async (lat: number, lng: number) => {
    setIsLoading(true);
    setError(null);
    setWhispers([]); // Clear previous whispers

    // --- Adjust Backend URL if necessary ---
    const backendUrl = `/api/whispers`; // Use relative path assumes proxy/same-origin
    // const backendUrl = `http://localhost:8080/whispers`; // Or use absolute path
    // ---------------------------------------

    const apiUrl = `${backendUrl}?location=${lat},${lng}&radius=${BACKEND_RADIUS_UNITS}`;
    console.log(`Workspaceing whispers from: ${apiUrl}`);

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result: WhisperApiResponse = await response.json();
      console.log("API Response:", result);

      if (result.status >= 200 && result.status < 300 && result.data?.data) {
        setWhispers(result.data.data);
      } else {
        if (result.status >= 200 && result.status < 300) {
          console.log(
            "API returned success but no whispers found in the response data."
          );
          setWhispers([]);
        } else {
          throw new Error(result.message || "Failed to fetch whispers");
        }
      }
    } catch (err) {
      console.error("Failed to fetch whispers:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An unknown error occurred fetching whispers"
      );
      setWhispers([]);
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies needed here as it reads state directly when called

  // Effect 1: Get User's Initial Location
  //   useEffect(() => {
  //     if (navigator.geolocation) {
  //       navigator.geolocation.getCurrentPosition(
  //         (position) => {
  //           const { latitude, longitude } = position.coords;
  //           const currentLocation = { lat: latitude, lng: longitude };
  //           console.log(
  //             `Initial geolocation: Lat: ${latitude}, Lng: ${longitude}`
  //           );
  //           setUserLocation(currentLocation);
  //           setMapCenter(currentLocation); // Center map on user
  //           setMapZoom(14); // Zoom in closer
  //         },
  //         (err) => {
  //           console.warn(`Geolocation Error (${err.code}): ${err.message}`);
  //           setError("Unable to retrieve location. Showing default area.");
  //           // Keep default center if geolocation fails
  //         },
  //         { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
  //       );
  //     } else {
  //       setError("Geolocation is not supported by this browser.");
  //     }
  //   }, []); // Run only once on mount

  // Effect 2: Fetch whispers when user location is known
  useEffect(() => {
    if (userLocation) {
      fetchWhispers(userLocation.lat, userLocation.lng);
    }
  }, [userLocation, fetchWhispers]); // Re-fetch when location changes

  // Find the currently selected whisper for the InfoWindow
  const selectedWhisper = whispers.find(
    (w) => w._id === openInfoWindowMarkerId
  );
  const selectedWhisperLocation = selectedWhisper
    ? parseLocation(selectedWhisper.Location)
    : null;

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500 p-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <Map
        mapId={"YOUR_MAP_ID"} // Optional: Create Map ID in Google Cloud Console for custom styles
        center={mapCenter}
        zoom={mapZoom}
        gestureHandling={"greedy"} // Allows map interaction without holding ctrl/cmd
        disableDefaultUI={false} // Show default controls like zoom, fullscreen
        className="absolute top-0 bottom-0 w-full h-full"
      >
        {/* Render user's location marker if available */}
        {userLocation && (
          <AdvancedMarker position={userLocation} title={"Your Location"}>
            {/* You can customize the user marker, e.g., different color Pin */}
            <span style={{ fontSize: "2rem" }}>📍</span>
          </AdvancedMarker>
        )}

        {/* Render whisper markers */}
        {whispers.map((whisper) => {
          const position = parseLocation(whisper.Location);
          if (!position) return null; // Skip if location is invalid

          return (
            <AdvancedMarker
              key={whisper._id}
              position={position}
              onClick={() => setOpenInfoWindowMarkerId(whisper._id)}
              title={`Whisper: ${whisper.Data.substring(0, 30)}...`} // Tooltip on hover
            >
              {/* Default Pin, can be customized */}
              <Pin />
            </AdvancedMarker>
          );
        })}

        {/* Render InfoWindow for the selected marker */}
        {selectedWhisper && selectedWhisperLocation && (
          <InfoWindow
            position={selectedWhisperLocation}
            pixelOffset={[0, -40]} // Adjust offset to position above marker pin
            onCloseClick={() => setOpenInfoWindowMarkerId(null)}
          >
            <div style={{ maxWidth: "200px" }}>
              <h3>Whisper</h3>
              <p>{selectedWhisper.Data}</p>
              <small>Emotions: {selectedWhisper.Emotions.join(", ")}</small>
            </div>
          </InfoWindow>
        )}
      </Map>
      {isLoading && (
        <div className="absolute top-2 left-2 bg-white bg-opacity-80 p-2 rounded shadow z-10">
          Loading whispers...
        </div>
      )}
    </div>
  );
}
