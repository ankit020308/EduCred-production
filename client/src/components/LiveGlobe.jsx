import React from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Graticule,
  Sphere
} from "react-simple-maps";
import { motion } from "framer-motion";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Mock verification request locations
const markers = [
  { markerOffset: -15, name: "Cambridge", coordinates: [0.1218, 52.2053] },
  { markerOffset: 25, name: "Stanford", coordinates: [-122.1697, 37.4275] },
  { markerOffset: -15, name: "MIT", coordinates: [-71.0942, 42.3601] },
  { markerOffset: 25, name: "IIT Delhi", coordinates: [77.1928, 28.545] },
  { markerOffset: -15, name: "National Univ. Singapore", coordinates: [103.7764, 1.2966] },
  { markerOffset: 25, name: "ETH Zurich", coordinates: [8.5417, 47.3769] },
];

export default function LiveGlobe() {
  return (
    <div className="w-full h-full relative group">
      <div className="absolute inset-0 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
      
      <ComposableMap
        projectionConfig={{
          rotate: [-10, -20, 0],
          scale: 147
        }}
        className="w-full h-full"
      >
        <Sphere stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
        <Graticule stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} />
        
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="rgba(255,255,255,0.03)"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={0.5}
                style={{
                  default: { outline: "none" },
                  hover: { fill: "rgba(59, 130, 246, 0.1)", outline: "none" },
                  pressed: { outline: "none" },
                }}
              />
            ))
          }
        </Geographies>

        {markers.map(({ name, coordinates }) => (
          <Marker key={name} coordinates={coordinates}>
            <motion.circle
              initial={{ r: 0, opacity: 0 }}
              animate={{ r: 3, opacity: 1 }}
              transition={{ repeat: Infinity, duration: 2, repeatType: "reverse" }}
              fill="#3b82f6"
              stroke="#fff"
              strokeWidth={1}
            />
            <motion.circle
              initial={{ r: 3, opacity: 0.5 }}
              animate={{ r: 12, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 2 }}
              fill="#3b82f6"
            />
          </Marker>
        ))}
      </ComposableMap>

      <div className="absolute bottom-4 left-4 glass-pill px-4 py-2 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]" />
        <span className="text-[10px] font-black font-space text-slate-400 tracking-widest uppercase">Global Verification Traffic</span>
      </div>
    </div>
  );
}
