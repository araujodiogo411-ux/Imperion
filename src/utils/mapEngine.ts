import { Country, Empire, War, StateTerritory, StateWar } from '../types/game';
import { WORLD_GEOJSON, STATE_PALETTE } from '../data/worldCountries';
import {
  REAL_COUNTRY_STATES,
  GeoStateSeed,
  ADMIN1_STATES,
  ADMIN1_KEY_ALIASES,
  resolveStateMetadata,
} from '../data/worldStates';
import { geoNaturalEarth1, geoPath, GeoProjection } from 'd3-geo';
import type { Feature, Polygon, MultiPolygon } from 'geojson';

export const GRID_WIDTH = 1600;
export const GRID_HEIGHT = 800;

export const TERRAIN_DEEP_WATER = 0;
export const TERRAIN_SHALLOW_WATER = 1;
export const TERRAIN_RIVER = 2;
export const TERRAIN_LAND = 3;

export interface CutResult {
  newNumericId: number;
  cellCount: number;
  sourceCountryNames: string[];
  centroid: { x: number; y: number };
}

export interface SoldierDot {
  x: number;
  y: number;
  warId: string;
  side: 'attacker' | 'defender';
  ownerNumericId: number;
  color: string;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export interface NightLight {
  x: number;
  y: number;
  brightness: number; // 0.35 .. 1.0
}

export class WorldMapEngine {
  public terrain: Uint8Array;
  public owner: Uint16Array;
  public stateOwner: Uint16Array;
  public width: number;
  public height: number;
  public soldiers: SoldierDot[] = [];
  public nightLights: NightLight[] = [];
  public isInitialized: boolean = false;
  private warTickCounter: number = 0;
  private projection: GeoProjection | null = null;

  // Cached per-country bounding boxes updated during recalculateTerritoryCounts
  private countryMinX = new Int16Array(65536);
  private countryMaxX = new Int16Array(65536);
  private countryMinY = new Int16Array(65536);
  private countryMaxY = new Int16Array(65536);

  // Offscreen GPU-ready cached map bitmap (updated only on dirty regions!)
  public bufferCanvas: HTMLCanvasElement;
  public bufferCtx: CanvasRenderingContext2D;
  public bufferImageData: ImageData;

  private colorRgbCache = new Map<string, [number, number, number]>();

  // Optional: currently inspected country ID in States mode (draws internal state borders & colors)
  public activeStateViewCountryNumId: number | null = null;
  private stateColorCache = new Map<number, [number, number, number]>();

  constructor() {
    this.width = GRID_WIDTH;
    this.height = GRID_HEIGHT;
    this.terrain = new Uint8Array(this.width * this.height);
    this.owner = new Uint16Array(this.width * this.height);
    this.stateOwner = new Uint16Array(this.width * this.height);

    this.bufferCanvas = document.createElement('canvas');
    this.bufferCanvas.width = this.width;
    this.bufferCanvas.height = this.height;
    const ctx = this.bufferCanvas.getContext('2d');
    if (!ctx) throw new Error('Could not create 2D buffer context');
    this.bufferCtx = ctx;
    this.bufferImageData = this.bufferCtx.createImageData(this.width, this.height);
  }

  public getIndex(x: number, y: number): number {
    return y * this.width + x;
  }

  private parseHexColor(hex: string): [number, number, number] {
    const cached = this.colorRgbCache.get(hex);
    if (cached) return cached;
    let r = 80,
      g = 140,
      b = 100;
    if (hex.startsWith('#') && hex.length === 7) {
      const parsed = parseInt(hex.slice(1), 16);
      r = (parsed >> 16) & 255;
      g = (parsed >> 8) & 255;
      b = parsed & 255;
    }
    const rgb: [number, number, number] = [r, g, b];
    this.colorRgbCache.set(hex, rgb);
    return rgb;
  }

