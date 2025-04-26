"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Map,
  AdvancedMarker,
} from "@vis.gl/react-google-maps";


interface Whisper {
  Location: string;
  DataType: string;
  Data: string;
  MaxListens: number;
  AmountListens: number;
  Emotions: string[];
  _id: string;
  MediaUrl?: string;
}

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

// function addNewWhisper(whisper: Whisper) {
//   console.log("Adding new whisper:", whisper);
  
//   fetch('http://localhost:8080/whisper', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify(whisper),
//   })
//     .then(response => response.json())
//     .then(data => {
//       console.log('Success:', data);
//     })
//     .catch((error) => {
//       console.error('Error:', error);
//     });
  
//     GoogleMapComponent();
// }

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

export function Sidepanel() {
  const [userLocation, setUserLocation] = useState<LatLngLiteral | null>(null);
  const [mapCenter, setMapCenter] = useState<LatLngLiteral>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState<number>(DEFAULT_ZOOM);
  const [whispers, setWhispers] = useState<Whisper[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWhisper, setSelectedWhisper] = useState<Whisper | null>(null);

  // Function to fetch  (mostly unchanged, uses userLocation state)
  const fetchWhispers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const backendUrl = `http://localhost:8080/whispers`;
    const apiUrl = backendUrl;
    console.log(`Fetching whispers from: ${apiUrl}`);

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
  }, []); 

  useEffect(() => {
    fetchWhispers();
  }, [fetchWhispers]); 

  if (error && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-red-500 p-4">
        Error: {error}
      </div>
    );
  }

  whispers.map((whisper) => {
    const position = parseLocation(whisper.Location);
    if (!position) return null;

    return (
      <AdvancedMarker
        key={whisper._id}
        position={position}
        onClick={() => {
          
          setSelectedWhisper(whisper);
        }}
        title={`Whisper: ${whisper.Data.substring(0, 30)}...`}
      >
        <div
          style={{
            width: "20px",
            height: "20px",
            backgroundColor: "red",
            border: "2px solid black",
            borderRadius: "50%",
            cursor: "pointer",
          }}
        />
      </AdvancedMarker>
    );
  })

  return (

      <div className="bg-gray-100 p-4 border-l h-full border-gray-300 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Whisper Details</h2>
        {selectedWhisper ? (
          <div>
            <h3 className="text-lg font-semibold mb-2">
              ({selectedWhisper.DataType})
            </h3>
            {selectedWhisper.DataType === "text" && (
              <p className="mb-3">{selectedWhisper.Data}</p>
            )}
            {selectedWhisper.DataType === "image" &&
              selectedWhisper.MediaUrl && (
                <img
                  src={selectedWhisper.MediaUrl}
                  alt="Whisper content"
                  className="w-full h-auto rounded mb-3"
                />
              )}
            {selectedWhisper.DataType === "video" &&
              selectedWhisper.MediaUrl && (
                <video
                  controls
                  src={selectedWhisper.MediaUrl}
                  className="w-full h-auto rounded mb-3"
                >
                  Your browser does not support the video tag.
                </video>
              )}
            {selectedWhisper.Data &&
              (selectedWhisper.DataType === "image" ||
                selectedWhisper.DataType === "video") && (
                <p className="italic text-gray-600 mb-3">
                  {selectedWhisper.Data}
                </p>
              )}
            <p className="text-sm text-gray-700 mb-1">
              Emotions: {selectedWhisper.Emotions.join(", ") || "None"}
            </p>
            <p className="text-sm text-gray-700">
              Listens: {selectedWhisper.AmountListens}/
              {selectedWhisper.MaxListens}
            </p>
            <button
              onClick={() => setSelectedWhisper(null)}
              className="mt-4 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded text-gray-800"
            >
              Clear Selection
            </button>
          </div>
        ) : (
          <p className="text-gray-500">Click a marker to view details.</p>
        )}
        <button className="p-8 m-12 bg-black text-white">Upload</button>
    </div>
  );
}