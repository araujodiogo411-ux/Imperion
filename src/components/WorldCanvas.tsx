import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Country, Empire, War, GameTool, StateTerritory, City } from '../types/game';
import { OCEAN_LABELS } from '../data/worldCountries';
import {
  WorldMapEngine,
  GRID_WIDTH,
  GRID_HEIGHT,
  TERRAIN_SHALLOW_WATER,
  TERRAIN_RIVER,
  TERRAIN_LAND,
  CutResult,
} from '../utils/mapEngine';
import { StateInteractionMode } from './StatePalette';
import { FlagView } from './FlagView';
import { sound } from '../utils/audio';

interface WorldCanvasProps {
  engine: WorldMapEngine;
  countries: Country[];
  empires: Empire[];
  states: StateTerritory[];
  cities: City[];
  activeWars: War[];
  currentTool: GameTool;
  brushRadius: number;
  brushStyle: 'solid' | 'organic';
  brushAction: 'paint' | 'erase';
  paintOverWater: boolean;
  isEyedropperActive: boolean;
  selectedCountry: Country | null;
  selectedState: StateTerritory | null;
  stateInteractionMode: StateInteractionMode;
  dayNightAngle: number;
  showDayNight: boolean;
  showLabels: boolean;
  isPaused: boolean;
  simSpeed: number;
  onSelectCountry: (country: Country | null) => void;
  onEyedropperPick: (country: Country) => void;
  onCutFinished: (cutResult: CutResult) => void;
  onTerritoryUpdated: () => void;
  onStateUpdated: () => void;
  onMoveCapital: (gx: number, gy: number) => void;
  onPlaceCity: (gx: number, gy: number) => void;
  onCarveNewState: (gx: number, gy: number) => void;
}

