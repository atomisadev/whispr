// apps/web/src/components/google-map.tsx
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Map,
  AdvancedMarker,
  // Pin,
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
  MediaUrl?: string;
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

const DEFAULT_CENTER: LatLngLiteral = { lat: 51, lng: 49 };
const DEFAULT_ZOOM = 10;

const parseLocation = (locationString: string): LatLngLiteral | null => {
  try {
    const parts = locationString.split(",");
    if (parts.length !== 2) {
      console.error(
        `Invalid location string format (expected one comma): "${locationString}"`
      );
      return null;
    }
    const latStr = parts[0].trim();
    const lngStr = parts[1].trim();
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      return { lat, lng };
    } else {
      console.error(
        `Invalid number format or range: lat='${latStr}', lng='${lngStr}' from string "${locationString}"`
      );
      return null;
    }
  } catch (e) {
    console.error(`Error parsing location string: "${locationString}"`, e);
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

  const markerRefs = useRef<
    Record<string, google.maps.marker.AdvancedMarkerElement | null>
  >({});

  // Function to fetch whispers (mostly unchanged, uses userLocation state)
  const fetchWhispers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    // setWhispers([]); // Clear previous whispers

    // --- Adjust Backend URL if necessary ---
    // const backendUrl = `/api/whispers`; // Use relative path assumes proxy/same-origin
    const backendUrl = `http://localhost:8080/whispers`; // Or use absolute path
    // ---------------------------------------

    const apiUrl = backendUrl;
    console.log(`Workspaceing whispers from: ${apiUrl}`);

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result: WhisperApiResponse = await response.json();
      console.log("API Response:", result);

      if (result.status >= 200 && result.status < 300 && result.data?.data) {
        const validWhispers = result.data.data.filter((w) => {
          const pos = parseLocation(w.Location);
          if (!pos) {
            console.warn(
              `Skipping whisper with invalid location: ${w._id}, Location: "${w.Location}"`
            );
          }
          return !!pos;
        });
        setWhispers(validWhispers);
      } else {
        setWhispers([]);
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
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const currentLocation = { lat: latitude, lng: longitude };
          console.log(
            `Initial geolocation: Lat: ${latitude}, Lng: ${longitude}`
          );
          setUserLocation(currentLocation);
          setMapCenter(currentLocation);
          setMapZoom(14); // Zoom in closer
        },
        (err) => {
          console.warn(`Geolocation Error (${err.code}): ${err.message}`);
          setError("Unable to retrieve location. Showing default area.");
          // Keep default center if geolocation fails
          setMapCenter(DEFAULT_CENTER);
          setMapZoom(DEFAULT_ZOOM);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setError("Geolocation is not supported by this browser.");
      setMapCenter(DEFAULT_CENTER);
      setMapZoom(DEFAULT_ZOOM);
    }
  }, []); // Run only once on mount

  // Effect 2: Fetch whispers when user location is known

  useEffect(() => {
    fetchWhispers();
  }, [fetchWhispers]); // Re-fetch when location changes

  let foundWhisper: Whisper | undefined = undefined;

  if (
    typeof openInfoWindowMarkerId === "string" &&
    openInfoWindowMarkerId.length > 0
  ) {
    console.log(
      `Attempting to find whisper with ID: "${openInfoWindowMarkerId}"`
    ); // Debug Log
    foundWhisper = whispers.find((w) => w._id === openInfoWindowMarkerId);
  }
  const selectedWhisper = foundWhisper;

  const selectedWhisperLocation = selectedWhisper
    ? parseLocation(selectedWhisper.Location)
    : null;

  console.log("Current openInfoWindowMarkerId:", openInfoWindowMarkerId);
  console.log("Selected Whisper Object:", selectedWhisper);
  console.log(
    "Selected Whisper Location for InfoWindow:",
    selectedWhisperLocation
  );

  if (error && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-red-500 p-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <Map
        mapId={"MAP_ID"} // Optional: Create Map ID in Google Cloud Console for custom styles
        defaultCenter={mapCenter}
        // center={mapCenter}
        // zoom={mapZoom}
        onCenterChanged={(ev) => setMapCenter(ev.detail.center)}
        gestureHandling={"greedy"} // Allows map interaction without holding ctrl/cmd
        disableDefaultUI={false} // Show default controls like zoom, fullscreen
        className="absolute top-0 bottom-0 w-full h-full"
      >
        {userLocation && (
          <AdvancedMarker position={userLocation} title={"Your Location"}>
            <div
              style={{
                width: "15px",
                height: "15px",
                backgroundColor: "blue",
                border: "2px solid white",
                borderRadius: "50%",
                boxShadow: "0 0 5px rgba(0, 0, 255, 0.5)",
              }}
            ></div>
          </AdvancedMarker>
        )}

        {/* Render whisper markers */}
        {whispers.map((whisper) => {
          const position = parseLocation(whisper.Location);
          if (!position) return null;

          return (
            <AdvancedMarker
              key={whisper._id}
              position={position}
              onClick={() => {
                console.log(
                  `Whisper clicked: ID=${whisper._id} Data Type=${whisper.DataType}, Description=${whisper.Data || "N/A"}`
                );
                setOpenInfoWindowMarkerId(whisper._id);
              }}
              title={`Whisper: ${whisper.Data.substring(0, 30)}...`} // Tooltip on hover
            >
              {/* Default Pin, can be customized */}
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  backgroundColor: "red",
                  border: "2px solid black",
                  borderRadius: "50%",
                  cursor: "pointer", // Indicate it's clickable
                }}
              />
            </AdvancedMarker>
          );
        })}

        {/* Render InfoWindow for the selected marker */}
        {selectedWhisper && selectedWhisperLocation && (
          <InfoWindow
            position={selectedWhisperLocation}
            pixelOffset={[0, -15]} // Adjust offset to position above marker pin
            onCloseClick={() => setOpenInfoWindowMarkerId(null)}
          >
            <div
              style={{
                maxWidth: "250px",
                padding: "5px",
                fontFamily: "sans-serif",
                fontSize: "14px",
              }}
            >
              <div
                style={{
                  maxWidth: "250px",
                  padding: "5px",
                  fontFamily: "sans-serif",
                  fontSize: "14px",
                }}
              >
                <h3 style={{ margin: "0 0 5px 0", fontSize: "1.1em" }}>
                  Whisper ({selectedWhisper.DataType}) {/* Correct Data Type */}
                </h3>
                {selectedWhisper.DataType === "text" && (
                  <p style={{ margin: "5px 0" }}>{selectedWhisper.Data}</p>
                )}{" "}
                {/* Correct Data */}
                {selectedWhisper.DataType === "image" &&
                  selectedWhisper.MediaUrl && (
                    <img
                      src={selectedWhisper.MediaUrl}
                      alt="Whisper content"
                      style={{
                        maxWidth: "100%",
                        maxHeight: "150px",
                        height: "auto",
                        display: "block",
                        margin: "5px 0",
                      }}
                    />
                  )}
                {selectedWhisper.DataType === "video" &&
                  selectedWhisper.MediaUrl && (
                    <video
                      controls
                      src={selectedWhisper.MediaUrl}
                      style={{
                        maxWidth: "100%",
                        height: "auto",
                        display: "block",
                        margin: "5px 0",
                      }}
                    >
                      Your browser does not support the video tag.
                    </video>
                  )}
                {selectedWhisper.Data &&
                  (selectedWhisper.DataType === "image" ||
                    selectedWhisper.DataType === "video") && (
                    <p style={{ margin: "5px 0" }}>
                      <em>{selectedWhisper.Data}</em>
                    </p>
                  )}
                <small
                  style={{ display: "block", marginTop: "8px", color: "#555" }}
                >
                  Emotions: {selectedWhisper.Emotions.join(", ") || "None"}
                </small>
                <small style={{ display: "block", color: "#555" }}>
                  Listens: {selectedWhisper.AmountListens}/
                  {selectedWhisper.MaxListens}
                </small>
              </div>
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