  /**
   * Computes the centroid of the largest polygon ring of a country feature
   * (so France labels over Metropolitan France in Europe, USA over mainland 48 states, etc.)
   */
  private getMainlandCentroid(
    feature: Feature,
    pathGen: ReturnType<typeof geoPath>
  ): [number, number] {
    const geom = feature.geometry;
    if (geom.type === 'MultiPolygon') {
      let bestPoly: number[][][] | null = null;
      let bestArea = -1;
      for (const polyCoords of (geom as MultiPolygon).coordinates) {
        const singleFeature: Feature<Polygon> = {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: polyCoords },
        };
        const area = pathGen.area(singleFeature);
        if (area > bestArea) {
          bestArea = area;
          bestPoly = polyCoords;
        }
      }
      if (bestPoly) {
        const c = pathGen.centroid({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: bestPoly },
        });
        if (!Number.isNaN(c[0]) && !Number.isNaN(c[1])) return [c[0], c[1]];
      }
    }
    const c = pathGen.centroid(feature);
    if (!Number.isNaN(c[0]) && !Number.isNaN(c[1])) return [c[0], c[1]];
    return [this.width / 2, this.height / 2];
  }

  /**
   * Initializes the entire world directly from real-world GeoJSON polygons!
   */
  public initializeFromGeoJSON(
    countries: Country[],
    empires: Empire[],
    states: StateTerritory[] = []
  ) {
    this.terrain.fill(TERRAIN_DEEP_WATER);
    this.owner.fill(0);
    this.stateOwner.fill(0);

    const projection = geoNaturalEarth1().fitExtent(
      [
        [18, 14],
        [this.width - 18, this.height - 14],
      ],
      WORLD_GEOJSON
    );
    this.projection = projection;
    const pathGen = geoPath(projection);

    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = this.width;
    tmpCanvas.height = this.height;
    const tmpCtx = tmpCanvas.getContext('2d', { willReadFrequently: true });
    if (!tmpCtx) return;

    tmpCtx.fillStyle = '#000000';
    tmpCtx.fillRect(0, 0, this.width, this.height);

    const colorKeyToId = new Map<number, number>();
    const idToColorStr = new Map<number, string>();

    WORLD_GEOJSON.features.forEach((feature, idx) => {
      const numericId = idx + 1;
      const r = ((numericId * 73 + 41) % 210) + 35;
      const g = ((numericId * 137 + 83) % 210) + 35;
      const b = ((numericId * 193 + 19) % 210) + 35;
      const key = (r << 16) | (g << 8) | b;
      colorKeyToId.set(key, numericId);
      idToColorStr.set(numericId, `rgb(${r},${g},${b})`);

      const country = countries.find((c) => c.numericId === numericId);
      if (country) {
        const [cx, cy] = this.getMainlandCentroid(feature, pathGen);
        country.centerX = Math.round(cx);
        country.centerY = Math.round(cy);
        country.capitalX = country.centerX;
        country.capitalY = country.centerY;
        country.normX = cx / this.width;
        country.normY = cy / this.height;
      }
    });

    const drawPath = geoPath(projection, tmpCtx);
    WORLD_GEOJSON.features.forEach((feature, idx) => {
      const numericId = idx + 1;
      tmpCtx.beginPath();
      drawPath(feature);
      tmpCtx.fillStyle = idToColorStr.get(numericId) || '#ffffff';
      tmpCtx.fill();
    });

    const raw = tmpCtx.getImageData(0, 0, this.width, this.height).data;
    const total = this.width * this.height;

    const edgePixels: number[] = [];
    for (let i = 0; i < total; i++) {
      const p = i * 4;
      const r = raw[p];
      const g = raw[p + 1];
      const b = raw[p + 2];
      if (r === 0 && g === 0 && b === 0) continue;

      const key = (r << 16) | (g << 8) | b;
      const exactId = colorKeyToId.get(key);
      if (exactId !== undefined) {
        this.terrain[i] = TERRAIN_LAND;
        this.owner[i] = exactId;
      } else if (r + g + b > 75) {
        this.terrain[i] = TERRAIN_LAND;
        edgePixels.push(i);
      }
    }

    for (const i of edgePixels) {
      const x = i % this.width;
      const y = (i - x) / this.width;
      let resolved = 0;
      for (let dy = -1; dy <= 1 && !resolved; dy++) {
        for (let dx = -1; dx <= 1 && !resolved; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
            const nOwner = this.owner[ny * this.width + nx];
            if (nOwner > 0) resolved = nOwner;
          }
        }
      }
      if (resolved > 0) {
        this.owner[i] = resolved;
      } else {
        this.terrain[i] = TERRAIN_DEEP_WATER;
      }
    }

    this.generateShallowCoasts();
    this.generateNightLights(countries);
    this.recalculateTerritoryCounts(countries);
    this.refreshFullBuffer(countries, empires, states);
    this.isInitialized = true;
  }

  /**
   * Generates geographically accurate night lights:
   * - High density in Europe, East/South Asia (China, Japan, South Korea, India), Americas
   * - Brazil: intense in Southeast/South/Northeast, lighter in Center-West & North capitals
   * - North Korea: strictly ONE single point of light in Pyongyang
   * - Africa: sparse overall, concentrated in Morocco, Egypt, Ethiopia, South Africa, Somalia, Congo/DR Congo
   */
  private generateNightLights(countries: Country[]) {
    this.nightLights = [];
    const w = this.width;
    const h = this.height;
    const proj = this.projection;

    const northKorea = countries.find((c) => c.originalName === 'North Korea');
    const nkNumId = northKorea?.numericId ?? -1;

    const pushLightIfLand = (x: number, y: number, brightness: number) => {
      const rx = Math.round(x);
      const ry = Math.round(y);
      if (rx < 0 || rx >= w || ry < 0 || ry >= h) return;
      const idx = ry * w + rx;
      if (this.terrain[idx] !== TERRAIN_LAND) return;
      if (this.owner[idx] === nkNumId) return; // Keep North Korea strictly 1 single light!
      this.nightLights.push({
        x: rx,
        y: ry,
        brightness: Math.max(0.35, Math.min(1.0, brightness)),
      });
    };

    const addGeoCluster = (
      lon: number,
      lat: number,
      count: number,
      spreadPx: number,
      baseBright: number = 0.92
    ) => {
      if (!proj) return;
      const pt = proj([lon, lat]);
      if (!pt) return;
      const [cx, cy] = pt;
      pushLightIfLand(cx, cy, baseBright);
      for (let k = 1; k < count; k++) {
        const angle = k * 2.39996 + lon * 0.3 + lat * 0.7;
        const r = Math.sqrt(k / count) * spreadPx;
        const lx = cx + Math.cos(angle) * r;
        const ly = cy + Math.sin(angle) * r * 0.8;
        const b = baseBright * (0.45 + 0.55 * (1 - k / count));
        pushLightIfLand(lx, ly, b);
      }
    };

    // 1. North Korea: strictly ONE bright point of light (Pyongyang)
    if (northKorea && proj) {
      const py = proj([125.75, 39.03]);
      if (py) {
        this.nightLights.push({
          x: Math.round(py[0]),
          y: Math.round(py[1]),
          brightness: 0.95,
        });
      }
    }

    // 2. Major Global Urban Light Hubs [lon, lat, count, spreadPx, brightness]
    const hubs: [number, number, number, number, number][] = [
      // === EUROPA (Muito iluminada) ===
      [-0.12, 51.5, 22, 16, 1.0],   // Londres
      [-2.2, 53.48, 16, 14, 0.92],  // Manchester / Liverpool / Leeds
      [-3.2, 55.9, 8, 8, 0.85],     // Edimburgo / Glasgow
      [-6.26, 53.35, 7, 7, 0.85],   // Dublin
      [2.35, 48.85, 24, 17, 1.0],   // Paris
      [4.83, 45.76, 11, 11, 0.88],  // Lyon
      [5.37, 43.3, 10, 10, 0.88],   // Marselha / Riviera
      [-0.58, 44.84, 7, 8, 0.82],   // Bordéus / Toulouse
      [4.35, 50.85, 18, 12, 0.98],  // Bruxelas / Antuérpia
      [4.9, 52.37, 18, 12, 0.98],   // Amsterdã / Roterdã
      [7.0, 51.45, 22, 14, 0.98],   // Vale do Ruhr / Colônia / Frankfurt
      [13.4, 52.52, 18, 14, 0.95],  // Berlim
      [10.0, 53.55, 12, 10, 0.9],   // Hamburgo
      [11.58, 48.13, 14, 12, 0.92], // Munique / Stuttgart
      [9.19, 45.46, 20, 14, 0.98],  // Milão / Turim / Vale do Pó
      [12.49, 41.9, 14, 11, 0.95],  // Roma
      [14.26, 40.85, 11, 9, 0.9],   // Nápoles
      [-3.7, 40.42, 16, 13, 0.95],  // Madri
      [2.17, 41.38, 14, 11, 0.95],  // Barcelona / Valência
      [-5.98, 37.39, 9, 9, 0.85],   // Sevilha / Málaga
      [-9.14, 38.72, 11, 9, 0.9],   // Lisboa
      [-8.63, 41.15, 8, 7, 0.86],   // Porto
      [8.54, 47.37, 10, 9, 0.88],   // Zurique / Genebra
      [16.37, 48.2, 11, 10, 0.9],   // Viena
      [14.43, 50.07, 10, 10, 0.88], // Praga
      [19.04, 47.5, 10, 10, 0.88],  // Budapeste
      [21.01, 52.23, 14, 13, 0.92], // Varsóvia / Cracóvia
      [26.1, 44.42, 10, 10, 0.86],  // Bucareste
      [23.72, 37.98, 9, 9, 0.88],   // Atenas
      [12.56, 55.67, 9, 8, 0.88],   // Copenhague
      [18.06, 59.33, 9, 9, 0.86],   // Estocolmo
      [10.75, 59.91, 6, 7, 0.82],   // Oslo
      [24.94, 60.17, 6, 7, 0.82],   // Helsinque
      [30.52, 50.45, 12, 12, 0.88], // Kiev
      [36.23, 49.99, 8, 9, 0.82],   // Kharkiv / Odessa
      [37.62, 55.75, 24, 20, 0.98], // Moscou
      [30.33, 59.93, 13, 12, 0.9],  // São Petersburgo
      [44.0, 56.3, 10, 12, 0.82],   // Nizhny / Kazan
      [39.7, 47.2, 9, 10, 0.82],    // Rostov / Krasnodar

      // === ÁSIA: COREIA DO SUL, CHINA, JAPÃO E ÍNDIA (Um monte de luzes!) ===
      // Coreia do Sul
      [126.98, 37.56, 22, 11, 1.0], // Seul / Incheon / Gyeonggi
      [127.4, 36.35, 10, 7, 0.92],  // Daejeon / Chungcheong
      [129.07, 35.18, 16, 9, 0.98], // Busan / Daegu / Ulsan
      [126.85, 35.16, 8, 6, 0.88],  // Gwangju
      // Japão
      [139.7, 35.68, 28, 14, 1.0],  // Tóquio / Yokohama / Kanto
      [136.9, 35.18, 16, 10, 0.95], // Nagoya / Chubu
      [135.5, 34.69, 22, 12, 1.0],  // Osaka / Kyoto / Kobe
      [132.45, 34.38, 10, 8, 0.9],  // Hiroshima / Okayama
      [130.4, 33.59, 14, 9, 0.94],  // Fukuoka / Kyushu
      [140.87, 38.26, 9, 8, 0.86],  // Sendai
      [141.35, 43.06, 8, 8, 0.85],  // Sapporo
      // China
      [116.4, 39.9, 28, 18, 1.0],   // Pequim / Tianjin / Hebei
      [123.43, 41.8, 16, 14, 0.92], // Shenyang / Dalian
      [126.53, 45.8, 10, 11, 0.85], // Harbin / Changchun
      [117.12, 36.65, 18, 14, 0.94],// Shandong (Jinan / Qingdao)
      [121.47, 31.23, 30, 17, 1.0], // Xangai / Suzhou / Hangzhou / Nanquim
      [113.62, 34.74, 18, 14, 0.92],// Zhengzhou / Henan
      [114.3, 30.59, 20, 15, 0.94], // Wuhan / Changsha
      [108.94, 34.26, 12, 11, 0.88],// Xi'an
      [104.06, 30.65, 18, 14, 0.94],// Chengdu / Chongqing
      [113.26, 23.13, 28, 16, 1.0], // Guangzhou / Shenzhen / Hong Kong
      [119.3, 26.07, 14, 11, 0.92], // Fuzhou / Xiamen
      [102.83, 24.88, 9, 9, 0.82],  // Kunming / Nanning
      [121.56, 25.03, 14, 8, 0.98], // Taiwan (Taipé / Kaohsiung)
      // Índia
      [77.21, 28.61, 28, 17, 1.0],  // Nova Délhi / NCR / Haryana
      [80.94, 26.85, 22, 15, 0.95], // Lucknow / Kanpur / Planície do Ganges
      [85.13, 25.59, 14, 12, 0.88], // Patna / Bihar
      [88.36, 22.57, 20, 13, 0.96], // Calcutá / Bengala
      [72.88, 19.07, 24, 14, 1.0],  // Mumbai / Pune
      [72.57, 23.02, 16, 12, 0.92], // Ahmedabad / Gujarat
      [75.78, 26.91, 12, 11, 0.88], // Jaipur / Rajasthan
      [78.48, 17.38, 16, 12, 0.94], // Hyderabad
      [77.59, 12.97, 18, 13, 0.96], // Bangalore
      [80.27, 13.08, 16, 12, 0.94], // Chennai / Tamil Nadu
      [76.26, 9.93, 11, 8, 0.9],    // Kerala
      // Resto da Ásia & Oriente Médio
      [100.5, 13.75, 14, 11, 0.92], // Bangkok
      [106.84, -6.2, 18, 14, 0.95], // Jacarta / Java
      [120.98, 14.59, 13, 9, 0.92], // Manila
      [106.63, 10.82, 10, 9, 0.88], // Ho Chi Minh / Hanói
      [101.68, 3.14, 11, 9, 0.92],  // Kuala Lumpur / Singapura
      [90.41, 23.81, 12, 9, 0.88],  // Daca
      [74.35, 31.52, 12, 11, 0.88], // Lahore / Islamabad
      [67.0, 24.86, 10, 9, 0.88],   // Carachi
      [28.97, 41.0, 16, 12, 0.96],  // Istambul / Mármara
      [32.85, 39.93, 10, 10, 0.88], // Ancara / Esmirna
      [51.39, 35.68, 14, 12, 0.92], // Teerã
      [46.67, 24.71, 12, 11, 0.9],  // Riad
      [55.27, 25.2, 14, 10, 0.98],  // Dubai / Abu Dhabi / Doha
      [34.78, 32.08, 10, 7, 0.94],  // Tel Aviv / Jerusalém

      // === AMÉRICA DO NORTE & CENTRAL ===
      [-74.0, 40.71, 30, 18, 1.0],  // Nova York / Filadélfia / Boston
      [-77.03, 38.9, 18, 14, 0.96], // Washington / Baltimore / Virgínia
      [-87.62, 41.88, 26, 18, 1.0], // Chicago / Detroit / Grandes Lagos
      [-84.39, 33.75, 18, 15, 0.94],// Atlanta / Carolinas
      [-80.19, 25.76, 16, 13, 0.96],// Miami / Orlando / Tampa
      [-96.8, 32.78, 22, 17, 0.96], // Dallas / Houston / Austin
      [-118.24, 34.05, 24, 15, 1.0],// Los Angeles / San Diego
      [-122.41, 37.77, 16, 12, 0.96],// San Francisco / Vale do Silício
      [-122.33, 47.6, 12, 11, 0.9], // Seattle / Portland
      [-104.99, 39.74, 10, 10, 0.88],// Denver
      [-112.07, 33.44, 11, 10, 0.9],// Phoenix
      [-79.38, 43.65, 16, 13, 0.95],// Toronto / Ottawa / Montreal
      [-114.07, 51.04, 8, 9, 0.86], // Calgary / Edmonton
      [-123.12, 49.28, 8, 8, 0.88], // Vancouver
      [-99.13, 19.43, 22, 14, 0.98],// Cidade do México / Puebla
      [-103.35, 20.66, 11, 10, 0.9],// Guadalajara
      [-100.31, 25.68, 12, 10, 0.92],// Monterrey
      [-90.51, 14.63, 7, 7, 0.85],  // Guatemala / San Salvador
      [-84.09, 9.93, 6, 6, 0.84],   // San José
      [-79.52, 8.98, 7, 7, 0.86],   // Cidade do Panamá
      [-82.36, 23.11, 8, 8, 0.84],  // Havana
      [-69.93, 18.48, 8, 7, 0.86],  // Santo Domingo / San Juan

      // === AMÉRICA DO SUL: BRASIL (Foco forte no Sudeste, Sul, Nordeste; menos no Centro-Oeste e Norte!) ===
      // Sudeste (Muita luz!)
      [-46.63, -23.55, 24, 14, 1.0],// São Paulo / ABC / Campinas / Santos
      [-48.0, -21.8, 12, 10, 0.9],  // Interior Paulista (Ribeirão Preto / Bauru)
      [-43.17, -22.9, 18, 11, 0.98],// Rio de Janeiro / Niterói
      [-43.93, -19.91, 15, 12, 0.94],// Belo Horizonte / Minas Gerais
      [-40.31, -20.31, 8, 7, 0.88], // Vitória / Espírito Santo
      // Sul (Muita luz!)
      [-49.27, -25.43, 14, 11, 0.94],// Curitiba / Paraná
      [-48.55, -27.59, 11, 9, 0.9], // Florianópolis / Joinville / SC
      [-51.21, -30.03, 14, 12, 0.94],// Porto Alegre / Serra Gaúcha
      // Nordeste (Bastante luz!)
      [-38.5, -12.97, 13, 10, 0.92],// Salvador / Recôncavo
      [-34.88, -8.05, 12, 9, 0.92], // Recife / João Pessoa / Maceió
      [-35.2, -5.79, 8, 7, 0.86],   // Natal
      [-38.52, -3.73, 11, 9, 0.9],  // Fortaleza
      [-42.8, -5.09, 5, 6, 0.8],    // Teresina
      [-44.3, -2.53, 6, 6, 0.82],   // São Luís
      // Centro-Oeste (Menos luz - focos pontuais)
      [-47.93, -15.79, 5, 5, 0.88], // Brasília
      [-49.26, -16.68, 4, 5, 0.82], // Goiânia
      [-54.62, -20.46, 3, 4, 0.76], // Campo Grande
      [-56.09, -15.6, 3, 4, 0.76],  // Cuiabá
      // Norte (Menos luz - focos nas capitais/rios)
      [-48.5, -1.45, 5, 5, 0.84],   // Belém
      [-60.02, -3.11, 5, 5, 0.86],  // Manaus
      [-48.33, -10.24, 2, 3, 0.72], // Palmas
      [-63.9, -8.76, 2, 3, 0.72],   // Porto Velho
      [-67.81, -9.97, 2, 3, 0.7],   // Rio Branco
      [-51.06, 0.03, 2, 3, 0.72],   // Macapá
      [-60.67, 2.82, 2, 3, 0.7],    // Boa Vista
      // Resto da América do Sul
      [-58.38, -34.6, 22, 14, 1.0], // Buenos Aires / La Plata
      [-64.18, -31.42, 10, 9, 0.88],// Córdoba / Rosário
      [-56.16, -34.9, 8, 7, 0.88],  // Montevidéu
      [-70.66, -33.45, 13, 10, 0.94],// Santiago / Valparaíso
      [-77.04, -12.04, 12, 10, 0.92],// Lima
      [-74.07, 4.71, 13, 10, 0.92], // Bogotá
      [-75.56, 6.25, 9, 8, 0.88],   // Medellín / Cali
      [-66.9, 10.48, 10, 9, 0.88],  // Caracas / Maracaibo
      [-78.46, -0.18, 7, 7, 0.84],  // Quito / Guayaquil
      [-57.57, -25.26, 6, 6, 0.82], // Assunção
      [-68.15, -16.5, 6, 6, 0.82],  // La Paz / Santa Cruz

      // === ÁFRICA (Destaques pedidos: Egito, Marrocos, Etiópia, África do Sul, Somália e Congos) ===
      // Egito (Vale do Nilo e Delta bem iluminados!)
      [31.23, 30.04, 20, 12, 1.0],  // Cairo / Giza
      [29.92, 31.2, 12, 9, 0.94],   // Alexandria / Delta
      [32.5, 29.96, 8, 7, 0.88],    // Suez / Port Said
      [32.64, 25.68, 7, 8, 0.82],   // Luxor / Vale do Nilo
      // Marrocos
      [-7.59, 33.57, 13, 9, 0.95],  // Casablanca / Rabat
      [-5.81, 35.76, 8, 7, 0.88],   // Tânger / Tetuão
      [-5.0, 34.03, 7, 7, 0.85],    // Fez / Meknès
      [-8.0, 31.63, 7, 7, 0.85],    // Marraquexe / Agadir
      // Etiópia
      [38.74, 9.03, 12, 10, 0.92],  // Adis Abeba
      [41.86, 9.6, 6, 7, 0.82],     // Dire Dawa / Harar
      [37.39, 11.59, 6, 7, 0.82],   // Bahir Dar / Gondar
      [38.48, 7.05, 5, 6, 0.8],     // Hawassa
      // África do Sul
      [28.04, -26.2, 18, 12, 0.98], // Joanesburgo / Pretória
      [18.42, -33.92, 11, 8, 0.94], // Cidade do Cabo
      [31.02, -29.85, 10, 8, 0.9],  // Durban
      [25.6, -33.96, 6, 6, 0.84],   // Port Elizabeth / Bloemfontein
      // Somália
      [45.34, 2.04, 9, 8, 0.88],    // Mogadíscio
      [44.06, 9.56, 6, 7, 0.82],    // Hargeisa
      [49.18, 11.28, 4, 5, 0.78],   // Bosaso / Garowe
      // República do Congo & R. D. do Congo
      [15.28, -4.32, 13, 10, 0.92], // Kinshasa / Brazzaville
      [27.48, -11.66, 9, 9, 0.86],  // Lubumbashi / Katanga
      [25.19, 0.51, 6, 7, 0.8],     // Kisangani
      [29.22, -1.67, 6, 7, 0.82],   // Goma / Bukavu
      [23.6, -6.15, 5, 6, 0.78],    // Mbuji-Mayi / Kananga

      // === OCEANIA ===
      [151.2, -33.86, 14, 10, 0.96],// Sydney
      [144.96, -37.81, 13, 10, 0.95],// Melbourne
      [153.02, -27.47, 9, 8, 0.9],  // Brisbane
      [115.86, -31.95, 7, 7, 0.86], // Perth
      [174.76, -36.84, 8, 7, 0.88], // Auckland / Wellington
    ];

    for (const [lon, lat, count, spread, bright] of hubs) {
      addGeoCluster(lon, lat, count, spread, bright);
    }

    // 3. Single subtle capital points for remaining countries (avoiding Antarctica, Greenland, North Korea, and heavy Africa fill)
    for (const c of countries) {
      if (
        c.originalName === 'Antarctica' ||
        c.originalName === 'Greenland' ||
        c.originalName === 'North Korea' ||
        c.originalName === 'Fr. S. Antarctic Lands'
      ) {
        continue;
      }

      // Add 1-2 gentle capital lights so no sovereign nation is completely invisible
      const isAfrica = c.continent === 'África';
      const isHighlightAfrica =
        c.originalName === 'Morocco' ||
        c.originalName === 'Egypt' ||
        c.originalName === 'Ethiopia' ||
        c.originalName === 'South Africa' ||
        c.originalName === 'Somalia' ||
        c.originalName === 'Dem. Rep. Congo' ||
        c.originalName === 'Congo';

      if (isAfrica && !isHighlightAfrica) {
        pushLightIfLand(c.centerX, c.centerY, 0.55);
      } else {
        pushLightIfLand(c.centerX, c.centerY, 0.85);
      }
    }
  }

  private generateShallowCoasts() {
    const w = this.width;
    const h = this.height;
    const coastMask = new Uint8Array(w * h);

    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        const idx = y * w + x;
        if (this.terrain[idx] === TERRAIN_LAND) {
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              const nidx = (y + dy) * w + (x + dx);
              if (this.terrain[nidx] === TERRAIN_DEEP_WATER) {
                coastMask[nidx] = 1;
              }
            }
          }
        }
      }
    }

    for (let i = 0; i < coastMask.length; i++) {
      if (coastMask[i] === 1) {
        this.terrain[i] = TERRAIN_SHALLOW_WATER;
      }
    }
  }

  public updateStateColorCache(states: StateTerritory[]) {
    this.stateColorCache.clear();
    states.forEach((s) => {
      this.stateColorCache.set(s.numericId, this.parseHexColor(s.color));
    });
  }

  public refreshFullBuffer(
    countries: Country[],
    empires: Empire[],
    states: StateTerritory[] = []
  ) {
    this.updateStateColorCache(states);
    this.refreshRegion(0, 0, this.width - 1, this.height - 1, countries, empires, states);
  }

  public refreshRegion(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    countries: Country[],
    empires: Empire[],
    states: StateTerritory[] = []
  ) {
    const x0 = Math.max(0, Math.floor(minX) - 2);
    const y0 = Math.max(0, Math.floor(minY) - 2);
    const x1 = Math.min(this.width - 1, Math.ceil(maxX) + 2);
    const y1 = Math.min(this.height - 1, Math.ceil(maxY) + 2);
    if (x1 < x0 || y1 < y0) return;

    const numIdToColor = new Map<number, [number, number, number]>();
    const empireMap = new Map<string, Empire>();
    empires.forEach((e) => empireMap.set(e.id, e));
    countries.forEach((c) => {
      const emp = c.empireId ? empireMap.get(c.empireId) : null;
      const hex = emp ? emp.color : c.color;
      numIdToColor.set(c.numericId, this.parseHexColor(hex));
    });

    if (states.length > 0 && this.stateColorCache.size !== states.length) {
      this.updateStateColorCache(states);
    }

    const activeStateCountryNumId = this.activeStateViewCountryNumId;
    const data = this.bufferImageData.data;
    const w = this.width;
    const h = this.height;

    for (let y = y0; y <= y1; y++) {
      const latShade = Math.sin((y / h) * Math.PI) * 10;
      for (let x = x0; x <= x1; x++) {
        const idx = y * w + x;
        const p = idx * 4;
        const t = this.terrain[idx];
        const o = this.owner[idx];

        if (t === TERRAIN_DEEP_WATER) {
          data[p] = 10;
          data[p + 1] = 24 + latShade * 0.4;
          data[p + 2] = 48 + latShade * 0.8;
          data[p + 3] = 255;
        } else if (t === TERRAIN_SHALLOW_WATER) {
          data[p] = 19;
          data[p + 1] = 78;
          data[p + 2] = 114;
          data[p + 3] = 255;
        } else if (t === TERRAIN_RIVER) {
          data[p] = 56;
          data[p + 1] = 189;
          data[p + 2] = 248;
          data[p + 3] = 255;
        } else {
          const rightOwner = x < w - 1 ? this.owner[idx + 1] : o;
          const bottomOwner = y < h - 1 ? this.owner[idx + w] : o;
          const rightLand = x < w - 1 ? this.terrain[idx + 1] === TERRAIN_LAND : true;
          const bottomLand = y < h - 1 ? this.terrain[idx + w] === TERRAIN_LAND : true;

          const isCoastBorder =
            !rightLand ||
            !bottomLand ||
            (x > 0 && this.terrain[idx - 1] !== TERRAIN_LAND) ||
            (y > 0 && this.terrain[idx - w] !== TERRAIN_LAND);
          const isCountryBorder = o > 0 && (rightOwner !== o || bottomOwner !== o);

          let r = 101,
            g = 163,
            b = 13;

          let isStateBorder = false;
          if (o > 0) {
            // If viewing states for this country, color by stateOwner!
            if (activeStateCountryNumId && o === activeStateCountryNumId) {
              const sId = this.stateOwner[idx];
              const sRgb = sId > 0 ? this.stateColorCache.get(sId) : undefined;
              if (sRgb) {
                r = sRgb[0];
                g = sRgb[1];
                b = sRgb[2];
              } else {
                const rgb = numIdToColor.get(o);
                if (rgb) {
                  r = rgb[0];
                  g = rgb[1];
                  b = rgb[2];
                }
              }
              const rState = x < w - 1 ? this.stateOwner[idx + 1] : sId;
              const bState = y < h - 1 ? this.stateOwner[idx + w] : sId;
              if (sId > 0 && (rState !== sId || bState !== sId)) {
                isStateBorder = true;
              }
            } else {
              const rgb = numIdToColor.get(o);
              if (rgb) {
                r = rgb[0];
                g = rgb[1];
                b = rgb[2];
              }
            }
          }

          if (isCoastBorder) {
            r = Math.round(r * 0.42);
            g = Math.round(g * 0.42);
            b = Math.round(b * 0.42);
          } else if (isCountryBorder) {
            r = Math.round(r * 0.52);
            g = Math.round(g * 0.52);
            b = Math.round(b * 0.52);
          } else if (isStateBorder) {
            r = Math.round(r * 0.65);
            g = Math.round(g * 0.65);
            b = Math.round(b * 0.65);
          }

          data[p] = r;
          data[p + 1] = g;
          data[p + 2] = b;
          data[p + 3] = 255;
        }
      }
    }

    this.bufferCtx.putImageData(
      this.bufferImageData,
      0,
      0,
      x0,
      y0,
      x1 - x0 + 1,
      y1 - y0 + 1
    );
  }

  public recalculateTerritoryCounts(countries: Country[]) {
    const counts = new Int32Array(65536);
    const sumX = new Float64Array(65536);
    const sumY = new Float64Array(65536);

    this.countryMinX.fill(this.width);
    this.countryMaxX.fill(-1);
    this.countryMinY.fill(this.height);
    this.countryMaxY.fill(-1);

    const len = this.owner.length;
    const w = this.width;
    for (let i = 0; i < len; i++) {
      const id = this.owner[i];
      if (id > 0) {
        counts[id]++;
        const x = i % w;
        const y = (i - x) / w;
        sumX[id] += x;
        sumY[id] += y;
        if (x < this.countryMinX[id]) this.countryMinX[id] = x;
        if (x > this.countryMaxX[id]) this.countryMaxX[id] = x;
        if (y < this.countryMinY[id]) this.countryMinY[id] = y;
        if (y > this.countryMaxY[id]) this.countryMaxY[id] = y;
      }
    }

    countries.forEach((c) => {
      const count = counts[c.numericId] || 0;
      c.territoryCells = count;
      // Preserve authentic GeoJSON mainland centroid for real countries unless custom/redefined!
      if (count > 0 && (c.isCustom || c.hasCustomTerritory)) {
        c.centerX = Math.round(sumX[c.numericId] / count);
        c.centerY = Math.round(sumY[c.numericId] / count);
        c.normX = c.centerX / this.width;
        c.normY = c.centerY / this.height;
      }
    });
  }

  /**
   * Subdivides a country's territory into REAL-WORLD Admin-1 state polygons!
   */
  public ensureCountryStatesInitialized(
    country: Country,
    existingStates: StateTerritory[],
    startingNumericId: number
  ): StateTerritory[] {
    const countryStates = existingStates.filter((s) => s.countryId === country.id);
    if (countryStates.length > 0) {
      this.recalculateStateCounts(existingStates);
      return [];
    }

    // Collect all cells belonging to this country
    const cells: { x: number; y: number; idx: number }[] = [];
    let minX = this.width,
      maxX = 0,
      minY = this.height,
      maxY = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        if (this.owner[idx] === country.numericId && this.terrain[idx] === TERRAIN_LAND) {
          cells.push({ x, y, idx });
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (cells.length === 0) return [];

    const newStates: StateTerritory[] = [];
    const adminKey = ADMIN1_KEY_ALIASES[country.originalName] || country.originalName;
    const admin1List = !country.isCustom ? ADMIN1_STATES[adminKey] : undefined;

    // 1. Primary path: Rasterize 100% REAL Natural Earth Admin-1 state polygons!
    if (admin1List && admin1List.length > 0 && this.projection) {
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = this.width;
      tmpCanvas.height = this.height;
      const tmpCtx = tmpCanvas.getContext('2d', { willReadFrequently: true });

      if (tmpCtx) {
        tmpCtx.fillStyle = '#000000';
        tmpCtx.fillRect(0, 0, this.width, this.height);

        const drawPath = geoPath(this.projection, tmpCtx);
        const pathGen = geoPath(this.projection);
        const rgbToStateId = new Map<number, number>();
        const stateCentroids = new Map<number, { x: number; y: number }>();

        admin1List.forEach((entry, k) => {
          const numId = startingNumericId + k;
          const r = ((numId * 73 + 41) % 210) + 35;
          const g = ((numId * 137 + 83) % 210) + 35;
          const b = ((numId * 193 + 19) % 210) + 35;
          const rgbKey = (r << 16) | (g << 8) | b;
          rgbToStateId.set(rgbKey, numId);

          const feature: Feature<MultiPolygon> = {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'MultiPolygon',
              coordinates: entry.p,
            },
          };

          tmpCtx.beginPath();
          drawPath(feature);
          tmpCtx.fillStyle = `rgb(${r},${g},${b})`;
          tmpCtx.fill();

          const meta = resolveStateMetadata(country.originalName, entry.n);
          const cent = pathGen.centroid(feature);
          const cx = !Number.isNaN(cent[0]) ? Math.round(cent[0]) : Math.round((minX + maxX) / 2);
          const cy = !Number.isNaN(cent[1]) ? Math.round(cent[1]) : Math.round((minY + maxY) / 2);
          stateCentroids.set(numId, { x: cx, y: cy });

          newStates.push({
            id: `STATE_${country.id}_${numId}`,
            numericId: numId,
            countryId: country.id,
            name: meta.name,
            capitalCity: meta.capital,
            color: STATE_PALETTE[k % STATE_PALETTE.length],
            centerX: cx,
            centerY: cy,
            territoryCells: 0,
          });
        });

        const boxW = maxX - minX + 1;
        const boxH = maxY - minY + 1;
        const raw = tmpCtx.getImageData(minX, minY, boxW, boxH).data;
        const unassigned: { x: number; y: number; idx: number }[] = [];

        for (const cell of cells) {
          const lx = cell.x - minX;
          const ly = cell.y - minY;
          const p = (ly * boxW + lx) * 4;
          const key = (raw[p] << 16) | (raw[p + 1] << 8) | raw[p + 2];
          const sid = rgbToStateId.get(key);
          if (sid !== undefined) {
            this.stateOwner[cell.idx] = sid;
          } else {
            this.stateOwner[cell.idx] = 0;
            unassigned.push(cell);
          }
        }

        // Fill 1-2px coastal edge mismatches from adjacent assigned state pixels
        for (let pass = 0; pass < 4 && unassigned.length > 0; pass++) {
          for (let i = unassigned.length - 1; i >= 0; i--) {
            const c = unassigned[i];
            let found = 0;
            const x = c.x, y = c.y;
            if (x > 0 && this.owner[c.idx - 1] === country.numericId && this.stateOwner[c.idx - 1] > 0) {
              found = this.stateOwner[c.idx - 1];
            } else if (x < this.width - 1 && this.owner[c.idx + 1] === country.numericId && this.stateOwner[c.idx + 1] > 0) {
              found = this.stateOwner[c.idx + 1];
            } else if (y > 0 && this.owner[c.idx - this.width] === country.numericId && this.stateOwner[c.idx - this.width] > 0) {
              found = this.stateOwner[c.idx - this.width];
            } else if (y < this.height - 1 && this.owner[c.idx + this.width] === country.numericId && this.stateOwner[c.idx + this.width] > 0) {
              found = this.stateOwner[c.idx + this.width];
            }
            if (found > 0) {
              this.stateOwner[c.idx] = found;
              unassigned.splice(i, 1);
            }
          }
        }

        // Any remaining distant island pixel gets nearest state centroid
        if (unassigned.length > 0) {
          for (const c of unassigned) {
            let bestId = newStates[0].numericId;
            let bestD = Infinity;
            for (const st of newStates) {
              const cent = stateCentroids.get(st.numericId)!;
              const d = (c.x - cent.x) ** 2 + (c.y - cent.y) ** 2;
              if (d < bestD) {
                bestD = d;
                bestId = st.numericId;
              }
            }
            this.stateOwner[c.idx] = bestId;
          }
        }

        // Ensure tiny states like Distrito Federal or Rhode Island get at least 1 pixel at their centroid
        this.recalculateStateCounts(newStates);
        for (const st of newStates) {
          if (st.territoryCells === 0) {
            const cent = stateCentroids.get(st.numericId);
            if (!cent) continue;
            let closest = cells[0];
            let bestD = Infinity;
            for (const c of cells) {
              const d = (c.x - cent.x) ** 2 + (c.y - cent.y) ** 2;
              if (d < bestD) {
                bestD = d;
                closest = c;
              }
            }
            this.stateOwner[closest.idx] = st.numericId;
          }
        }

        this.recalculateStateCounts(newStates);
        country.states = newStates.map((s) => s.name);
        return newStates;
      }
    }

    // 2. Fallback: GeoStateSeed if available
    const realDefs: GeoStateSeed[] | undefined = REAL_COUNTRY_STATES[country.originalName];
    if (realDefs && realDefs.length > 0 && this.projection) {
      interface ProjectedSeed {
        state: StateTerritory;
        anchors: { x: number; y: number }[];
        weightSq: number;
      }

      const projectedSeeds: ProjectedSeed[] = [];
      realDefs.forEach((def, k) => {
        const pts: { x: number; y: number }[] = [];
        for (const [lon, lat] of def.anchors) {
          const p = this.projection!([lon, lat]);
          if (p && !Number.isNaN(p[0]) && !Number.isNaN(p[1])) {
            pts.push({ x: p[0], y: p[1] });
          }
        }
        if (pts.length === 0) return;

        const numId = startingNumericId + k;
        const w = def.weight ?? 1.0;
        const st: StateTerritory = {
          id: `STATE_${country.id}_${numId}`,
          numericId: numId,
          countryId: country.id,
          name: def.name,
          capitalCity: def.capital,
          color: STATE_PALETTE[k % STATE_PALETTE.length],
          centerX: Math.round(pts[0].x),
          centerY: Math.round(pts[0].y),
          territoryCells: 0,
        };
        newStates.push(st);
        projectedSeeds.push({ state: st, anchors: pts, weightSq: w * w });
      });

      if (projectedSeeds.length > 0) {
        for (const cell of cells) {
          let bestId = projectedSeeds[0].state.numericId;
          let bestScore = Infinity;
          for (const seed of projectedSeeds) {
            let minAnchorDist = Infinity;
            for (const a of seed.anchors) {
              const d = (cell.x - a.x) ** 2 + (cell.y - a.y) ** 2;
              if (d < minAnchorDist) minAnchorDist = d;
            }
            const score = minAnchorDist / seed.weightSq;
            if (score < bestScore) {
              bestScore = score;
              bestId = seed.state.numericId;
            }
          }
          this.stateOwner[cell.idx] = bestId;
        }
        this.recalculateStateCounts(newStates);
        country.states = newStates.map((s) => s.name);
        return newStates;
      }
    }

    // 3. Fallback for small/custom countries: geographic quadrants
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const regions: { name: string; cap: string; ax: number; ay: number }[] =
      cells.length < 36
        ? [{ name: country.name, cap: country.capital, ax: (minX + maxX) / 2, ay: (minY + maxY) / 2 }]
        : spanX > spanY * 1.35
        ? [
            { name: 'Região Oeste', cap: 'Oeste', ax: minX + spanX * 0.2, ay: (minY + maxY) / 2 },
            { name: 'Região Central', cap: country.capital, ax: minX + spanX * 0.5, ay: (minY + maxY) / 2 },
            { name: 'Região Leste', cap: 'Leste', ax: minX + spanX * 0.8, ay: (minY + maxY) / 2 },
          ]
        : [
            { name: 'Região Norte', cap: 'Norte', ax: (minX + maxX) / 2, ay: minY + spanY * 0.22 },
            { name: 'Região Central', cap: country.capital, ax: (minX + maxX) / 2, ay: minY + spanY * 0.5 },
            { name: 'Região Sul', cap: 'Sul', ax: (minX + maxX) / 2, ay: minY + spanY * 0.78 },
          ];

    regions.forEach((reg, k) => {
      const numId = startingNumericId + k;
      newStates.push({
        id: `STATE_${country.id}_${numId}`,
        numericId: numId,
        countryId: country.id,
        name: reg.name,
        capitalCity: reg.cap,
        color: STATE_PALETTE[k % STATE_PALETTE.length],
        centerX: Math.round(reg.ax),
        centerY: Math.round(reg.ay),
        territoryCells: 0,
      });
    });

    for (const cell of cells) {
      let bestId = newStates[0].numericId;
      let bestDist = Infinity;
      for (let k = 0; k < regions.length; k++) {
        const d = (cell.x - regions[k].ax) ** 2 + (cell.y - regions[k].ay) ** 2;
        if (d < bestDist) {
          bestDist = d;
          bestId = newStates[k].numericId;
        }
      }
      this.stateOwner[cell.idx] = bestId;
    }

    this.recalculateStateCounts(newStates);
    country.states = newStates.map((s) => s.name);
    return newStates;
  }

  public recalculateStateCounts(states: StateTerritory[]) {
    if (states.length === 0) return;
    const counts = new Map<number, number>();
    const sumX = new Map<number, number>();
    const sumY = new Map<number, number>();

    states.forEach((s) => {
      counts.set(s.numericId, 0);
      sumX.set(s.numericId, 0);
      sumY.set(s.numericId, 0);
    });

    const len = this.stateOwner.length;
    const w = this.width;
    for (let i = 0; i < len; i++) {
      const sid = this.stateOwner[i];
      if (sid > 0 && counts.has(sid)) {
        counts.set(sid, counts.get(sid)! + 1);
        const x = i % w;
        const y = (i - x) / w;
        sumX.set(sid, sumX.get(sid)! + x);
        sumY.set(sid, sumY.get(sid)! + y);
      }
    }

    states.forEach((s) => {
      const c = counts.get(s.numericId) || 0;
      s.territoryCells = c;
      if (c > 0) {
        s.centerX = Math.round(sumX.get(s.numericId)! / c);
        s.centerY = Math.round(sumY.get(s.numericId)! / c);
      }
    });
  }

  /**
   * Paints a state's territory inside its parent country (e.g. Alagoas taking a piece of Bahia!)
   */
  public paintStateStroke(
    points: { x: number; y: number }[],
    radius: number,
    countryNumericId: number,
    stateNumericId: number,
    countries: Country[],
    empires: Empire[],
    states: StateTerritory[]
  ) {
    if (points.length === 0) return;

    let minX = this.width,
      minY = this.height,
      maxX = 0,
      maxY = 0;
    const rSq = radius * radius;

    for (const pt of points) {
      const x0 = Math.max(0, Math.floor(pt.x - radius - 1));
      const x1 = Math.min(this.width - 1, Math.ceil(pt.x + radius + 1));
      const y0 = Math.max(0, Math.floor(pt.y - radius - 1));
      const y1 = Math.min(this.height - 1, Math.ceil(pt.y + radius + 1));

      minX = Math.min(minX, x0);
      minY = Math.min(minY, y0);
      maxX = Math.max(maxX, x1);
      maxY = Math.max(maxY, y1);

      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x - pt.x;
          const dy = y - pt.y;
          if (dx * dx + dy * dy <= rSq) {
            const idx = y * this.width + x;
            if (this.terrain[idx] === TERRAIN_LAND && this.owner[idx] === countryNumericId) {
              this.stateOwner[idx] = stateNumericId;
            }
          }
        }
      }
    }

    this.refreshRegion(minX, minY, maxX, maxY, countries, empires, states);
  }

  public clearCountryTerritory(
    country: Country,
    countries: Country[],
    empires: Empire[],
    states: StateTerritory[] = []
  ) {
    let minX = this.width,
      minY = this.height,
      maxX = 0,
      maxY = 0;
    let changed = false;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        if (this.owner[idx] === country.numericId) {
          this.owner[idx] = 0;
          this.stateOwner[idx] = 0;
          changed = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    country.hasCustomTerritory = true;

    if (changed) {
      this.recalculateTerritoryCounts(countries);
      this.refreshRegion(minX, minY, maxX, maxY, countries, empires, states);
    }
  }

  public paintTerritoryStroke(
    points: { x: number; y: number }[],
    radius: number,
    targetNumericId: number,
    style: 'solid' | 'organic',
    paintOverWater: boolean,
    countries: Country[],
    empires: Empire[],
    states: StateTerritory[] = []
  ) {
    if (points.length === 0) return;

    const targetCountry = countries.find((c) => c.numericId === targetNumericId);
    if (targetCountry && targetCountry.territoryCells === 0) {
      targetCountry.hasCustomTerritory = true;
    }

    let minX = this.width,
      minY = this.height,
      maxX = 0,
      maxY = 0;
    const rSq = radius * radius;

    for (const pt of points) {
      const x0 = Math.max(0, Math.floor(pt.x - radius - 2));
      const x1 = Math.min(this.width - 1, Math.ceil(pt.x + radius + 2));
      const y0 = Math.max(0, Math.floor(pt.y - radius - 2));
      const y1 = Math.min(this.height - 1, Math.ceil(pt.y + radius + 2));

      minX = Math.min(minX, x0);
      minY = Math.min(minY, y0);
      maxX = Math.max(maxX, x1);
      maxY = Math.max(maxY, y1);

      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x - pt.x;
          const dy = y - pt.y;
          const distSq = dx * dx + dy * dy;

          if (style === 'organic') {
            const wobble =
              Math.sin(x * 0.35 + y * 0.15) * 0.18 +
              Math.cos(y * 0.35 - x * 0.2) * 0.18;
            if (distSq > rSq * (1 + wobble)) continue;
          } else {
            if (distSq > rSq) continue;
          }

          const idx = y * this.width + x;
          if (paintOverWater && this.terrain[idx] !== TERRAIN_LAND) {
            this.terrain[idx] = TERRAIN_LAND;
          }
          if (this.terrain[idx] === TERRAIN_LAND) {
            this.owner[idx] = targetNumericId;
            if (targetNumericId === 0) this.stateOwner[idx] = 0;
          }
        }
      }
    }

    this.refreshRegion(minX, minY, maxX, maxY, countries, empires, states);
  }

  public sculptLandStroke(
    points: { x: number; y: number }[],
    radius: number,
    countries: Country[],
    empires: Empire[],
    states: StateTerritory[] = []
  ) {
    if (points.length === 0) return;

    let minX = this.width,
      minY = this.height,
      maxX = 0,
      maxY = 0;
    const rSq = radius * radius;
    const haloR = radius + 3;
    const haloSq = haloR * haloR;

    for (const pt of points) {
      const x0 = Math.max(0, Math.floor(pt.x - haloR));
      const x1 = Math.min(this.width - 1, Math.ceil(pt.x + haloR));
      const y0 = Math.max(0, Math.floor(pt.y - haloR));
      const y1 = Math.min(this.height - 1, Math.ceil(pt.y + haloR));

      minX = Math.min(minX, x0);
      minY = Math.min(minY, y0);
      maxX = Math.max(maxX, x1);
      maxY = Math.max(maxY, y1);

      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x - pt.x;
          const dy = y - pt.y;
          const distSq = dx * dx + dy * dy;
          const wobble = Math.sin(x * 0.25 + y * 0.25) * 0.2;
          const idx = y * this.width + x;

          if (distSq <= rSq * (1 + wobble)) {
            this.terrain[idx] = TERRAIN_LAND;
          } else if (distSq <= haloSq && this.terrain[idx] === TERRAIN_DEEP_WATER) {
            this.terrain[idx] = TERRAIN_SHALLOW_WATER;
          }
        }
      }
    }

    this.refreshRegion(minX, minY, maxX, maxY, countries, empires, states);
  }

  public sculptWaterStroke(
    points: { x: number; y: number }[],
    radius: number,
    type: 'shallow' | 'deep' | 'river',
    countries: Country[],
    empires: Empire[],
    states: StateTerritory[] = []
  ) {
    if (points.length === 0) return;

    let minX = this.width,
      minY = this.height,
      maxX = 0,
      maxY = 0;
    // Thin crisp line for rivers!
    const effRadius = type === 'river' ? Math.min(radius, 1.5) : radius;
    const rSq = effRadius * effRadius;
    const target =
      type === 'shallow'
        ? TERRAIN_SHALLOW_WATER
        : type === 'river'
        ? TERRAIN_RIVER
        : TERRAIN_DEEP_WATER;

    for (const pt of points) {
      const x0 = Math.max(0, Math.floor(pt.x - Math.ceil(effRadius)));
      const x1 = Math.min(this.width - 1, Math.ceil(pt.x + Math.ceil(effRadius)));
      const y0 = Math.max(0, Math.floor(pt.y - Math.ceil(effRadius)));
      const y1 = Math.min(this.height - 1, Math.ceil(pt.y + Math.ceil(effRadius)));

      minX = Math.min(minX, x0);
      minY = Math.min(minY, y0);
      maxX = Math.max(maxX, x1);
      maxY = Math.max(maxY, y1);

      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x - pt.x;
          const dy = y - pt.y;
          if (dx * dx + dy * dy <= rSq) {
            const idx = y * this.width + x;
            this.terrain[idx] = target;
            this.owner[idx] = 0;
            this.stateOwner[idx] = 0;
          }
        }
      }
    }

    this.refreshRegion(minX, minY, maxX, maxY, countries, empires, states);
  }

  public cutWithFreehandPath(
    path: { x: number; y: number }[],
    nextNumericId: number,
    countries: Country[],
    empires: Empire[],
    states: StateTerritory[] = []
  ): CutResult | null {
    if (path.length < 4) return null;

    const first = path[0];
    const last = path[path.length - 1];
    const distEnds = Math.hypot(first.x - last.x, first.y - last.y);
    const isClosedLoop = distEnds < 45 || (path.length > 20 && distEnds < 75);

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const p of path) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    const padding = isClosedLoop ? 4 : 38;
    const bMinX = Math.max(0, Math.floor(minX - padding));
    const bMaxX = Math.min(this.width - 1, Math.ceil(maxX + padding));
    const bMinY = Math.max(0, Math.floor(minY - padding));
    const bMaxY = Math.min(this.height - 1, Math.ceil(maxY + padding));

    let cellCount = 0;
    let sumX = 0;
    let sumY = 0;
    const sourceCountryIds = new Set<number>();

    if (isClosedLoop) {
      for (let y = bMinY; y <= bMaxY; y++) {
        for (let x = bMinX; x <= bMaxX; x++) {
          const idx = y * this.width + x;
          if (this.terrain[idx] === TERRAIN_LAND) {
            if (this.isPointInsidePolygon(x, y, path)) {
              if (this.owner[idx] > 0) sourceCountryIds.add(this.owner[idx]);
              this.owner[idx] = nextNumericId;
              this.stateOwner[idx] = 0;
              cellCount++;
              sumX += x;
              sumY += y;
            }
          }
        }
      }
    } else {
      const step = Math.max(1, Math.floor(path.length / 40));
      const simp: { x: number; y: number }[] = [];
      for (let i = 0; i < path.length; i += step) simp.push(path[i]);
      if (simp[simp.length - 1] !== last) simp.push(last);

      for (let y = bMinY; y <= bMaxY; y++) {
        for (let x = bMinX; x <= bMaxX; x++) {
          const idx = y * this.width + x;
          if (this.terrain[idx] === TERRAIN_LAND) {
            let minSegmentDist = Infinity;
            let closestCross = 0;

            for (let i = 0; i < simp.length - 1; i++) {
              const p1 = simp[i];
              const p2 = simp[i + 1];
              const segDx = p2.x - p1.x;
              const segDy = p2.y - p1.y;
              const segLenSq = segDx * segDx + segDy * segDy;
              if (segLenSq === 0) continue;

              const t = Math.max(
                0,
                Math.min(1, ((x - p1.x) * segDx + (y - p1.y) * segDy) / segLenSq)
              );
              const projX = p1.x + t * segDx;
              const projY = p1.y + t * segDy;
              const dist = Math.hypot(x - projX, y - projY);

              if (dist < minSegmentDist) {
                minSegmentDist = dist;
                closestCross = (x - p1.x) * segDy - (y - p1.y) * segDx;
              }
            }

            if (closestCross > 0 && minSegmentDist <= padding) {
              if (this.owner[idx] > 0) sourceCountryIds.add(this.owner[idx]);
              this.owner[idx] = nextNumericId;
              this.stateOwner[idx] = 0;
              cellCount++;
              sumX += x;
              sumY += y;
            }
          }
        }
      }
    }

    if (cellCount < 8) return null;

    this.refreshRegion(bMinX, bMinY, bMaxX, bMaxY, countries, empires, states);

    const sourceNames: string[] = [];
    sourceCountryIds.forEach((id) => {
      const c = countries.find((item) => item.numericId === id);
      if (c) sourceNames.push(c.name);
    });

    return {
      newNumericId: nextNumericId,
      cellCount,
      sourceCountryNames: sourceNames,
      centroid: {
        x: Math.round(sumX / cellCount),
        y: Math.round(sumY / cellCount),
      },
    };
  }

  private isPointInsidePolygon(
    px: number,
    py: number,
    polygon: { x: number; y: number }[]
  ): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x,
        yi = polygon[i].y;
      const xj = polygon[j].x,
        yj = polygon[j].y;

      const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Absorbs all remaining cells of a defeated country into a new State inside the victor!
   */
  public absorbCountryAsState(
    victor: Country,
    defeated: Country,
    newStateNumericId: number,
    countries: Country[],
    empires: Empire[],
    states: StateTerritory[]
  ): StateTerritory {
    let sumX = 0,
      sumY = 0,
      count = 0;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        if (this.owner[idx] === defeated.numericId) {
          this.owner[idx] = victor.numericId;
          this.stateOwner[idx] = newStateNumericId;
          sumX += x;
          sumY += y;
          count++;
        }
      }
    }

    const newState: StateTerritory = {
      id: `STATE_ANNEX_${defeated.id}_${Date.now()}`,
      numericId: newStateNumericId,
      countryId: victor.id,
      name: defeated.name,
      capitalCity: defeated.capital,
      color: STATE_PALETTE[states.length % STATE_PALETTE.length],
      centerX: count > 0 ? Math.round(sumX / count) : defeated.centerX,
      centerY: count > 0 ? Math.round(sumY / count) : defeated.centerY,
      territoryCells: count,
    };

    const updatedStates = [...states, newState];
    this.recalculateTerritoryCounts(countries);
    this.refreshFullBuffer(countries, empires, updatedStates);
    return newState;
  }

  /**
   * Declares independence of a StateTerritory, converting its pixels into a new Country!
   */
  public declareStateIndependence(
    parentCountry: Country,
    state: StateTerritory,
    newCountryNumericId: number,
    countries: Country[],
    empires: Empire[],
    states: StateTerritory[]
  ): { cellCount: number; centroid: { x: number; y: number } } {
    let sumX = 0;
    let sumY = 0;
    let count = 0;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        if (this.owner[idx] === parentCountry.numericId && this.stateOwner[idx] === state.numericId) {
          this.owner[idx] = newCountryNumericId;
          this.stateOwner[idx] = 0;
          sumX += x;
          sumY += y;
          count++;
        }
      }
    }

    const remainingStates = states.filter((s) => s.id !== state.id);
    this.recalculateTerritoryCounts(countries);
    this.recalculateStateCounts(remainingStates);
    this.refreshFullBuffer(countries, empires, remainingStates);

    return {
      cellCount: count,
      centroid: {
        x: count > 0 ? Math.round(sumX / count) : state.centerX,
        y: count > 0 ? Math.round(sumY / count) : state.centerY,
      },
    };
  }

  /**
   * Transfers all territory of donor country to recipient country (for gifting a created nation or returning a former state).
   * If asStateNumericId is provided, assigns all transferred pixels to that state inside recipient.
   */
  public transferCountryTerritory(
    donor: Country,
    recipient: Country,
    countries: Country[],
    empires: Empire[],
    states: StateTerritory[],
    asStateNumericId: number = 0
  ): { transferredCells: number; centroid: { x: number; y: number } } {
    let sumX = 0;
    let sumY = 0;
    let count = 0;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        if (this.owner[idx] === donor.numericId) {
          this.owner[idx] = recipient.numericId;
          this.stateOwner[idx] = asStateNumericId;
          sumX += x;
          sumY += y;
          count++;
        }
      }
    }

    this.recalculateTerritoryCounts(countries);
    this.recalculateStateCounts(states);
    this.refreshFullBuffer(countries, empires, states);

    return {
      transferredCells: count,
      centroid: {
        x: count > 0 ? Math.round(sumX / count) : donor.centerX,
        y: count > 0 ? Math.round(sumY / count) : donor.centerY,
      },
    };
  }

  /**
   * Carves an organic circular region for a newly created state when the user clicks inside the country
   */
  public carveNewStateTerritory(
    cx: number,
    cy: number,
    radius: number,
    countryNumericId: number,
    stateNumericId: number,
    countries: Country[],
    empires: Empire[],
    states: StateTerritory[]
  ): number {
    const r = Math.max(4, radius);
    const rSq = r * r;
    const x0 = Math.max(0, Math.floor(cx - r - 2));
    const x1 = Math.min(this.width - 1, Math.ceil(cx + r + 2));
    const y0 = Math.max(0, Math.floor(cy - r - 2));
    const y1 = Math.min(this.height - 1, Math.ceil(cy + r + 2));
    let count = 0;

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const wobble = Math.sin(x * 0.35 + y * 0.2) * 0.16;
        if (dx * dx + dy * dy <= rSq * (1 + wobble)) {
          const idx = y * this.width + x;
          if (this.terrain[idx] === TERRAIN_LAND && this.owner[idx] === countryNumericId) {
            this.stateOwner[idx] = stateNumericId;
            count++;
          }
        }
      }
    }

    if (count > 0) {
      this.recalculateStateCounts(states);
      this.refreshRegion(x0, y0, x1, y1, countries, empires, states);
    }
    return count;
  }

  /**
   * Captures pixel ownership snapshot of all countries joining an Empire so dissolving it restores exact pre-empire borders!
   */
  public captureEmpireSnapshot(
    memberIds: string[],
    countries: Country[]
  ): NonNullable<Empire['savedOwnership']> {
    const memberCountries = countries.filter((c) => memberIds.includes(c.id));
    const memberNumSet = new Set(memberCountries.map((c) => c.numericId));
    const indices: number[] = [];
    const owners: number[] = [];

    for (let i = 0; i < this.owner.length; i++) {
      const o = this.owner[i];
      if (memberNumSet.has(o)) {
        indices.push(i);
        owners.push(o);
      }
    }

    return {
      indices,
      owners,
      memberSnapshots: memberCountries.map((c) => ({
        id: c.id,
        name: c.name,
        capital: c.capital,
        color: c.color,
        ideology: c.ideology,
        flag: c.flag,
      })),
    };
  }

  /**
   * Restores the exact original borders and member countries when an Empire is dissolved!
   */
  public restoreEmpireSnapshot(
    empire: Empire,
    countries: Country[],
    empires: Empire[],
    states: StateTerritory[]
  ) {
    const snap = empire.savedOwnership;
    if (!snap) return;

    for (let k = 0; k < snap.indices.length; k++) {
      const idx = snap.indices[k];
      if (this.terrain[idx] === TERRAIN_LAND) {
        this.owner[idx] = snap.owners[k];
        this.stateOwner[idx] = 0;
      }
    }

    this.recalculateTerritoryCounts(countries);
    this.refreshFullBuffer(countries, empires, states);
  }

  /**
   * Smoothly steps all active soldier dots in 60fps animation frames
   */
  public stepSoldiers(speedFactor: number = 0.5) {
    for (let i = this.soldiers.length - 1; i >= 0; i--) {
      const s = this.soldiers[i];
      s.x += (s.vx + (Math.random() - 0.5) * 0.18) * speedFactor;
      s.y += (s.vy + (Math.random() - 0.5) * 0.18) * speedFactor;
      s.life += speedFactor;
      if (s.life >= s.maxLife) {
        this.soldiers.splice(i, 1);
      }
    }
  }

  /**
   * FAST WAR SIMULATION CLASH:
   * Detects real active frontlines between belligerents, spawns dense fast-moving colored
   * soldier dots for each country along the border, and rapidly invades/captures territory!
   */
  public simulateWarTick(
    wars: War[],
    countries: Country[],
    empires: Empire[],
    states: StateTerritory[] = []
  ) {
    if (wars.length === 0) return;

    this.warTickCounter++;
    const countryMap = new Map<string, Country>();
    const numIdToCountry = new Map<number, Country>();
    const empireMap = new Map<string, Empire>();
    empires.forEach((e) => empireMap.set(e.id, e));
    countries.forEach((c) => {
      countryMap.set(c.id, c);
      numIdToCountry.set(c.numericId, c);
    });

    const getSideColor = (numId: number): string => {
      const c = numIdToCountry.get(numId);
      if (!c) return '#f87171';
      if (c.empireId) {
        const emp = empireMap.get(c.empireId);
        if (emp) return emp.color;
      }
      return c.color;
    };

    let dirtyMinX = this.width,
      dirtyMinY = this.height,
      dirtyMaxX = 0,
      dirtyMaxY = 0;
    let anyChanged = false;

    const momentumWave = Math.sin(this.warTickCounter * 0.18) * 0.18;
    const drainedIds = new Set<string>();

    for (const war of wars) {
      [...war.attackers, ...war.defenders].forEach((cid) => {
        if (!drainedIds.has(cid)) {
          drainedIds.add(cid);
          const c = countryMap.get(cid);
          if (c && this.warTickCounter % 3 === 0) {
            c.gdp = Math.max(1, Math.round(c.gdp * 0.996 * 10) / 10);
          }
        }
      });

      const attackerNums = war.attackers
        .map((id) => countryMap.get(id)?.numericId)
        .filter((id): id is number => id !== undefined && id > 0);
      const defenderNums = war.defenders
        .map((id) => countryMap.get(id)?.numericId)
        .filter((id): id is number => id !== undefined && id > 0);

      if (attackerNums.length === 0 || defenderNums.length === 0) continue;

      const attSet = new Set(attackerNums);
      const defSet = new Set(defenderNums);

      let attMinX = this.width, attMaxX = 0, attMinY = this.height, attMaxY = 0;
      for (const n of attackerNums) {
        attMinX = Math.min(attMinX, this.countryMinX[n]);
        attMaxX = Math.max(attMaxX, this.countryMaxX[n]);
        attMinY = Math.min(attMinY, this.countryMinY[n]);
        attMaxY = Math.max(attMaxY, this.countryMaxY[n]);
      }
      let defMinX = this.width, defMaxX = 0, defMinY = this.height, defMaxY = 0;
      for (const n of defenderNums) {
        defMinX = Math.min(defMinX, this.countryMinX[n]);
        defMaxX = Math.max(defMaxX, this.countryMaxX[n]);
        defMinY = Math.min(defMinY, this.countryMinY[n]);
        defMaxY = Math.max(defMaxY, this.countryMaxY[n]);
      }

      const ix0 = Math.max(1, Math.max(attMinX, defMinX) - 3);
      const ix1 = Math.min(this.width - 2, Math.min(attMaxX, defMaxX) + 3);
      const iy0 = Math.max(1, Math.max(attMinY, defMinY) - 3);
      const iy1 = Math.min(this.height - 2, Math.min(attMaxY, defMaxY) + 3);

      interface FrontPair {
        attIdx: number;
        attX: number;
        attY: number;
        attOwner: number;
        defIdx: number;
        defX: number;
        defY: number;
        defOwner: number;
      }
      const frontline: FrontPair[] = [];

      if (ix0 <= ix1 && iy0 <= iy1) {
        const w = this.width;
        for (let y = iy0; y <= iy1; y++) {
          for (let x = ix0; x <= ix1; x++) {
            const idx = y * w + x;
            const o = this.owner[idx];
            if (!attSet.has(o)) continue;

            const nRight = idx + 1;
            const nLeft = idx - 1;
            const nDown = idx + w;
            const nUp = idx - w;

            if (defSet.has(this.owner[nRight])) {
              frontline.push({ attIdx: idx, attX: x, attY: y, attOwner: o, defIdx: nRight, defX: x + 1, defY: y, defOwner: this.owner[nRight] });
            } else if (defSet.has(this.owner[nLeft])) {
              frontline.push({ attIdx: idx, attX: x, attY: y, attOwner: o, defIdx: nLeft, defX: x - 1, defY: y, defOwner: this.owner[nLeft] });
            } else if (defSet.has(this.owner[nDown])) {
              frontline.push({ attIdx: idx, attX: x, attY: y, attOwner: o, defIdx: nDown, defX: x, defY: y + 1, defOwner: this.owner[nDown] });
            } else if (defSet.has(this.owner[nUp])) {
              frontline.push({ attIdx: idx, attX: x, attY: y, attOwner: o, defIdx: nUp, defX: x, defY: y - 1, defOwner: this.owner[nUp] });
            }
          }
        }
      }

      if (frontline.length > 0) {
        // Rapid territorial invasion along active frontline!
        const skirmishes = Math.min(frontline.length, Math.max(16, Math.ceil(frontline.length * 0.34)));
        for (let k = 0; k < skirmishes; k++) {
          const pair = frontline[Math.floor(Math.random() * frontline.length)];
          const attC = numIdToCountry.get(pair.attOwner);
          const defC = numIdToCountry.get(pair.defOwner);

          const attPower = (attC?.militaryPower || 300) * (1 + (attC?.techProgress || 0) / 200);
          const defPower = (defC?.militaryPower || 300) * (1 + (defC?.techProgress || 0) / 200);
          const baseChance = attPower / (attPower + defPower);
          const sectorWave =
            Math.sin(this.warTickCounter * 0.22 + pair.attX * 0.1 + pair.attY * 0.08) * 0.22 +
            momentumWave;
          const attChance = Math.max(0.18, Math.min(0.82, baseChance + sectorWave));

          if (Math.random() < attChance) {
            this.owner[pair.defIdx] = pair.attOwner;
            this.stateOwner[pair.defIdx] = 0;
            war.casualties.defenders += Math.floor(Math.random() * 20) + 5;
          } else {
            this.owner[pair.attIdx] = pair.defOwner;
            this.stateOwner[pair.attIdx] = 0;
            war.casualties.attackers += Math.floor(Math.random() * 20) + 5;
          }

          anyChanged = true;
          dirtyMinX = Math.min(dirtyMinX, pair.attX - 2, pair.defX - 2);
          dirtyMaxX = Math.max(dirtyMaxX, pair.attX + 2, pair.defX + 2);
          dirtyMinY = Math.min(dirtyMinY, pair.attY - 2, pair.defY - 2);
          dirtyMaxY = Math.max(dirtyMaxY, pair.attY + 2, pair.defY + 2);
        }

        // Fast, dense swarm of colored soldier dots pushing into opposing territory!
        const warSoldierCount = this.soldiers.filter((s) => s.warId === war.id).length;
        const targetPerWar = Math.min(180, Math.max(50, Math.round(frontline.length * 1.1)));
        const toSpawn = Math.min(36, Math.max(0, targetPerWar - warSoldierCount));

        for (let k = 0; k < toSpawn && this.soldiers.length < 420; k++) {
          const pair = frontline[Math.floor(Math.random() * frontline.length)];
          const dx = pair.defX - pair.attX;
          const dy = pair.defY - pair.attY;
          const spawnAttacker = k % 2 === 0;

          if (spawnAttacker) {
            this.soldiers.push({
              x: pair.attX + (Math.random() - 0.5) * 1.6,
              y: pair.attY + (Math.random() - 0.5) * 1.6,
              warId: war.id,
              side: 'attacker',
              ownerNumericId: pair.attOwner,
              color: getSideColor(pair.attOwner),
              vx: dx * 0.72 + (Math.random() - 0.5) * 0.35,
              vy: dy * 0.72 + (Math.random() - 0.5) * 0.35,
              life: 0,
              maxLife: 12 + Math.random() * 10,
            });
          } else {
            this.soldiers.push({
              x: pair.defX + (Math.random() - 0.5) * 1.6,
              y: pair.defY + (Math.random() - 0.5) * 1.6,
              warId: war.id,
              side: 'defender',
              ownerNumericId: pair.defOwner,
              color: getSideColor(pair.defOwner),
              vx: -dx * 0.72 + (Math.random() - 0.5) * 0.35,
              vy: -dy * 0.72 + (Math.random() - 0.5) * 0.35,
              life: 0,
              maxLife: 12 + Math.random() * 10,
            });
          }
        }
      } else if (this.warTickCounter % 5 === 0) {
        // Overseas / separated war: launch fast amphibious landing beachhead!
        const primaryAtt = attackerNums[0];
        const primaryDef = defenderNums[Math.floor(Math.random() * defenderNums.length)];
        const dMinX = Math.max(1, this.countryMinX[primaryDef]);
        const dMaxX = Math.min(this.width - 2, this.countryMaxX[primaryDef]);
        const dMinY = Math.max(1, this.countryMinY[primaryDef]);
        const dMaxY = Math.min(this.height - 2, this.countryMaxY[primaryDef]);

        if (dMinX <= dMaxX && dMinY <= dMaxY) {
          for (let attempt = 0; attempt < 60; attempt++) {
            const rx = dMinX + Math.floor(Math.random() * (dMaxX - dMinX + 1));
            const ry = dMinY + Math.floor(Math.random() * (dMaxY - dMinY + 1));
            const idx = ry * this.width + rx;
            if (this.owner[idx] === primaryDef) {
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  const nidx = (ry + dy) * this.width + (rx + dx);
                  if (this.owner[nidx] === primaryDef) {
                    this.owner[nidx] = primaryAtt;
                    this.stateOwner[nidx] = 0;
                  }
                }
              }
              anyChanged = true;
              dirtyMinX = Math.min(dirtyMinX, rx - 2);
              dirtyMaxX = Math.max(dirtyMaxX, rx + 2);
              dirtyMinY = Math.min(dirtyMinY, ry - 2);
              dirtyMaxY = Math.max(dirtyMaxY, ry + 2);
              break;
            }
          }
        }
      }
    }

    if (anyChanged) {
      this.refreshRegion(dirtyMinX, dirtyMinY, dirtyMaxX, dirtyMaxY, countries, empires, states);
    }
  }

  /**
   * CIVIL / STATE WAR SIMULATION:
   * Allows states inside a country (e.g. São Paulo vs Minas Gerais) to battle each other
   * with colored soldier dots and capture territory!
   */
  public simulateStateWarTick(
    stateWars: StateWar[],
    countries: Country[],
    empires: Empire[],
    states: StateTerritory[]
  ) {
    if (stateWars.length === 0) return;

    const stateMap = new Map<string, StateTerritory>();
    states.forEach((s) => stateMap.set(s.id, s));

    let dirtyMinX = this.width,
      dirtyMinY = this.height,
      dirtyMaxX = 0,
      dirtyMaxY = 0;
    let anyChanged = false;

    for (const sw of stateWars) {
      const country = countries.find((c) => c.id === sw.countryId);
      const attState = stateMap.get(sw.attackerStateId);
      const defState = stateMap.get(sw.defenderStateId);
      if (!country || !attState || !defState) continue;

      const cNum = country.numericId;
      const x0 = Math.max(1, this.countryMinX[cNum]);
      const x1 = Math.min(this.width - 2, this.countryMaxX[cNum]);
      const y0 = Math.max(1, this.countryMinY[cNum]);
      const y1 = Math.min(this.height - 2, this.countryMaxY[cNum]);
      if (x1 < x0 || y1 < y0) continue;

      interface StateFront {
        attIdx: number;
        attX: number;
        attY: number;
        defIdx: number;
        defX: number;
        defY: number;
      }
      const frontline: StateFront[] = [];
      const w = this.width;

      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const idx = y * w + x;
          if (this.owner[idx] !== cNum || this.stateOwner[idx] !== attState.numericId) continue;

          if (this.owner[idx + 1] === cNum && this.stateOwner[idx + 1] === defState.numericId) {
            frontline.push({ attIdx: idx, attX: x, attY: y, defIdx: idx + 1, defX: x + 1, defY: y });
          } else if (this.owner[idx - 1] === cNum && this.stateOwner[idx - 1] === defState.numericId) {
            frontline.push({ attIdx: idx, attX: x, attY: y, defIdx: idx - 1, defX: x - 1, defY: y });
          } else if (this.owner[idx + w] === cNum && this.stateOwner[idx + w] === defState.numericId) {
            frontline.push({ attIdx: idx, attX: x, attY: y, defIdx: idx + w, defX: x, defY: y + 1 });
          } else if (this.owner[idx - w] === cNum && this.stateOwner[idx - w] === defState.numericId) {
            frontline.push({ attIdx: idx, attX: x, attY: y, defIdx: idx - w, defX: x, defY: y - 1 });
          }
        }
      }

      if (frontline.length > 0) {
        const skirmishes = Math.min(frontline.length, Math.max(8, Math.ceil(frontline.length * 0.3)));
        for (let k = 0; k < skirmishes; k++) {
          const pair = frontline[Math.floor(Math.random() * frontline.length)];
          const wave = Math.sin(this.warTickCounter * 0.25 + pair.attX * 0.15) * 0.15;
          if (Math.random() < 0.52 + wave) {
            this.stateOwner[pair.defIdx] = attState.numericId;
            sw.casualties.defenders += Math.floor(Math.random() * 12) + 3;
          } else {
            this.stateOwner[pair.attIdx] = defState.numericId;
            sw.casualties.attackers += Math.floor(Math.random() * 12) + 3;
          }
          anyChanged = true;
          dirtyMinX = Math.min(dirtyMinX, pair.attX - 2, pair.defX - 2);
          dirtyMaxX = Math.max(dirtyMaxX, pair.attX + 2, pair.defX + 2);
          dirtyMinY = Math.min(dirtyMinY, pair.attY - 2, pair.defY - 2);
          dirtyMaxY = Math.max(dirtyMaxY, pair.attY + 2, pair.defY + 2);
        }

        const swSoldiers = this.soldiers.filter((s) => s.warId === sw.id).length;
        const toSpawn = Math.min(20, Math.max(0, 60 - swSoldiers));
        for (let k = 0; k < toSpawn && this.soldiers.length < 420; k++) {
          const pair = frontline[Math.floor(Math.random() * frontline.length)];
          const dx = pair.defX - pair.attX;
          const dy = pair.defY - pair.attY;
          const isAtt = k % 2 === 0;
          this.soldiers.push({
            x: (isAtt ? pair.attX : pair.defX) + (Math.random() - 0.5) * 1.4,
            y: (isAtt ? pair.attY : pair.defY) + (Math.random() - 0.5) * 1.4,
            warId: sw.id,
            side: isAtt ? 'attacker' : 'defender',
            ownerNumericId: isAtt ? attState.numericId : defState.numericId,
            color: isAtt ? attState.color : defState.color,
            vx: (isAtt ? dx : -dx) * 0.7 + (Math.random() - 0.5) * 0.3,
            vy: (isAtt ? dy : -dy) * 0.7 + (Math.random() - 0.5) * 0.3,
            life: 0,
            maxLife: 12 + Math.random() * 8,
          });
        }
      }
    }

    if (anyChanged) {
      this.recalculateStateCounts(states);
      this.refreshRegion(dirtyMinX, dirtyMinY, dirtyMaxX, dirtyMaxY, countries, empires, states);
    }
  }
}