export const WorldCanvas: React.FC<WorldCanvasProps> = ({
  engine,
  countries,
  empires,
  states,
  cities,
  activeWars,
  currentTool,
  brushRadius,
  brushStyle,
  brushAction,
  paintOverWater,
  isEyedropperActive,
  selectedCountry,
  selectedState,
  stateInteractionMode,
  dayNightAngle,
  showDayNight,
  showLabels,
  isPaused,
  simSpeed,
  onSelectCountry,
  onEyedropperPick,
  onCutFinished,
  onTerritoryUpdated,
  onStateUpdated,
  onMoveCapital,
  onPlaceCity,
  onCarveNewState,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Camera Pan & Zoom
  const [scale, setScale] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const viewSizeRef = useRef({ width: 1200, height: 600, dpr: 1 });

  // Pointer & Drag States
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const didPanDragRef = useRef(false);

  // Scissors Freehand Drawing
  const [isCutting, setIsCutting] = useState(false);
  const scissorsPathRef = useRef<{ x: number; y: number }[]>([]);

  // Continuous Freehand Painting
  const isPaintingRef = useRef(false);
  const lastPaintPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastSoundTimeRef = useRef(0);

  // Cursor & Hover Tooltip
  const cursorGridRef = useRef<{ x: number; y: number } | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    country: Country | null;
    empire: Empire | null;
    state: StateTerritory | null;
    terrainLabel: string;
  } | null>(null);

  // Fast lookups kept up to date via refs
  const countriesRef = useRef(countries);
  const empiresRef = useRef(empires);
  const statesRef = useRef(states);
  const citiesRef = useRef(cities);
  const numIdMapRef = useRef(new Map<number, Country>());
  const empireMapRef = useRef(new Map<string, Empire>());
  const stateNumIdMapRef = useRef(new Map<number, StateTerritory>());

  useEffect(() => {
    countriesRef.current = countries;
    numIdMapRef.current.clear();
    countries.forEach((c) => numIdMapRef.current.set(c.numericId, c));
  }, [countries]);

  useEffect(() => {
    empiresRef.current = empires;
    empireMapRef.current.clear();
    empires.forEach((e) => empireMapRef.current.set(e.id, e));
  }, [empires]);

  useEffect(() => {
    statesRef.current = states;
    stateNumIdMapRef.current.clear();
    states.forEach((s) => stateNumIdMapRef.current.set(s.numericId, s));
  }, [states]);

  useEffect(() => {
    citiesRef.current = cities;
  }, [cities]);

  const isPausedRef = useRef(isPaused);
  const simSpeedRef = useRef(simSpeed);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
  useEffect(() => {
    simSpeedRef.current = simSpeed;
  }, [simSpeed]);

  const getBaseMapRect = useCallback(() => {
    const { width: vw, height: vh } = viewSizeRef.current;
    const targetAspect = GRID_WIDTH / GRID_HEIGHT; // 2:1
    const viewAspect = vw / vh;

    let baseW = vw;
    let baseH = vh;
    let offsetX = 0;
    let offsetY = 0;

    if (viewAspect > targetAspect) {
      baseH = vh;
      baseW = vh * targetAspect;
      offsetX = (vw - baseW) / 2;
    } else {
      baseW = vw;
      baseH = vw / targetAspect;
      offsetY = (vh - baseH) / 2;
    }
    return { baseW, baseH, offsetX, offsetY };
  }, []);

  const clientToGrid = useCallback(
    (clientX: number, clientY: number): { x: number; y: number; localX: number; localY: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;

      const worldX = (localX - pan.x) / scale;
      const worldY = (localY - pan.y) / scale;

      const { baseW, baseH, offsetX, offsetY } = getBaseMapRect();
      const gx = Math.floor(((worldX - offsetX) / baseW) * GRID_WIDTH);
      const gy = Math.floor(((worldY - offsetY) / baseH) * GRID_HEIGHT);

      if (gx < 0 || gx >= GRID_WIDTH || gy < 0 || gy >= GRID_HEIGHT) {
        return null;
      }
      return { x: gx, y: gy, localX, localY };
    },
    [scale, pan, getBaseMapRect]
  );

  // Main High-FPS Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      if (!isPausedRef.current && engine.soldiers.length > 0) {
        engine.stepSoldiers(0.28 * Math.min(3, simSpeedRef.current));
      }

      const { width: vw, height: vh, dpr } = viewSizeRef.current;
      const { baseW, baseH, offsetX, offsetY } = getBaseMapRect();

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, vw, vh);

      // Deep ocean space background
      ctx.fillStyle = '#071122';
      ctx.fillRect(0, 0, vw, vh);

      // 1. World-Space Layer
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(scale, scale);

      ctx.imageSmoothingEnabled = scale < 2.2;
      ctx.drawImage(engine.bufferCanvas, offsetX, offsetY, baseW, baseH);

      // Subtle Latitude/Longitude Graticule Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
      ctx.lineWidth = 1 / scale;
      for (let i = 1; i < 12; i++) {
        const lx = offsetX + (baseW * i) / 12;
        ctx.beginPath();
        ctx.moveTo(lx, offsetY);
        ctx.lineTo(lx, offsetY + baseH);
        ctx.stroke();
      }
      for (let j = 1; j < 6; j++) {
        const ly = offsetY + (baseH * j) / 6;
        ctx.beginPath();
        ctx.moveTo(offsetX, ly);
        ctx.lineTo(offsetX + baseW, ly);
        ctx.stroke();
      }

      // Ocean & Equator Delimitation Lines
      ctx.save();
      ctx.setLineDash([6 / scale, 5 / scale]);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.24)';
      ctx.lineWidth = 1.1 / scale;
      // Equator line (geographic equator on NaturalEarth1 fit)
      const eqY = offsetY + baseH * 0.525;
      ctx.beginPath();
      ctx.moveTo(offsetX, eqY);
      ctx.lineTo(offsetX + baseW, eqY);
      ctx.stroke();

      // Polar / Ocean sector dividers (Arctic & Antarctic ocean boundary lines)
      const arcticY = offsetY + baseH * 0.14;
      const antarcticY = offsetY + baseH * 0.78;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
      ctx.beginPath();
      ctx.moveTo(offsetX, arcticY);
      ctx.lineTo(offsetX + baseW, arcticY);
      ctx.moveTo(offsetX, antarcticY);
      ctx.lineTo(offsetX + baseW, antarcticY);
      ctx.stroke();
      ctx.restore();

      // 2. Day / Night Terminator + Dense Populated Night Lights
      if (showDayNight) {
        const nightCenterNorm = ((dayNightAngle % 360) / 360);
        const nightCenterX = offsetX + nightCenterNorm * baseW;

        // Draw smooth wrapped darkness overlay across the map
        const halfNightW = baseW * 0.28;
        for (const shift of [-baseW, 0, baseW]) {
          const cx = nightCenterX + shift;
          const grad = ctx.createLinearGradient(cx - halfNightW, 0, cx + halfNightW, 0);
          grad.addColorStop(0, 'rgba(2, 6, 23, 0)');
          grad.addColorStop(0.22, 'rgba(217, 119, 6, 0.08)');
          grad.addColorStop(0.36, 'rgba(2, 6, 23, 0.56)');
          grad.addColorStop(0.5, 'rgba(2, 6, 23, 0.66)');
          grad.addColorStop(0.64, 'rgba(2, 6, 23, 0.56)');
          grad.addColorStop(0.78, 'rgba(217, 119, 6, 0.08)');
          grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
          ctx.fillStyle = grad;
          ctx.fillRect(offsetX, offsetY, baseW, baseH);
        }

        // Dense Urban City Lights inside night hemisphere!
        const lightR = 1.3 / Math.sqrt(scale);
        for (const light of engine.nightLights) {
          const lxNorm = light.x / GRID_WIDTH;
          // Wrapped angular distance to night center (0..0.5)
          let dist = Math.abs(lxNorm - nightCenterNorm);
          if (dist > 0.5) dist = 1 - dist;
          if (dist < 0.23) {
            const fade = Math.min(1, (0.23 - dist) / 0.08);
            const mapX = offsetX + lxNorm * baseW;
            const mapY = offsetY + (light.y / GRID_HEIGHT) * baseH;
            const alpha = light.brightness * fade;
            if (light.brightness >= 0.88) {
              ctx.fillStyle = `rgba(245, 158, 11, ${(alpha * 0.28).toFixed(2)})`;
              ctx.beginPath();
              ctx.arc(mapX, mapY, lightR * 2.2, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = `rgba(254, 240, 138, ${alpha.toFixed(2)})`;
            ctx.beginPath();
            ctx.arc(mapX, mapY, lightR * (0.72 + light.brightness * 0.55), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 3. Active War Frontline Soldiers (Each country's soldiers in its own color invading across the border!)
      if (engine.soldiers.length > 0) {
        const soldierRadius = 2.6 / scale;
        ctx.strokeStyle = 'rgba(2, 6, 23, 0.92)';
        ctx.lineWidth = 0.9 / scale;
        for (const s of engine.soldiers) {
          const sx = offsetX + (s.x / GRID_WIDTH) * baseW;
          const sy = offsetY + (s.y / GRID_HEIGHT) * baseH;
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(sx, sy, soldierRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      // 4. Freehand Scissors Drawing Stroke Preview
      const scPath = scissorsPathRef.current;
      if (isCutting && scPath.length > 1) {
        ctx.save();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5 / scale;
        ctx.setLineDash([7 / scale, 5 / scale]);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(
          offsetX + (scPath[0].x / GRID_WIDTH) * baseW,
          offsetY + (scPath[0].y / GRID_HEIGHT) * baseH
        );
        for (let i = 1; i < scPath.length; i++) {
          ctx.lineTo(
            offsetX + (scPath[i].x / GRID_WIDTH) * baseW,
            offsetY + (scPath[i].y / GRID_HEIGHT) * baseH
          );
        }
        ctx.stroke();

        const first = scPath[0];
        const last = scPath[scPath.length - 1];
        ctx.setLineDash([]);
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(
          offsetX + (first.x / GRID_WIDTH) * baseW,
          offsetY + (first.y / GRID_HEIGHT) * baseH,
          4 / scale,
          0,
          Math.PI * 2
        );
        ctx.arc(
          offsetX + (last.x / GRID_WIDTH) * baseW,
          offsetY + (last.y / GRID_HEIGHT) * baseH,
          5 / scale,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
      }

      // 5. Brush Cursor Ring in World Space
      const cGrid = cursorGridRef.current;
      const isStatePaintRing =
        currentTool === 'states' &&
        (stateInteractionMode === 'paint_state' || stateInteractionMode === 'place_new_state');
      const showBrushRing =
        cGrid &&
        !isEyedropperActive &&
        (currentTool === 'pencil' ||
          currentTool === 'land' ||
          currentTool === 'water_shallow' ||
          currentTool === 'water_deep' ||
          currentTool === 'river' ||
          isStatePaintRing);

      if (showBrushRing && cGrid) {
        const cx = offsetX + (cGrid.x / GRID_WIDTH) * baseW;
        const cy = offsetY + (cGrid.y / GRID_HEIGHT) * baseH;
        const effBrushR = currentTool === 'river' ? 1.5 : brushRadius;
        const r = (effBrushR / GRID_WIDTH) * baseW;

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(r, 2 / scale), 0, Math.PI * 2);

        if (isStatePaintRing) {
          const stColor = selectedState?.color || '#34d399';
          ctx.strokeStyle = stColor;
          ctx.fillStyle = `${stColor}40`;
        } else if (currentTool === 'pencil') {
          const ringColor =
            brushAction === 'erase' ? '#e2e8f0' : selectedCountry?.color || '#fbbf24';
          ctx.strokeStyle = ringColor;
          ctx.fillStyle = `${ringColor}33`;
        } else if (currentTool === 'land') {
          ctx.strokeStyle = '#4ade80';
          ctx.fillStyle = 'rgba(74, 222, 128, 0.25)';
        } else {
          ctx.strokeStyle = '#38bdf8';
          ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        }

        ctx.lineWidth = 1.6 / scale;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();

      // 6. SCREEN-SPACE CARTOGRAPHIC LABELS (Oceans, Equator, Countries, States, Cities)
      if (showLabels) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 6a. Ocean Names & Equator Label (Crisp translucent cartographic typography)
        const oceanFontSize = Math.min(13, Math.max(9.5, 9 + scale * 0.9));
        ctx.font = `italic 600 ${oceanFontSize}px "Cinzel", Georgia, serif`;
        ctx.fillStyle = 'rgba(125, 211, 252, 0.55)';
        for (const ol of OCEAN_LABELS) {
          const ox = pan.x + (offsetX + ol.normX * baseW) * scale;
          const oy = pan.y + (offsetY + ol.normY * baseH) * scale;
          if (ox < -120 || ox > vw + 120 || oy < -40 || oy > vh + 40) continue;
          ctx.fillText(ol.name, ox, oy);
        }
        // Equator text tag
        const eqScreenX = pan.x + (offsetX + 0.08 * baseW) * scale;
        const eqScreenY = pan.y + (offsetY + 0.525 * baseH) * scale - 9;
        if (eqScreenY > 40 && eqScreenY < vh - 20) {
          ctx.font = `600 9px "Plus Jakarta Sans", sans-serif`;
          ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
          ctx.fillText('LINHA DO EQUADOR', eqScreenX, eqScreenY);
        }

        // 6b. Country & Empire Labels (with collision avoidance)
        const processedEmpires = new Set<string>();
        const placedBoxes: { x1: number; y1: number; x2: number; y2: number }[] = [];

        const sorted = countriesRef.current
          .slice()
          .sort((a, b) => b.territoryCells - a.territoryCells);

        const minCellsForZoom =
          scale < 1.25 ? 240 : scale < 2.0 ? 60 : scale < 3.2 ? 15 : 4;

        for (const c of sorted) {
          if (c.territoryCells < 4 && !c.isCustom) continue;

          const empire = c.empireId ? empireMapRef.current.get(c.empireId) : null;
          let labelText = c.name;
          let subLabel = scale >= 2.3 ? `★ ${c.capital}` : '';
          let worldX = c.centerX;
          let worldY = c.centerY;
          let isEmpire = false;

          if (empire) {
            if (processedEmpires.has(empire.id)) continue;
            processedEmpires.add(empire.id);
            isEmpire = true;
            labelText = `👑 ${empire.name.toUpperCase()}`;
            subLabel = `Império · ${empire.capital}`;

            const members = countriesRef.current.filter((m) => empire.memberIds.includes(m.id));
            if (members.length > 0) {
              worldX = members.reduce((acc, m) => acc + m.centerX, 0) / members.length;
              worldY = members.reduce((acc, m) => acc + m.centerY, 0) / members.length;
            }
          } else {
            const isSelected = selectedCountry?.id === c.id;
            // In states mode, hide the selected country's big label so state labels inside it remain legible!
            if (currentTool === 'states' && isSelected) continue;
            if (!isSelected && !c.isCustom && c.territoryCells < minCellsForZoom) {
              continue;
            }
          }

          const sx = pan.x + (offsetX + (worldX / GRID_WIDTH) * baseW) * scale;
          const sy = pan.y + (offsetY + (worldY / GRID_HEIGHT) * baseH) * scale;

          if (sx < -80 || sx > vw + 80 || sy < -40 || sy > vh + 40) continue;

          const fontSize = isEmpire
            ? Math.min(18, Math.max(12, 12 + scale * 1.4))
            : Math.min(14, Math.max(10, 9.5 + scale * 1.1));

          ctx.font = isEmpire
            ? `700 ${fontSize}px Cinzel, serif`
            : `600 ${fontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;

          const textW = ctx.measureText(labelText).width;
          const boxW = textW + 12;
          const boxH = subLabel ? fontSize * 2.1 : fontSize + 6;

          const box = {
            x1: sx - boxW / 2,
            y1: sy - boxH / 2,
            x2: sx + boxW / 2,
            y2: sy + boxH / 2,
          };

          let overlaps = false;
          if (!isEmpire && selectedCountry?.id !== c.id) {
            for (const pb of placedBoxes) {
              if (box.x1 < pb.x2 && box.x2 > pb.x1 && box.y1 < pb.y2 && box.y2 > pb.y1) {
                overlaps = true;
                break;
              }
            }
          }
          if (overlaps) continue;
          placedBoxes.push(box);

          ctx.lineJoin = 'round';
          ctx.miterLimit = 2;
          ctx.strokeStyle = 'rgba(2, 6, 23, 0.92)';
          ctx.lineWidth = 3.2;
          ctx.strokeText(labelText, sx, sy);

          ctx.fillStyle = isEmpire
            ? '#fde047'
            : selectedCountry?.id === c.id
            ? '#38bdf8'
            : '#f8fafc';
          ctx.fillText(labelText, sx, sy);

          if (subLabel) {
            ctx.font = `500 ${Math.max(9, fontSize * 0.78)}px "Plus Jakarta Sans", system-ui, sans-serif`;
            ctx.lineWidth = 2.6;
            ctx.strokeText(subLabel, sx, sy + fontSize * 0.95);
            ctx.fillStyle = 'rgba(226, 232, 240, 0.95)';
            ctx.fillText(subLabel, sx, sy + fontSize * 0.95);
          }
        }

        // 6c. Internal State Labels when in States mode for selectedCountry
        if (currentTool === 'states' && selectedCountry) {
          const activeStates = statesRef.current.filter(
            (st) => st.countryId === selectedCountry.id && st.territoryCells > 0
          );
          const stateBoxes: { x1: number; y1: number; x2: number; y2: number }[] = [];

          for (const st of activeStates) {
            const sx = pan.x + (offsetX + (st.centerX / GRID_WIDTH) * baseW) * scale;
            const sy = pan.y + (offsetY + (st.centerY / GRID_HEIGHT) * baseH) * scale;
            if (sx < -60 || sx > vw + 60 || sy < -30 || sy > vh + 30) continue;

            const isChosen = selectedState?.id === st.id;
            const stFont = Math.min(13, Math.max(9.5, 8.5 + scale * 1.1));
            ctx.font = `${isChosen ? '700' : '600'} ${stFont}px "Plus Jakarta Sans", sans-serif`;
            const tw = ctx.measureText(st.name).width + 8;
            const b = { x1: sx - tw / 2, y1: sy - stFont / 2, x2: sx + tw / 2, y2: sy + stFont / 2 };

            let hit = false;
            if (!isChosen) {
              for (const sb of stateBoxes) {
                if (b.x1 < sb.x2 && b.x2 > sb.x1 && b.y1 < sb.y2 && b.y2 > sb.y1) {
                  hit = true;
                  break;
                }
              }
            }
            if (hit) continue;
            stateBoxes.push(b);

            ctx.lineWidth = 2.8;
            ctx.strokeStyle = 'rgba(2, 6, 23, 0.95)';
            ctx.strokeText(st.name, sx, sy);
            ctx.fillStyle = isChosen ? '#fde047' : '#ffffff';
            ctx.fillText(st.name, sx, sy);
          }
        }

        // 6d. National Capitals (when moved or zoomed) & Custom Cities
        for (const c of countriesRef.current) {
          if (c.capitalX !== undefined && c.capitalY !== undefined && c.territoryCells > 0) {
            const moved = Math.hypot(c.capitalX - c.centerX, c.capitalY - c.centerY) > 4;
            if (moved || (currentTool === 'states' && selectedCountry?.id === c.id)) {
              const cx = pan.x + (offsetX + (c.capitalX / GRID_WIDTH) * baseW) * scale;
              const cy = pan.y + (offsetY + (c.capitalY / GRID_HEIGHT) * baseH) * scale;
              ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
              ctx.lineWidth = 3;
              ctx.strokeStyle = 'rgba(2, 6, 23, 0.95)';
              ctx.strokeText(`★ ${c.capital}`, cx, cy);
              ctx.fillStyle = '#fbbf24';
              ctx.fillText(`★ ${c.capital}`, cx, cy);
            }
          }
        }

        for (const ct of citiesRef.current) {
          const cx = pan.x + (offsetX + (ct.x / GRID_WIDTH) * baseW) * scale;
          const cy = pan.y + (offsetY + (ct.y / GRID_HEIGHT) * baseH) * scale;
          if (cx < -60 || cx > vw + 60 || cy < -30 || cy > vh + 30) continue;

          const marker = ct.isStateCapital ? '◆' : '●';
          ctx.font = '600 10.5px "Plus Jakarta Sans", sans-serif';
          ctx.lineWidth = 2.6;
          ctx.strokeStyle = 'rgba(2, 6, 23, 0.95)';
          ctx.strokeText(`${marker} ${ct.name}`, cx, cy);
          ctx.fillStyle = ct.isStateCapital ? '#38bdf8' : '#e2e8f0';
          ctx.fillText(`${marker} ${ct.name}`, cx, cy);
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    engine,
    scale,
    pan,
    isCutting,
    currentTool,
    brushRadius,
    brushAction,
    isEyedropperActive,
    selectedCountry,
    selectedState,
    stateInteractionMode,
    dayNightAngle,
    showDayNight,
    showLabels,
    getBaseMapRect,
  ]);

  useEffect(() => {
    const updateSize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      viewSizeRef.current = { width: w, height: h, dpr };
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', updateSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  const interpolateStroke = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    step: number = 2
  ): { x: number; y: number }[] => {
    const points: { x: number; y: number }[] = [];
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const steps = Math.max(1, Math.ceil(dist / step));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push({
        x: Math.round(p1.x + (p2.x - p1.x) * t),
        y: Math.round(p1.y + (p2.y - p1.y) * t),
      });
    }
    return points;
  };

  const playThrottledSound = (fn: () => void) => {
    const now = performance.now();
    if (now - lastSoundTimeRef.current > 90) {
      lastSoundTimeRef.current = now;
      fn();
    }
  };

  const applyPaintStroke = (points: { x: number; y: number }[]) => {
    if (currentTool === 'states') {
      if (stateInteractionMode === 'paint_state' && selectedCountry && selectedState) {
        playThrottledSound(() => sound.playPencil());
        engine.paintStateStroke(
          points,
          brushRadius,
          selectedCountry.numericId,
          selectedState.numericId,
          countriesRef.current,
          empiresRef.current,
          statesRef.current
        );
      }
      return;
    }

    if (currentTool === 'pencil') {
      const targetNumId =
        brushAction === 'erase' ? 0 : selectedCountry?.numericId ?? 0;
      if (brushAction === 'paint' && !selectedCountry) return;
      playThrottledSound(() => sound.playPencil());
      engine.paintTerritoryStroke(
        points,
        brushRadius,
        targetNumId,
        brushStyle,
        paintOverWater,
        countriesRef.current,
        empiresRef.current,
        statesRef.current
      );
    } else if (currentTool === 'land') {
      playThrottledSound(() => sound.playLand());
      engine.sculptLandStroke(
        points,
        brushRadius,
        countriesRef.current,
        empiresRef.current,
        statesRef.current
      );
    } else if (
      currentTool === 'water_shallow' ||
      currentTool === 'water_deep' ||
      currentTool === 'river'
    ) {
      playThrottledSound(() => sound.playSplash());
      const type =
        currentTool === 'water_shallow'
          ? 'shallow'
          : currentTool === 'river'
          ? 'river'
          : 'deep';
      engine.sculptWaterStroke(
        points,
        brushRadius,
        type,
        countriesRef.current,
        empiresRef.current,
        statesRef.current
      );
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const gridPos = clientToGrid(e.clientX, e.clientY);

    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    didPanDragRef.current = false;

    // Eyedropper Mode (for Pencil or States)
    if (isEyedropperActive && gridPos) {
      const idx = engine.getIndex(gridPos.x, gridPos.y);
      const ownerId = engine.owner[idx];
      if (ownerId > 0) {
        const found = numIdMapRef.current.get(ownerId);
        if (found) {
          sound.playClick();
          onEyedropperPick(found);
          return;
        }
      }
    }

    // Middle click, Right click, Alt+drag, or Select mode pans the camera
    if (e.button === 1 || e.button === 2 || e.altKey || currentTool === 'select') {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (!gridPos) return;

    if (currentTool === 'states') {
      if (stateInteractionMode === 'move_capital') {
        onMoveCapital(gridPos.x, gridPos.y);
        return;
      }
      if (stateInteractionMode === 'add_city') {
        onPlaceCity(gridPos.x, gridPos.y);
        return;
      }
      if (stateInteractionMode === 'place_new_state') {
        onCarveNewState(gridPos.x, gridPos.y);
        return;
      }
      if (stateInteractionMode === 'paint_state') {
        isPaintingRef.current = true;
        lastPaintPointRef.current = gridPos;
        applyPaintStroke([gridPos]);
        return;
      }
    }

    if (currentTool === 'scissors') {
      sound.playScissors();
      setIsCutting(true);
      scissorsPathRef.current = [gridPos];
    } else if (
      currentTool === 'pencil' ||
      currentTool === 'land' ||
      currentTool === 'water_shallow' ||
      currentTool === 'water_deep' ||
      currentTool === 'river'
    ) {
      isPaintingRef.current = true;
      lastPaintPointRef.current = gridPos;
      applyPaintStroke([gridPos]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const gridPos = clientToGrid(e.clientX, e.clientY);
    cursorGridRef.current = gridPos;

    if (isPanningRef.current) {
      if (pointerDownPosRef.current) {
        const d = Math.hypot(
          e.clientX - pointerDownPosRef.current.x,
          e.clientY - pointerDownPosRef.current.y
        );
        if (d > 5) didPanDragRef.current = true;
      }
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    if (gridPos && !isCutting && !isPaintingRef.current) {
      const idx = engine.getIndex(gridPos.x, gridPos.y);
      const t = engine.terrain[idx];
      const o = engine.owner[idx];
      const s = engine.stateOwner[idx];
      const country = o > 0 ? numIdMapRef.current.get(o) || null : null;
      const empire = country?.empireId ? empireMapRef.current.get(country.empireId) || null : null;
      const state =
        s > 0 && engine.activeStateViewCountryNumId === o
          ? stateNumIdMapRef.current.get(s) || null
          : null;

      let terrainLabel = 'Oceano Profundo';
      if (t === TERRAIN_SHALLOW_WATER) terrainLabel = 'Águas Costeiras';
      else if (t === TERRAIN_RIVER) terrainLabel = 'Rio / Canal';
      else if (t === TERRAIN_LAND && !country) terrainLabel = 'Terra Neutra (Sem País)';

      setHoverInfo({
        x: gridPos.localX,
        y: gridPos.localY,
        country,
        empire,
        state,
        terrainLabel,
      });
    } else if (!gridPos) {
      setHoverInfo(null);
    }

    if (isCutting && gridPos) {
      const path = scissorsPathRef.current;
      const last = path[path.length - 1];
      if (!last || Math.hypot(gridPos.x - last.x, gridPos.y - last.y) >= 3) {
        path.push(gridPos);
        if (path.length % 10 === 0) playThrottledSound(() => sound.playScissors());
      }
    } else if (isPaintingRef.current && gridPos && lastPaintPointRef.current) {
      const step = currentTool === 'river' ? 1 : 2;
      const points = interpolateStroke(lastPaintPointRef.current, gridPos, step);
      lastPaintPointRef.current = gridPos;
      applyPaintStroke(points);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (isPanningRef.current) {
      isPanningRef.current = false;
      if (!didPanDragRef.current && currentTool === 'select') {
        const gridPos = clientToGrid(e.clientX, e.clientY);
        if (gridPos) {
          const idx = engine.getIndex(gridPos.x, gridPos.y);
          const ownerId = engine.owner[idx];
          if (ownerId > 0) {
            const found = numIdMapRef.current.get(ownerId);
            if (found) {
              sound.playClick();
              onSelectCountry(found);
            }
          } else {
            onSelectCountry(null);
          }
        }
      }
      return;
    }

    if (isCutting) {
      setIsCutting(false);
      const path = scissorsPathRef.current;
      scissorsPathRef.current = [];
      if (path.length >= 4) {
        sound.playScissors();
        const maxNumericId = countriesRef.current.reduce(
          (max, c) => Math.max(max, c.numericId),
          0
        );
        const cutResult = engine.cutWithFreehandPath(
          path,
          maxNumericId + 1,
          countriesRef.current,
          empiresRef.current,
          statesRef.current
        );
        if (cutResult && cutResult.cellCount >= 8) {
          onCutFinished(cutResult);
          onTerritoryUpdated();
        }
      }
    }

    if (isPaintingRef.current) {
      isPaintingRef.current = false;
      lastPaintPointRef.current = null;
      if (currentTool === 'states') {
        onStateUpdated();
      } else {
        onTerritoryUpdated();
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.18 : 0.85;
    const newScale = Math.max(0.8, Math.min(10.0, scale * zoomFactor));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newPanX = mouseX - (mouseX - pan.x) * (newScale / scale);
    const newPanY = mouseY - (mouseY - pan.y) * (newScale / scale);

    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleResetCamera = () => {
    sound.playClick();
    setScale(1.0);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      className="relative w-full h-full overflow-hidden bg-[#071122]"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          cursorGridRef.current = null;
          setHoverInfo(null);
        }}
        onWheel={handleWheel}
        className={`w-full h-full block touch-none select-none ${
          isEyedropperActive ||
          currentTool === 'scissors' ||
          (currentTool === 'states' && stateInteractionMode !== 'paint_state')
            ? 'cursor-crosshair'
            : currentTool === 'pencil' ||
              currentTool === 'land' ||
              currentTool === 'river' ||
              currentTool.startsWith('water') ||
              (currentTool === 'states' && stateInteractionMode === 'paint_state')
            ? 'cursor-none'
            : 'cursor-grab active:cursor-grabbing'
        }`}
      />

      {/* Instant Hover Country / State Tooltip */}
      {hoverInfo && (
        <div
          className="pointer-events-none fixed z-30 bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-lg px-3 py-2 shadow-xl flex items-center gap-2.5 text-xs transition-opacity duration-75"
          style={{
            left: Math.min(window.innerWidth - 220, hoverInfo.x + 18),
            top: Math.max(66, hoverInfo.y + 42),
          }}
        >
          {hoverInfo.country ? (
            <>
              <FlagView
                flag={hoverInfo.empire ? hoverInfo.empire.flag : hoverInfo.country.flag}
                width={28}
                height={19}
              />
              <div>
                <div className="font-bold text-white leading-tight">
                  {hoverInfo.state
                    ? `${hoverInfo.state.name} (${hoverInfo.country.name})`
                    : hoverInfo.empire
                    ? hoverInfo.empire.name
                    : hoverInfo.country.name}
                </div>
                <div className="text-[11px] text-slate-400">
                  {hoverInfo.state
                    ? `Capital Estadual: ${hoverInfo.state.capitalCity}`
                    : hoverInfo.empire
                    ? `Província: ${hoverInfo.country.name}`
                    : `${hoverInfo.country.capital} · ${hoverInfo.country.continent}`}
                </div>
              </div>
            </>
          ) : (
            <span className="text-slate-300 font-medium">{hoverInfo.terrainLabel}</span>
          )}
        </div>
      )}

      {/* Camera Zoom Controls */}
      <div className="absolute bottom-5 left-5 flex items-center gap-1 p-1 bg-slate-900/90 backdrop-blur-md rounded-lg border border-slate-700/80 shadow-xl z-20 text-xs">
        <button
          onClick={() => {
            sound.playClick();
            setScale((s) => Math.min(10.0, s * 1.25));
          }}
          className="w-8 h-8 flex items-center justify-center font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Aproximar Zoom"
        >
          +
        </button>
        <span className="px-2 font-mono-numbers text-slate-300 text-[11px] min-w-12 text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => {
            sound.playClick();
            setScale((s) => Math.max(0.8, s * 0.8));
          }}
          className="w-8 h-8 flex items-center justify-center font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Afastar Zoom"
        >
          -
        </button>
        <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />
        <button
          onClick={handleResetCamera}
          className="px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
        >
          Centralizar
        </button>
      </div>
    </div>
  );
};
