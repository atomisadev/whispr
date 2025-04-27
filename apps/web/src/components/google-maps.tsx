// apps/web/src/components/google-maps.tsx
"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  ChangeEvent,
} from "react";
import { Map, AdvancedMarker, APIProvider } from "@vis.gl/react-google-maps";
import Image from "next/image";

interface Whisper {
  _id: string;
  Location: string;
  DataType: "text" | "image" | "video";
  Data: string;
  MaxListens: number;
  AmountListens: number;
  Emotions: string[];
  MediaUrl?: string;
  position?: LatLngLiteral;
}

interface CodeJsonItem {
  filename: string;
  emotion: string;
  location: string; // "lat,lng"
}

interface LatLngLiteral {
  lat: number;
  lng: number;
}

const DEFAULT_CENTER: LatLngLiteral = { lat: 40.6945, lng: -74.547 };
const DEFAULT_ZOOM = 17;
const INITIAL_LOAD_COUNT = 4;

const parseLocation = (locationString: string): LatLngLiteral | null => {
  try {
    const parts = locationString.split(",");
    if (parts.length !== 2) {
      console.error(`Invalid location string format: "${locationString}"`);
      return null;
    }
    const lat = parseFloat(parts[0].trim());
    const lng = parseFloat(parts[1].trim());
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
        `Invalid number format or range: lat='${lat}', lng='${lng}' from string "${locationString}"`
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
  const [allCodeData, setAllCodeData] = useState<CodeJsonItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWhisper, setSelectedWhisper] = useState<Whisper | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processCodeItemToWhisper = (
    item: CodeJsonItem,
    index?: number
  ): Whisper | null => {
    const position = parseLocation(item.location);
    if (!position) {
      console.warn(
        `Skipping item due to invalid location: ${JSON.stringify(item)}`
      );
      return null;
    }

    const expectedDataType = item.filename.endsWith(".mov")
      ? "video"
      : "unknown";
    if (expectedDataType === "unknown") {
      console.warn(
        `File ${item.filename} does not have expected .mov extension in code.json. Processing as video anyway.`
      );
    }

    return {
      _id: item.filename || `whisper-${index}`,
      Location: item.location,
      DataType: "video",
      Emotions: item.emotion
        .split("/")
        .map((e) => e.trim())
        .filter((e) => e),
      Data: `Emotion: ${item.emotion}`,
      MediaUrl: `/videos/${item.filename}`,
      MaxListens: 10,
      AmountListens: 0,
      position: position,
    };
  };

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const getGeoLocation = new Promise<void>((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const currentLocation = { lat: latitude, lng: longitude };
            setUserLocation(currentLocation);
            setMapCenter(currentLocation);
            setMapZoom(15);
            resolve();
          },
          (err) => {
            console.warn(`Geolocation Error (${err.code}): ${err.message}`);
            setError("Unable to retrieve location. Showing default area.");
            setMapCenter(DEFAULT_CENTER);
            setMapZoom(DEFAULT_ZOOM);
            resolve();
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      } else {
        setError("Geolocation is not supported by this browser.");
        setMapCenter(DEFAULT_CENTER);
        setMapZoom(DEFAULT_ZOOM);
        resolve();
      }
    });

    const loadData = async () => {
      try {
        const response = await fetch("/code.json");
        if (!response.ok) {
          throw new Error(
            `HTTP error! status: ${response.status} fetching code.json`
          );
        }
        const data: CodeJsonItem[] = await response.json();
        setAllCodeData(data);

        const initialWhispers: Whisper[] = data
          .slice(0, INITIAL_LOAD_COUNT)
          .map(processCodeItemToWhisper)
          .filter((w): w is Whisper => w !== null);

        setWhispers(initialWhispers);
        console.log(
          `Automatically loaded initial ${initialWhispers.length} whispers:`,
          initialWhispers
        );
      } catch (err) {
        console.error("Failed to load or process initial whispers:", err);
        setError(
          err instanceof Error
            ? err.message
            : "An unknown error occurred loading initial data"
        );
        setWhispers([]);
        setAllCodeData([]);
      }
    };

    Promise.all([getGeoLocation, loadData()]).finally(() => {
      setIsLoading(false);
    });
  }, []);

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const uploadedFilename = file.name;
    console.log(`File upload attempt: ${uploadedFilename}`);

    const isAlreadyLoaded = whispers.some((w) => w._id === uploadedFilename);
    if (isAlreadyLoaded) {
      alert(`${uploadedFilename} is already loaded on the map.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const matchingCodeItem = allCodeData.find(
      (item) => item.filename === uploadedFilename
    );

    if (matchingCodeItem) {
      console.log(
        `Found matching data for ${uploadedFilename}:`,
        matchingCodeItem
      );
      const newWhisper = processCodeItemToWhisper(matchingCodeItem);
      if (newWhisper) {
        setWhispers((prevWhispers) => [...prevWhispers, newWhisper]);
        console.log(`Added new whisper for ${uploadedFilename} to map.`);
        if (newWhisper.position) {
          setMapCenter(newWhisper.position);
        }
        alert(`${uploadedFilename} added to the map!`);
      } else {
        console.error(`Failed to process matched item for ${uploadedFilename}`);
        alert(`Error processing data for ${uploadedFilename}.`);
      }
    } else {
      console.log(
        `No matching data found in code.json for ${uploadedFilename}`
      );
      alert(
        `${uploadedFilename} not found in the predefined list (code.json) or has invalid data.`
      );
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-600">
        Loading Map and Initial Data...
      </div>
    );
  }

  if (error && whispers.length === 0 && allCodeData.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen text-red-600 p-4 bg-red-50">
        Error loading initial map data: {error}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 grid-row-1 h-full gap-4">
      {/* Google Map Section */}
      <div className="col-span-2 relative">
        <Map
          mapId={process.env.NEXT_PUBLIC_MAP_ID || "DEMO_MAP_ID"}
          defaultCenter={mapCenter}
          defaultZoom={mapZoom}
          streetViewControl={false}
          gestureHandling={"greedy"}
          disableDefaultUI={false}
          className={"h-full w-full"}
        >
          {/* User Location Marker */}
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
                  transform: "translate(-50%, -50%)",
                }}
              ></div>
            </AdvancedMarker>
          )}

          {/* Whisper Markers */}
          {whispers.map((whisper) => {
            if (!whisper.position) return null;
            return (
              <AdvancedMarker
                key={whisper._id}
                position={whisper.position}
                onClick={() => {
                  setSelectedWhisper(whisper);
                }}
                title={`Whisper: ${whisper.Emotions.join(", ")}`}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    backgroundColor: "#DC2626",
                    border: "2px solid black",
                    borderRadius: "50%",
                    cursor: "pointer",
                    transform: "translate(-50%, -50%)",
                  }}
                />
              </AdvancedMarker>
            );
          })}
        </Map>

        {error && (
          <div className="absolute bottom-2 left-2 bg-red-100 text-red-700 bg-opacity-90 p-2 rounded shadow z-10 text-sm">
            Note: {error}
          </div>
        )}
      </div>

      <div className="col-span-1 p-4 overflow-y-auto bg-[#0F2026] text-[#f2f2f2]">
        <h2 className="text-xl font-semibold mb-4">Whisper Details</h2>
        {selectedWhisper ? (
          <div>
            {selectedWhisper.DataType === "video" &&
              selectedWhisper.MediaUrl && (
                <div className="mb-3">
                  <video
                    controls
                    src={selectedWhisper.MediaUrl}
                    className="w-full h-auto rounded bg-black"
                  >
                    Your browser does not support the video tag. Video:{" "}
                    {selectedWhisper._id}
                  </video>
                </div>
              )}
            {selectedWhisper.DataType === "image" &&
              selectedWhisper.MediaUrl && (
                <img
                  src={selectedWhisper.MediaUrl}
                  alt={`Whisper content ${selectedWhisper._id}`}
                  className="w-full h-auto rounded mb-3 object-contain"
                />
              )}
            {selectedWhisper.DataType === "text" && (
              <p className="mb-3 p-2 bg-gray-100 rounded border border-gray-200">
                {selectedWhisper.Data}
              </p>
            )}

            <p className="text-sm text-gray-700 mb-1">
              <strong>Emotions:</strong>{" "}
              {selectedWhisper.Emotions.join(", ") || "N/A"}
            </p>
            <p className="text-sm text-gray-700 mb-1">
              <strong>Location:</strong> {selectedWhisper.Location}
            </p>
            <p className="text-sm text-gray-700 mb-3">
              <strong>Listens:</strong> {selectedWhisper.AmountListens}/
              {selectedWhisper.MaxListens}
            </p>
            <p className="text-xs text-gray-500 mb-3">
              ID: {selectedWhisper._id}
            </p>

            <button
              onClick={() => setSelectedWhisper(null)}
              className="mt-4 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded text-gray-800 text-sm"
            >
              Clear Selection
            </button>
          </div>
        ) : (
          <p className="text-gray-500 italic">
            Click a marker on the map to view details.
          </p>
        )}

        <div className="mt-8 pt-4 border-t border-gray-300">
          <h3 className="text-lg font-semibold mb-2">Add Video Marker</h3>
          <p className="text-xs text-gray-600 mb-2">
            Select a predefined video file (e.g., video4.mov, video5.mov...) to
            add its marker to the map.
          </p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="video/quicktime,.mov"
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#4E4BFF] file:text-[#f2f2f2] hover:file:bg-[#4E4BFFaa] disabled:opacity-50"
            disabled={allCodeData.length === 0}
          />
          {allCodeData.length === 0 && !isLoading && (
            <p className="text-xs text-red-600 mt-1">
              Cannot upload: Initial video list failed to load.
            </p>
          )}
        </div>

        {/* Removed LocalStorage Display Section */}
      </div>
    </div>
  );
}
