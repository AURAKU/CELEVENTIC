"use client";

import { useEffect, useId, useRef, type CSSProperties } from "react";
import { extractMapsCoordinates, webMercatorTile } from "@/lib/invitation/maps-utils";

const TILE = 256;
/**
 * Level 15 is the Esri scale that paints road names and landmarks here.
 * A closer crop keeps two Community 12 pins from looking like one place.
 */
const ZOOM = 15;
const VIEW_SCALE = 1.22;
const SPAN = 3;

const STREETS =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile";

/**
 * Digital street preview, centred on a saved pin, with road names and landmarks.
 * A Google Maps iframe stays blank when that embed cannot load.
 */
export function InvitationMapPreview({
  mapsLink,
  place,
}: {
  mapsLink: string;
  place: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pinId = useId().replace(/:/g, "");
  const coords = extractMapsCoordinates(mapsLink);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const timers: number[] = [];
    for (const img of root.querySelectorAll("img")) {
      if (!img.complete || img.naturalWidth > 0) continue;
      const src = img.src.split("?")[0];
      timers.push(
        window.setTimeout(() => {
          img.src = `${src}?r=1`;
        }, 500)
      );
    }
    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [mapsLink]);

  if (!coords) return null;

  const point = webMercatorTile(coords.lat, coords.lng, ZOOM);
  const originX = Math.floor(point.x) - 1;
  const originY = Math.floor(point.y) - 1;
  const pinX = (point.x - originX) * TILE;
  const pinY = (point.y - originY) * TILE;
  const tiles = [];
  for (let row = 0; row < SPAN; row += 1) {
    for (let col = 0; col < SPAN; col += 1) {
      tiles.push({ x: originX + col, y: originY + row });
    }
  }

  return (
    <div ref={rootRef} className="relative h-64 w-full overflow-hidden bg-[#F4EFE6]" aria-hidden>
      <span className="sr-only">{place}</span>
      <div
        className="absolute"
        style={{
          left: "50%",
          top: "50%",
          width: SPAN * TILE,
          height: SPAN * TILE,
          transformOrigin: `${pinX}px ${pinY}px`,
          transform: `translate(${-pinX}px, ${-pinY}px) scale(${VIEW_SCALE})`,
        }}
      >
        {tiles.map((tile) => {
          const left = (tile.x - originX) * TILE;
          const top = (tile.y - originY) * TILE;
          return (
            <span key={`${tile.x}-${tile.y}`}>
              <MapTile
                src={`${STREETS}/${ZOOM}/${tile.y}/${tile.x}`}
                left={left}
                top={top}
                style={{
                  filter: "contrast(1.24) saturate(0.78) brightness(0.98)",
                }}
              />
            </span>
          );
        })}
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 46%, transparent 62%, rgba(27, 36, 48, 0.06) 100%)",
          boxShadow: "inset 0 0 0 1px rgba(251, 246, 239, 0.42)",
        }}
      />
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2">
        <span
          className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: "rgba(169, 133, 47, 0.28)",
            boxShadow: "0 0 0 7px rgba(169, 133, 47, 0.16)",
          }}
        />
      </div>
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[2] -translate-x-1/2 -translate-y-[calc(100%-2px)]">
        <svg width="28" height="36" viewBox="0 0 34 44" aria-hidden>
          <defs>
            <filter id={pinId} x="-40%" y="-20%" width="180%" height="170%">
              <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#1B2430" floodOpacity="0.42" />
            </filter>
          </defs>
          <ellipse cx="17" cy="40.5" rx="5.5" ry="1.8" fill="rgba(27,36,48,0.28)" />
          <path
            filter={`url(#${pinId})`}
            d="M17 38.4C17 38.4 30.2 22.6 30.2 14.6A13.2 13.2 0 1 0 3.8 14.6C3.8 22.6 17 38.4 17 38.4Z"
            fill="#A9852F"
            stroke="#FBF6EF"
            strokeWidth="1.7"
          />
          <circle cx="17" cy="14.5" r="4.4" fill="#FBF6EF" />
          <circle cx="17" cy="14.5" r="1.7" fill="#1B365D" />
        </svg>
      </div>
      <p className="pointer-events-none absolute bottom-2 left-2 z-[2] rounded-full bg-[#1B2430]/55 px-2 py-0.5 text-[8px] tracking-[0.12em] text-[#FBF6EF]/90">
        Map © Esri
      </p>
    </div>
  );
}

function MapTile({
  src,
  left,
  top,
  style,
}: {
  src: string;
  left: number;
  top: number;
  style?: CSSProperties;
}) {
  return (
    <img
      alt=""
      width={TILE}
      height={TILE}
      draggable={false}
      decoding="async"
      src={src}
      className="absolute"
      onLoad={(event) => {
        event.currentTarget.style.visibility = "visible";
      }}
      onError={(event) => {
        const img = event.currentTarget;
        img.style.visibility = "hidden";
        const tries = Number(img.dataset.tries || "0");
        if (tries >= 4) return;
        img.dataset.tries = String(tries + 1);
        const clean = img.src.split("?")[0];
        window.setTimeout(() => {
          img.src = `${clean}?r=${tries + 1}`;
        }, 350 * (tries + 1));
      }}
      style={{
        left,
        top,
        width: TILE,
        height: TILE,
        visibility: "hidden",
        ...style,
      }}
    />
  );
}
