// apps/web/src/components/mapbox.tsx
"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import mapboxgl, { Map as MapboxMap, Marker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface Whisper {
  Location: string;
  Data: string;
  DataType: string;
  MaxListens: number;
  AmountListens: number;
  Emotions: string[];
  _id: string;
}

interface WhisperApiResponse {
  status: number;
  message: string;
  data?: {
    data: Whisper[];
  };
}

const DEFAULT_CENTER: [number, number] = [-74.5, 40];
const DEFAULT_ZOOM = 10;
const SEARCH_RADIUS_KM = 5;
const BACKEND_RADIUS_UNITS = SEARCH_RADIUS_KM * 100;

export function MapComponent() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapboxMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [whispers, setWhispers] = useState<Whisper[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to clear existing markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
  }, []);

  // Function to fetch whispers from the backend
  const fetchWhispers = useCallback(
    async (lat: number, lng: number) => {
      setIsLoading(true);
      setError(null);
      clearMarkers(); // Clear previous markers before fetching new ones

      // --- Adjust Backend URL if necessary ---
      // If your backend runs on a different port (e.g., 8080) and isn't proxied:
      // const backendUrl = `http://localhost:8080/whispers`;
      // Otherwise, use a relative path if proxied or same-origin:
      const backendUrl = `/api/whispers`; // Adjust if you have a different API prefix
      // ---------------------------------------

      const apiUrl = `${backendUrl}?location=${lat},${lng}&radius=${BACKEND_RADIUS_UNITS}`;

      console.log(`Workspaceing whispers from: ${apiUrl}`); // Debug log

      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result: WhisperApiResponse = await response.json();

        console.log("API Response:", result); // Debug log

        if (result.status >= 200 && result.status < 300 && result.data?.data) {
          setWhispers(result.data.data);
        } else {
          // Handle cases where the API returns success status but no data field or empty data
          if (result.status >= 200 && result.status < 300) {
            console.log(
              "API returned success but no whispers found in the response data."
            );
            setWhispers([]); // Set to empty array if data field is missing or empty
          } else {
            throw new Error(result.message || "Failed to fetch whispers");
          }
        }
      } catch (err) {
        console.error("Failed to fetch whispers:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
        setWhispers([]);
      } finally {
        setIsLoading(false);
      }
    },
    [clearMarkers]
  );

  useEffect(() => {
    if (!mapboxToken) {
      console.error("Mapbox Token is missing inside useEffect.");
      setError(
        "Mapbox Token is missing. Configure NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN."
      );
      return;
    }

    if (map.current || !mapContainer.current) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/standard",
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: true,
      showUserHeading: true,
    });
    map.current.addControl(geolocate);

    geolocate.on("geolocate", (e: any) => {
      const { latitude, longitude } = e.coords;
      console.log(`Geolocate event: Lat: ${latitude}, Lng: ${longitude}`);
      setUserLocation({ lat: latitude, lng: longitude });
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log(
            `Initial geolocation: Lat: ${latitude}, Lng: ${longitude}`
          );
          setUserLocation({ lat: latitude, lng: longitude });
          map.current?.flyTo({ center: [longitude, latitude], zoom: 14 });
        },
        (err) => {
          console.warn(`Geolocation Error (${err.code}): ${err.message}`);
          setError("Unable to retrieve location. Showing default area.");
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setError("Geolocation is not supported by this browser.");
    }

    // Cleanup map instance on component unmount
    return () => {
      clearMarkers();
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken, clearMarkers]); // mapboxToken should only change if env changes, clearMarkers is stable

  // Effect 2: Fetch whispers when user location changes
  useEffect(() => {
    if (userLocation) {
      fetchWhispers(userLocation.lat, userLocation.lng);
    }
  }, [userLocation, fetchWhispers]); // Re-fetch when location changes

  // Effect 3: Render markers when whispers data changes or map is ready
  useEffect(() => {
    if (!map.current || !whispers || whispers.length === 0) {
      clearMarkers(); // Ensure markers are cleared if no whispers
      return;
    }

    console.log(`Rendering ${whispers.length} whisper markers.`); // Debug log
    clearMarkers(); // Clear old markers before adding new ones

    whispers.forEach((whisper) => {
      try {
        const [latStr, lngStr] = whisper.Location.split(",");
        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);

        if (!isNaN(lat) && !isNaN(lng)) {
          const marker = new mapboxgl.Marker()
            .setLngLat([lng, lat]) // Mapbox uses [longitude, latitude]
            .setPopup(
              new mapboxgl.Popup().setHTML(
                `<h3>Whisper</h3><p>${whisper.Data.substring(0, 50)}...</p>`
              )
            ) // Optional: Add popup
            .addTo(map.current!);

          markersRef.current.push(marker);
        } else {
          console.warn(
            `Invalid location format for whisper ${whisper._id}: ${whisper.Location}`
          );
        }
      } catch (e) {
        console.error(
          `Error processing whisper location ${whisper._id}: ${whisper.Location}`,
          e
        );
      }
    });
  }, [whispers, map.current, clearMarkers]); // Re-render markers when whispers or map change

  // Render Logic
  if (!mapboxToken && !error) {
    // Initial state before token check effect runs
    return (
      <div className="flex items-center justify-center h-full">
        Checking Mapbox token...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500 p-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div
        ref={mapContainer}
        className="absolute top-0 bottom-0 w-full h-full"
      />
      {isLoading && (
        <div className="absolute top-2 left-2 bg-white bg-opacity-80 p-2 rounded shadow z-10">
          Loading whispers...
        </div>
      )}
    </div>
  );
}
