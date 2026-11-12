import { Country, Continent, TechEra, Ideology } from '../types/game';
import { REAL_COUNTRY_STATES } from './worldStates';
import worldAtlas from 'world-atlas/countries-110m.json';
import * as topojson from 'topojson-client';
import type { FeatureCollection, Geometry } from 'geojson';

interface CountryMeta {
  ptName: string;
  alpha2: string;
  capital: string;
  continent: Continent;
  pop: number;
  mil: number;
  gdp: number;
  era: TechEra;
  ideology: Ideology;
  color?: string;
  states?: string[];
  decrees?: string[];
}

// Rich Portuguese metadata & ISO alpha-2 flags for world-atlas country names
const COUNTRY_META: Record<string, CountryMeta> = {
  'Brazil': {
    ptName: 'Brasil', alpha2: 'br', capital: 'Brasília', continent: 'América do Sul',
    pop: 214.3, mil: 520, gdp: 2170, era: 'Digital', ideology: 'República', color: '#4ade80',
    states: [
      'Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal',
      'Espírito Santo', 'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul',
      'Minas Gerais', 'Pará', 'Paraíba', 'Paraná', 'Pernambuco', 'Piauí',
      'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul', 'Rondônia',
      'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins'
    ],
    decrees: ['Preservação da Amazônia', 'Industrialização Verde', 'Bolsa Ciência'],
  },
  'Argentina': {
    ptName: 'Argentina', alpha2: 'ar', capital: 'Buenos Aires', continent: 'América do Sul',
    pop: 46.2, mil: 280, gdp: 630, era: 'Digital', ideology: 'República', color: '#60a5fa',
    states: ['Buenos Aires', 'Córdoba', 'Santa Fe', 'Mendoza', 'Tucumán', 'Patagônia'],
    decrees: ['Reforma Cambial', 'Agronegócio Tecnológico'],
  },
  'Colombia': {
    ptName: 'Colômbia', alpha2: 'co', capital: 'Bogotá', continent: 'América do Sul',
    pop: 52.1, mil: 310, gdp: 360, era: 'Digital', ideology: 'República', color: '#facc15',
    states: ['Antioquia', 'Cundinamarca', 'Valle del Cauca', 'Bolívar'],
  },
  'Chile': {
    ptName: 'Chile', alpha2: 'cl', capital: 'Santiago', continent: 'América do Sul',
    pop: 19.6, mil: 260, gdp: 330, era: 'Digital', ideology: 'República', color: '#f87171',
    states: ['Santiago', 'Valparaíso', 'Antofagasta', 'Biobío', 'Magallanes'],
  },
  'Peru': {
    ptName: 'Peru', alpha2: 'pe', capital: 'Lima', continent: 'América do Sul',
    pop: 34.0, mil: 230, gdp: 260, era: 'Digital', ideology: 'República', color: '#fb923c',
    states: ['Lima', 'Arequipa', 'Cusco', 'La Libertad'],
  },
  'Bolivia': {
    ptName: 'Bolívia', alpha2: 'bo', capital: 'La Paz', continent: 'América do Sul',
    pop: 12.2, mil: 180, gdp: 45, era: 'Digital', ideology: 'República', color: '#a3e635',
  },
  'Venezuela': {
    ptName: 'Venezuela', alpha2: 've', capital: 'Caracas', continent: 'América do Sul',
    pop: 28.8, mil: 270, gdp: 110, era: 'Atômica', ideology: 'Militarismo', color: '#fbbf24',
  },
  'Ecuador': {
    ptName: 'Equador', alpha2: 'ec', capital: 'Quito', continent: 'América do Sul',
    pop: 18.0, mil: 190, gdp: 118, era: 'Digital', ideology: 'República', color: '#c084fc',
  },
  'Paraguay': {
    ptName: 'Paraguai', alpha2: 'py', capital: 'Assunção', continent: 'América do Sul',
    pop: 6.8, mil: 150, gdp: 42, era: 'Digital', ideology: 'República', color: '#34d399',
  },
  'Uruguay': {
    ptName: 'Uruguai', alpha2: 'uy', capital: 'Montevidéu', continent: 'América do Sul',
    pop: 3.4, mil: 140, gdp: 77, era: 'Digital', ideology: 'Democracia', color: '#38bdf8',
  },
  'Guyana': { ptName: 'Guiana', alpha2: 'gy', capital: 'Georgetown', continent: 'América do Sul', pop: 0.8, mil: 80, gdp: 16, era: 'Digital', ideology: 'República' },
  'Suriname': { ptName: 'Suriname', alpha2: 'sr', capital: 'Paramaribo', continent: 'América do Sul', pop: 0.6, mil: 70, gdp: 4, era: 'Digital', ideology: 'República' },
  'Falkland Is.': { ptName: 'Ilhas Malvinas', alpha2: 'fk', capital: 'Stanley', continent: 'América do Sul', pop: 0.01, mil: 50, gdp: 1, era: 'Digital', ideology: 'Democracia' },

  // América do Norte & Central
  'United States of America': {
    ptName: 'Estados Unidos', alpha2: 'us', capital: 'Washington, D.C.', continent: 'América do Norte',
    pop: 334.9, mil: 980, gdp: 27360, era: 'Futurista', ideology: 'Democracia', color: '#3b82f6',
    states: ['Califórnia', 'Texas', 'Flórida', 'Nova York', 'Illinois', 'Pensilvânia', 'Ohio', 'Geórgia', 'Washington', 'Alasca'],
    decrees: ['Poder de Fogo Global', 'Investimento em IA e Chips', 'Doutrina Aeroespacial'],
  },
  'Canada': {
    ptName: 'Canadá', alpha2: 'ca', capital: 'Ottawa', continent: 'América do Norte',
    pop: 40.5, mil: 440, gdp: 2140, era: 'Digital', ideology: 'Democracia', color: '#f43f5e',
    states: ['Ontário', 'Quebec', 'Colúmbia Britânica', 'Alberta', 'Manitoba', 'Yukon'],
  },
  'Mexico': {
    ptName: 'México', alpha2: 'mx', capital: 'Cidade do México', continent: 'América do Norte',
    pop: 129.0, mil: 390, gdp: 1810, era: 'Digital', ideology: 'República', color: '#10b981',
    states: ['Jalisco', 'Nuevo León', 'Puebla', 'Veracruz', 'Yucatán', 'Chihuahua'],
  },
  'Greenland': { ptName: 'Groenlândia', alpha2: 'gl', capital: 'Nuuk', continent: 'América do Norte', pop: 0.06, mil: 80, gdp: 3.5, era: 'Digital', ideology: 'Democracia', color: '#e2e8f0' },
  'Cuba': { ptName: 'Cuba', alpha2: 'cu', capital: 'Havana', continent: 'América do Norte', pop: 11.2, mil: 210, gdp: 107, era: 'Atômica', ideology: 'Socialismo' },
  'Guatemala': { ptName: 'Guatemala', alpha2: 'gt', capital: 'Cidade da Guatemala', continent: 'América do Norte', pop: 17.6, mil: 140, gdp: 102, era: 'Digital', ideology: 'República' },
  'Honduras': { ptName: 'Honduras', alpha2: 'hn', capital: 'Tegucigalpa', continent: 'América do Norte', pop: 10.4, mil: 120, gdp: 34, era: 'Digital', ideology: 'República' },
  'Nicaragua': { ptName: 'Nicarágua', alpha2: 'ni', capital: 'Manágua', continent: 'América do Norte', pop: 6.9, mil: 110, gdp: 17, era: 'Digital', ideology: 'República' },
  'Costa Rica': { ptName: 'Costa Rica', alpha2: 'cr', capital: 'San José', continent: 'América do Norte', pop: 5.2, mil: 90, gdp: 86, era: 'Digital', ideology: 'Democracia' },
  'Panama': { ptName: 'Panamá', alpha2: 'pa', capital: 'Cidade do Panamá', continent: 'América do Norte', pop: 4.4, mil: 110, gdp: 83, era: 'Digital', ideology: 'República' },
  'El Salvador': { ptName: 'El Salvador', alpha2: 'sv', capital: 'San Salvador', continent: 'América do Norte', pop: 6.3, mil: 130, gdp: 34, era: 'Digital', ideology: 'República' },
  'Belize': { ptName: 'Belize', alpha2: 'bz', capital: 'Belmopan', continent: 'América do Norte', pop: 0.4, mil: 60, gdp: 3, era: 'Digital', ideology: 'Democracia' },
  'Haiti': { ptName: 'Haiti', alpha2: 'ht', capital: 'Porto Príncipe', continent: 'América do Norte', pop: 11.5, mil: 80, gdp: 20, era: 'Industrial', ideology: 'República' },
  'Dominican Rep.': { ptName: 'Rep. Dominicana', alpha2: 'do', capital: 'Santo Domingo', continent: 'América do Norte', pop: 11.2, mil: 140, gdp: 121, era: 'Digital', ideology: 'República' },
  'Jamaica': { ptName: 'Jamaica', alpha2: 'jm', capital: 'Kingston', continent: 'América do Norte', pop: 2.8, mil: 90, gdp: 19, era: 'Digital', ideology: 'Democracia' },
  'Bahamas': { ptName: 'Bahamas', alpha2: 'bs', capital: 'Nassau', continent: 'América do Norte', pop: 0.4, mil: 60, gdp: 14, era: 'Digital', ideology: 'Democracia' },
  'Puerto Rico': { ptName: 'Porto Rico', alpha2: 'pr', capital: 'San Juan', continent: 'América do Norte', pop: 3.2, mil: 100, gdp: 117, era: 'Digital', ideology: 'Democracia' },
  'Trinidad and Tobago': { ptName: 'Trinidad e Tobago', alpha2: 'tt', capital: 'Port of Spain', continent: 'América do Norte', pop: 1.5, mil: 80, gdp: 28, era: 'Digital', ideology: 'República' },

  // Europa
  'Russia': {
    ptName: 'Rússia', alpha2: 'ru', capital: 'Moscou', continent: 'Europa',
    pop: 144.4, mil: 930, gdp: 2020, era: 'Digital', ideology: 'Militarismo', color: '#e11d48',
    states: ['Moscou', 'São Petersburgo', 'Sibéria Central', 'Extremo Oriente', 'Urais', 'Volga'],
    decrees: ['Dissuasão Nuclear', 'Rota do Mar do Norte', 'Indústria Bélica'],
  },
  'United Kingdom': {
    ptName: 'Reino Unido', alpha2: 'gb', capital: 'Londres', continent: 'Europa',
    pop: 68.3, mil: 670, gdp: 3340, era: 'Digital', ideology: 'Monarquia', color: '#2563eb',
    states: ['Inglaterra', 'Escócia', 'País de Gales', 'Irlanda do Norte'],
  },
  'France': {
    ptName: 'França', alpha2: 'fr', capital: 'Paris', continent: 'Europa',
    pop: 68.0, mil: 690, gdp: 3080, era: 'Digital', ideology: 'República', color: '#3b82f6',
    states: ['Île-de-France', 'Occitânia', 'Nova Aquitânia', 'Bretanha', 'Provença'],
  },
  'Germany': {
    ptName: 'Alemanha', alpha2: 'de', capital: 'Berlim', continent: 'Europa',
    pop: 84.4, mil: 640, gdp: 4450, era: 'Digital', ideology: 'República', color: '#64748b',
    states: ['Baviera', 'Baden-Württemberg', 'Renânia', 'Hesse', 'Saxônia'],
  },
  'Italy': {
    ptName: 'Itália', alpha2: 'it', capital: 'Roma', continent: 'Europa',
    pop: 58.9, mil: 560, gdp: 2280, era: 'Digital', ideology: 'República', color: '#22c55e',
    states: ['Lombardia', 'Lácio', 'Vêneto', 'Piemonte', 'Sicília'],
    decrees: ['Preservação do Mediterrâneo', 'Manufatura Automotiva & Ferraris'],
  },
  'Spain': {
    ptName: 'Espanha', alpha2: 'es', capital: 'Madri', continent: 'Europa',
    pop: 48.4, mil: 480, gdp: 1580, era: 'Digital', ideology: 'Monarquia', color: '#f59e0b',
    states: ['Andaluzia', 'Catalunha', 'Madri', 'Valência', 'Galícia'],
  },
  'Portugal': {
    ptName: 'Portugal', alpha2: 'pt', capital: 'Lisboa', continent: 'Europa',
    pop: 10.4, mil: 310, gdp: 287, era: 'Digital', ideology: 'República', color: '#16a34a',
    states: ['Lisboa', 'Porto', 'Algarve', 'Alentejo', 'Açores', 'Madeira'],
  },
  'Ukraine': {
    ptName: 'Ucrânia', alpha2: 'ua', capital: 'Kiev', continent: 'Europa',
    pop: 38.0, mil: 760, gdp: 180, era: 'Digital', ideology: 'República', color: '#eab308',
  },
  'Poland': { ptName: 'Polônia', alpha2: 'pl', capital: 'Varsóvia', continent: 'Europa', pop: 37.7, mil: 590, gdp: 840, era: 'Digital', ideology: 'República', color: '#fb7185' },
  'Norway': { ptName: 'Noruega', alpha2: 'no', capital: 'Oslo', continent: 'Europa', pop: 5.5, mil: 350, gdp: 540, era: 'Digital', ideology: 'Monarquia', color: '#6366f1' },
  'Sweden': { ptName: 'Suécia', alpha2: 'se', capital: 'Estocolmo', continent: 'Europa', pop: 10.5, mil: 410, gdp: 590, era: 'Digital', ideology: 'Monarquia', color: '#0ea5e9' },
  'Finland': { ptName: 'Finlândia', alpha2: 'fi', capital: 'Helsinque', continent: 'Europa', pop: 5.6, mil: 430, gdp: 300, era: 'Digital', ideology: 'República', color: '#38bdf8' },
  'Denmark': { ptName: 'Dinamarca', alpha2: 'dk', capital: 'Copenhague', continent: 'Europa', pop: 5.9, mil: 310, gdp: 405, era: 'Digital', ideology: 'Monarquia' },
  'Iceland': { ptName: 'Islândia', alpha2: 'is', capital: 'Reykjavik', continent: 'Europa', pop: 0.4, mil: 80, gdp: 31, era: 'Digital', ideology: 'República' },
  'Ireland': { ptName: 'Irlanda', alpha2: 'ie', capital: 'Dublin', continent: 'Europa', pop: 5.2, mil: 210, gdp: 545, era: 'Digital', ideology: 'República' },
  'Netherlands': { ptName: 'Países Baixos', alpha2: 'nl', capital: 'Amsterdã', continent: 'Europa', pop: 17.8, mil: 390, gdp: 1110, era: 'Digital', ideology: 'Monarquia' },
  'Belgium': { ptName: 'Bélgica', alpha2: 'be', capital: 'Bruxelas', continent: 'Europa', pop: 11.7, mil: 310, gdp: 632, era: 'Digital', ideology: 'Monarquia' },
  'Switzerland': { ptName: 'Suíça', alpha2: 'ch', capital: 'Berna', continent: 'Europa', pop: 8.8, mil: 340, gdp: 905, era: 'Digital', ideology: 'Democracia' },
  'Austria': { ptName: 'Áustria', alpha2: 'at', capital: 'Viena', continent: 'Europa', pop: 9.1, mil: 290, gdp: 516, era: 'Digital', ideology: 'República' },
  'Czechia': { ptName: 'Rep. Tcheca', alpha2: 'cz', capital: 'Praga', continent: 'Europa', pop: 10.8, mil: 320, gdp: 330, era: 'Digital', ideology: 'República' },
  'Slovakia': { ptName: 'Eslováquia', alpha2: 'sk', capital: 'Bratislava', continent: 'Europa', pop: 5.4, mil: 240, gdp: 132, era: 'Digital', ideology: 'República' },
  'Hungary': { ptName: 'Hungria', alpha2: 'hu', capital: 'Budapeste', continent: 'Europa', pop: 9.6, mil: 290, gdp: 212, era: 'Digital', ideology: 'República' },
  'Romania': { ptName: 'Romênia', alpha2: 'ro', capital: 'Bucareste', continent: 'Europa', pop: 19.0, mil: 390, gdp: 350, era: 'Digital', ideology: 'República' },
  'Bulgaria': { ptName: 'Bulgária', alpha2: 'bg', capital: 'Sófia', continent: 'Europa', pop: 6.4, mil: 260, gdp: 101, era: 'Digital', ideology: 'República' },
  'Greece': { ptName: 'Grécia', alpha2: 'gr', capital: 'Atenas', continent: 'Europa', pop: 10.4, mil: 460, gdp: 239, era: 'Digital', ideology: 'República' },
  'Belarus': { ptName: 'Bielorrússia', alpha2: 'by', capital: 'Minsk', continent: 'Europa', pop: 9.2, mil: 350, gdp: 71, era: 'Digital', ideology: 'Militarismo' },
  'Lithuania': { ptName: 'Lituânia', alpha2: 'lt', capital: 'Vilnius', continent: 'Europa', pop: 2.8, mil: 210, gdp: 77, era: 'Digital', ideology: 'República' },
  'Latvia': { ptName: 'Letônia', alpha2: 'lv', capital: 'Riga', continent: 'Europa', pop: 1.8, mil: 190, gdp: 43, era: 'Digital', ideology: 'República' },
  'Estonia': { ptName: 'Estônia', alpha2: 'ee', capital: 'Tallinn', continent: 'Europa', pop: 1.3, mil: 200, gdp: 41, era: 'Digital', ideology: 'República' },
  'Moldova': { ptName: 'Moldávia', alpha2: 'md', capital: 'Chisinau', continent: 'Europa', pop: 2.5, mil: 130, gdp: 16, era: 'Digital', ideology: 'República' },
  'Serbia': { ptName: 'Sérvia', alpha2: 'rs', capital: 'Belgrado', continent: 'Europa', pop: 6.6, mil: 310, gdp: 75, era: 'Digital', ideology: 'República' },
  'Croatia': { ptName: 'Croácia', alpha2: 'hr', capital: 'Zagreb', continent: 'Europa', pop: 3.8, mil: 230, gdp: 82, era: 'Digital', ideology: 'República' },
  'Bosnia and Herz.': { ptName: 'Bósnia', alpha2: 'ba', capital: 'Sarajevo', continent: 'Europa', pop: 3.2, mil: 160, gdp: 27, era: 'Digital', ideology: 'República' },
  'Albania': { ptName: 'Albânia', alpha2: 'al', capital: 'Tirana', continent: 'Europa', pop: 2.7, mil: 150, gdp: 23, era: 'Digital', ideology: 'República' },
  'Macedonia': { ptName: 'Macedônia do Norte', alpha2: 'mk', capital: 'Escópia', continent: 'Europa', pop: 1.8, mil: 130, gdp: 15, era: 'Digital', ideology: 'República' },
  'Slovenia': { ptName: 'Eslovênia', alpha2: 'si', capital: 'Liubliana', continent: 'Europa', pop: 2.1, mil: 170, gdp: 68, era: 'Digital', ideology: 'República' },
  'Montenegro': { ptName: 'Montenegro', alpha2: 'me', capital: 'Podgorica', continent: 'Europa', pop: 0.6, mil: 100, gdp: 7, era: 'Digital', ideology: 'República' },
  'Kosovo': { ptName: 'Kosovo', alpha2: 'xk', capital: 'Pristina', continent: 'Europa', pop: 1.7, mil: 110, gdp: 10, era: 'Digital', ideology: 'República' },
  'Luxembourg': { ptName: 'Luxemburgo', alpha2: 'lu', capital: 'Luxemburgo', continent: 'Europa', pop: 0.6, mil: 120, gdp: 85, era: 'Digital', ideology: 'Monarquia' },

  // Ásia & Oriente Médio
  'China': {
    ptName: 'China', alpha2: 'cn', capital: 'Pequim', continent: 'Ásia',
    pop: 1411.0, mil: 960, gdp: 17790, era: 'Futurista', ideology: 'Socialismo', color: '#ef4444',
    states: ['Guangdong', 'Shandong', 'Henan', 'Sichuan', 'Jiangsu', 'Zhejiang', 'Xinjiang', 'Tibete'],
    decrees: ['Nova Rota da Seda', 'Autossuficiência em Semicondutores'],
  },
  'India': {
    ptName: 'Índia', alpha2: 'in', capital: 'Nova Délhi', continent: 'Ásia',
    pop: 1428.6, mil: 880, gdp: 3940, era: 'Digital', ideology: 'Democracia', color: '#f97316',
    states: ['Uttar Pradesh', 'Maharashtra', 'Bengala Ocidental', 'Tamil Nadu', 'Karnataka'],
  },
  'Japan': {
    ptName: 'Japão', alpha2: 'jp', capital: 'Tóquio', continent: 'Ásia',
    pop: 124.5, mil: 690, gdp: 4210, era: 'Digital', ideology: 'Monarquia', color: '#f43f5e',
    states: ['Tóquio', 'Osaka', 'Kanagawa', 'Aichi', 'Hokkaido'],
  },
  'South Korea': { ptName: 'Coreia do Sul', alpha2: 'kr', capital: 'Seul', continent: 'Ásia', pop: 51.7, mil: 740, gdp: 1710, era: 'Digital', ideology: 'Democracia', color: '#2563eb' },
  'North Korea': { ptName: 'Coreia do Norte', alpha2: 'kp', capital: 'Pyongyang', continent: 'Ásia', pop: 26.0, mil: 690, gdp: 40, era: 'Atômica', ideology: 'Militarismo', color: '#991b1b' },
  'Kazakhstan': { ptName: 'Cazaquistão', alpha2: 'kz', capital: 'Astana', continent: 'Ásia', pop: 20.0, mil: 340, gdp: 260, era: 'Digital', ideology: 'República', color: '#06b6d4' },
  'Mongolia': { ptName: 'Mongólia', alpha2: 'mn', capital: 'Ulan Bator', continent: 'Ásia', pop: 3.5, mil: 170, gdp: 20, era: 'Digital', ideology: 'República', color: '#d97706' },
  'Indonesia': { ptName: 'Indonésia', alpha2: 'id', capital: 'Jacarta', continent: 'Ásia', pop: 277.5, mil: 480, gdp: 1370, era: 'Digital', ideology: 'República', color: '#ec4899' },
  'Turkey': { ptName: 'Turquia', alpha2: 'tr', capital: 'Ancara', continent: 'Ásia', pop: 85.3, mil: 660, gdp: 1150, era: 'Digital', ideology: 'República', color: '#dc2626' },
  'Saudi Arabia': { ptName: 'Arábia Saudita', alpha2: 'sa', capital: 'Riad', continent: 'Ásia', pop: 36.4, mil: 530, gdp: 1070, era: 'Digital', ideology: 'Monarquia', color: '#16a34a' },
  'Iran': { ptName: 'Irã', alpha2: 'ir', capital: 'Teerã', continent: 'Ásia', pop: 88.5, mil: 640, gdp: 410, era: 'Digital', ideology: 'República', color: '#059669' },
  'Pakistan': { ptName: 'Paquistão', alpha2: 'pk', capital: 'Islamabad', continent: 'Ásia', pop: 240.5, mil: 680, gdp: 340, era: 'Atômica', ideology: 'República', color: '#15803d' },
  'Afghanistan': { ptName: 'Afeganistão', alpha2: 'af', capital: 'Cabul', continent: 'Ásia', pop: 42.2, mil: 290, gdp: 15, era: 'Industrial', ideology: 'Militarismo' },
  'Thailand': { ptName: 'Tailândia', alpha2: 'th', capital: 'Bangkok', continent: 'Ásia', pop: 71.8, mil: 420, gdp: 515, era: 'Digital', ideology: 'Monarquia' },
  'Vietnam': { ptName: 'Vietnã', alpha2: 'vn', capital: 'Hanói', continent: 'Ásia', pop: 98.8, mil: 540, gdp: 430, era: 'Digital', ideology: 'Socialismo' },
  'Myanmar': { ptName: 'Mianmar', alpha2: 'mm', capital: 'Naypyidaw', continent: 'Ásia', pop: 54.5, mil: 380, gdp: 64, era: 'Atômica', ideology: 'Militarismo' },
  'Malaysia': { ptName: 'Malásia', alpha2: 'my', capital: 'Kuala Lumpur', continent: 'Ásia', pop: 34.3, mil: 340, gdp: 415, era: 'Digital', ideology: 'Monarquia' },
  'Philippines': { ptName: 'Filipinas', alpha2: 'ph', capital: 'Manila', continent: 'Ásia', pop: 117.3, mil: 390, gdp: 437, era: 'Digital', ideology: 'República' },
  'Iraq': { ptName: 'Iraque', alpha2: 'iq', capital: 'Bagdá', continent: 'Ásia', pop: 45.5, mil: 410, gdp: 250, era: 'Digital', ideology: 'República' },
  'Syria': { ptName: 'Síria', alpha2: 'sy', capital: 'Damasco', continent: 'Ásia', pop: 23.2, mil: 290, gdp: 12, era: 'Atômica', ideology: 'Militarismo' },
  'Israel': { ptName: 'Israel', alpha2: 'il', capital: 'Jerusalém', continent: 'Ásia', pop: 9.7, mil: 710, gdp: 510, era: 'Futurista', ideology: 'Democracia' },
  'Palestine': { ptName: 'Palestina', alpha2: 'ps', capital: 'Ramallah', continent: 'Ásia', pop: 5.4, mil: 140, gdp: 18, era: 'Digital', ideology: 'República' },
  'Jordan': { ptName: 'Jordânia', alpha2: 'jo', capital: 'Amã', continent: 'Ásia', pop: 11.3, mil: 280, gdp: 50, era: 'Digital', ideology: 'Monarquia' },
  'Lebanon': { ptName: 'Líbano', alpha2: 'lb', capital: 'Beirute', continent: 'Ásia', pop: 5.3, mil: 180, gdp: 20, era: 'Digital', ideology: 'República' },
  'United Arab Emirates': { ptName: 'Emirados Árabes', alpha2: 'ae', capital: 'Abu Dhabi', continent: 'Ásia', pop: 9.5, mil: 410, gdp: 504, era: 'Futurista', ideology: 'Monarquia' },
  'Qatar': { ptName: 'Catar', alpha2: 'qa', capital: 'Doha', continent: 'Ásia', pop: 2.7, mil: 260, gdp: 235, era: 'Digital', ideology: 'Monarquia' },
  'Kuwait': { ptName: 'Kuwait', alpha2: 'kw', capital: 'Cidade do Kuwait', continent: 'Ásia', pop: 4.3, mil: 240, gdp: 161, era: 'Digital', ideology: 'Monarquia' },
  'Oman': { ptName: 'Omã', alpha2: 'om', capital: 'Mascate', continent: 'Ásia', pop: 4.6, mil: 250, gdp: 108, era: 'Digital', ideology: 'Monarquia' },
  'Yemen': { ptName: 'Iêmen', alpha2: 'ye', capital: 'Sanaa', continent: 'Ásia', pop: 34.4, mil: 230, gdp: 21, era: 'Industrial', ideology: 'República' },
  'Uzbekistan': { ptName: 'Uzbequistão', alpha2: 'uz', capital: 'Tashkent', continent: 'Ásia', pop: 36.0, mil: 340, gdp: 90, era: 'Digital', ideology: 'República' },
  'Turkmenistan': { ptName: 'Turcomenistão', alpha2: 'tm', capital: 'Asgabate', continent: 'Ásia', pop: 6.5, mil: 210, gdp: 59, era: 'Digital', ideology: 'República' },
  'Kyrgyzstan': { ptName: 'Quirguistão', alpha2: 'kg', capital: 'Bishkek', continent: 'Ásia', pop: 7.0, mil: 160, gdp: 14, era: 'Digital', ideology: 'República' },
  'Tajikistan': { ptName: 'Tajiquistão', alpha2: 'tj', capital: 'Dushanbe', continent: 'Ásia', pop: 10.1, mil: 170, gdp: 12, era: 'Digital', ideology: 'República' },
  'Bangladesh': { ptName: 'Bangladesh', alpha2: 'bd', capital: 'Daca', continent: 'Ásia', pop: 173.0, mil: 410, gdp: 437, era: 'Digital', ideology: 'República' },
  'Nepal': { ptName: 'Nepal', alpha2: 'np', capital: 'Catmandu', continent: 'Ásia', pop: 30.9, mil: 180, gdp: 41, era: 'Digital', ideology: 'República' },
  'Bhutan': { ptName: 'Butão', alpha2: 'bt', capital: 'Thimphu', continent: 'Ásia', pop: 0.8, mil: 70, gdp: 3, era: 'Digital', ideology: 'Monarquia' },
  'Sri Lanka': { ptName: 'Sri Lanka', alpha2: 'lk', capital: 'Colombo', continent: 'Ásia', pop: 21.9, mil: 240, gdp: 84, era: 'Digital', ideology: 'República' },
  'Cambodia': { ptName: 'Camboja', alpha2: 'kh', capital: 'Phnom Penh', continent: 'Ásia', pop: 16.9, mil: 200, gdp: 31, era: 'Digital', ideology: 'Monarquia' },
  'Laos': { ptName: 'Laos', alpha2: 'la', capital: 'Vientiane', continent: 'Ásia', pop: 7.6, mil: 160, gdp: 15, era: 'Digital', ideology: 'Socialismo' },
  'Taiwan': { ptName: 'Taiwan', alpha2: 'tw', capital: 'Taipé', continent: 'Ásia', pop: 23.9, mil: 590, gdp: 756, era: 'Futurista', ideology: 'Democracia' },
  'Georgia': { ptName: 'Geórgia', alpha2: 'ge', capital: 'Tbilisi', continent: 'Ásia', pop: 3.7, mil: 210, gdp: 30, era: 'Digital', ideology: 'República' },
  'Armenia': { ptName: 'Armênia', alpha2: 'am', capital: 'Yerevan', continent: 'Ásia', pop: 2.8, mil: 220, gdp: 24, era: 'Digital', ideology: 'República' },
  'Azerbaijan': { ptName: 'Azerbaijão', alpha2: 'az', capital: 'Baku', continent: 'Ásia', pop: 10.1, mil: 360, gdp: 72, era: 'Digital', ideology: 'República' },
  'Brunei': { ptName: 'Brunei', alpha2: 'bn', capital: 'Bandar Seri Begawan', continent: 'Ásia', pop: 0.45, mil: 100, gdp: 15, era: 'Digital', ideology: 'Monarquia' },
  'Timor-Leste': { ptName: 'Timor-Leste', alpha2: 'tl', capital: 'Díli', continent: 'Ásia', pop: 1.3, mil: 80, gdp: 2, era: 'Digital', ideology: 'República' },
  'Cyprus': { ptName: 'Chipre', alpha2: 'cy', capital: 'Nicósia', continent: 'Europa', pop: 1.2, mil: 140, gdp: 32, era: 'Digital', ideology: 'República' },
  'N. Cyprus': { ptName: 'Chipre do Norte', alpha2: 'cy', capital: 'Nicósia', continent: 'Europa', pop: 0.4, mil: 90, gdp: 4, era: 'Digital', ideology: 'República' },

  // África
  'Algeria': { ptName: 'Argélia', alpha2: 'dz', capital: 'Argel', continent: 'África', pop: 45.6, mil: 460, gdp: 240, era: 'Digital', ideology: 'República', color: '#10b981' },
  'Libya': { ptName: 'Líbia', alpha2: 'ly', capital: 'Trípoli', continent: 'África', pop: 7.0, mil: 240, gdp: 45, era: 'Atômica', ideology: 'República', color: '#eab308' },
  'Egypt': { ptName: 'Egito', alpha2: 'eg', capital: 'Cairo', continent: 'África', pop: 109.3, mil: 610, gdp: 390, era: 'Digital', ideology: 'República', color: '#f59e0b' },
  'Morocco': { ptName: 'Marrocos', alpha2: 'ma', capital: 'Rabat', continent: 'África', pop: 37.8, mil: 410, gdp: 141, era: 'Digital', ideology: 'Monarquia', color: '#ef4444' },
  'W. Sahara': { ptName: 'Saara Ocidental', alpha2: 'eh', capital: 'El Aiune', continent: 'África', pop: 0.6, mil: 80, gdp: 1, era: 'Industrial', ideology: 'República' },
  'Tunisia': { ptName: 'Tunísia', alpha2: 'tn', capital: 'Túnis', continent: 'África', pop: 12.4, mil: 230, gdp: 48, era: 'Digital', ideology: 'República' },
  'Nigeria': { ptName: 'Nigéria', alpha2: 'ng', capital: 'Abuja', continent: 'África', pop: 223.8, mil: 410, gdp: 470, era: 'Digital', ideology: 'República', color: '#22c55e' },
  'South Africa': { ptName: 'África do Sul', alpha2: 'za', capital: 'Pretória', continent: 'África', pop: 60.4, mil: 410, gdp: 380, era: 'Digital', ideology: 'República', color: '#0ea5e9' },
  'Dem. Rep. Congo': { ptName: 'R. D. do Congo', alpha2: 'cd', capital: 'Kinshasa', continent: 'África', pop: 102.2, mil: 310, gdp: 66, era: 'Industrial', ideology: 'República', color: '#8b5cf6' },
  'Sudan': { ptName: 'Sudão', alpha2: 'sd', capital: 'Cartum', continent: 'África', pop: 48.1, mil: 290, gdp: 31, era: 'Industrial', ideology: 'Militarismo' },
  'S. Sudan': { ptName: 'Sudão do Sul', alpha2: 'ss', capital: 'Juba', continent: 'África', pop: 11.1, mil: 180, gdp: 6, era: 'Industrial', ideology: 'República' },
  'Ethiopia': { ptName: 'Etiópia', alpha2: 'et', capital: 'Adis Abeba', continent: 'África', pop: 126.5, mil: 420, gdp: 163, era: 'Digital', ideology: 'República', color: '#84cc16' },
  'Kenya': { ptName: 'Quênia', alpha2: 'ke', capital: 'Nairóbi', continent: 'África', pop: 55.1, mil: 310, gdp: 107, era: 'Digital', ideology: 'República' },
  'Tanzania': { ptName: 'Tanzânia', alpha2: 'tz', capital: 'Dodoma', continent: 'África', pop: 67.4, mil: 280, gdp: 79, era: 'Digital', ideology: 'República' },
  'Angola': { ptName: 'Angola', alpha2: 'ao', capital: 'Luanda', continent: 'África', pop: 36.7, mil: 330, gdp: 84, era: 'Digital', ideology: 'República', color: '#dc2626' },
  'Mozambique': { ptName: 'Moçambique', alpha2: 'mz', capital: 'Maputo', continent: 'África', pop: 33.9, mil: 230, gdp: 20, era: 'Digital', ideology: 'República', color: '#059669' },
  'Mali': { ptName: 'Mali', alpha2: 'ml', capital: 'Bamako', continent: 'África', pop: 23.3, mil: 210, gdp: 20, era: 'Industrial', ideology: 'Militarismo' },
  'Niger': { ptName: 'Níger', alpha2: 'ne', capital: 'Niamey', continent: 'África', pop: 27.2, mil: 190, gdp: 16, era: 'Industrial', ideology: 'Militarismo' },
  'Chad': { ptName: 'Chade', alpha2: 'td', capital: 'N\'Djamena', continent: 'África', pop: 18.3, mil: 210, gdp: 13, era: 'Industrial', ideology: 'Militarismo' },
  'Mauritania': { ptName: 'Mauritânia', alpha2: 'mr', capital: 'Nouakchott', continent: 'África', pop: 4.8, mil: 160, gdp: 10, era: 'Industrial', ideology: 'República' },
  'Senegal': { ptName: 'Senegal', alpha2: 'sn', capital: 'Dacar', continent: 'África', pop: 17.7, mil: 210, gdp: 31, era: 'Digital', ideology: 'República' },
  'Ghana': { ptName: 'Gana', alpha2: 'gh', capital: 'Acra', continent: 'África', pop: 34.1, mil: 240, gdp: 76, era: 'Digital', ideology: 'Democracia' },
  'Côte d\'Ivoire': { ptName: 'Costa do Marfim', alpha2: 'ci', capital: 'Yamoussoukro', continent: 'África', pop: 28.9, mil: 220, gdp: 78, era: 'Digital', ideology: 'República' },
  'Cameroon': { ptName: 'Camarões', alpha2: 'cm', capital: 'Yaoundé', continent: 'África', pop: 28.6, mil: 230, gdp: 48, era: 'Digital', ideology: 'República' },
  'Central African Rep.': { ptName: 'Rep. Centro-Africana', alpha2: 'cf', capital: 'Bangui', continent: 'África', pop: 5.7, mil: 120, gdp: 2.5, era: 'Industrial', ideology: 'República' },
  'Congo': { ptName: 'Rep. do Congo', alpha2: 'cg', capital: 'Brazzaville', continent: 'África', pop: 6.1, mil: 150, gdp: 15, era: 'Digital', ideology: 'República' },
  'Gabon': { ptName: 'Gabão', alpha2: 'ga', capital: 'Libreville', continent: 'África', pop: 2.4, mil: 140, gdp: 21, era: 'Digital', ideology: 'República' },
  'Namibia': { ptName: 'Namíbia', alpha2: 'na', capital: 'Windhoek', continent: 'África', pop: 2.6, mil: 160, gdp: 12, era: 'Digital', ideology: 'República' },
  'Botswana': { ptName: 'Botsuana', alpha2: 'bw', capital: 'Gaborone', continent: 'África', pop: 2.6, mil: 180, gdp: 20, era: 'Digital', ideology: 'Democracia' },
  'Zimbabwe': { ptName: 'Zimbábue', alpha2: 'zw', capital: 'Harare', continent: 'África', pop: 16.6, mil: 200, gdp: 26, era: 'Digital', ideology: 'República' },
  'Zambia': { ptName: 'Zâmbia', alpha2: 'zm', capital: 'Lusaka', continent: 'África', pop: 20.5, mil: 200, gdp: 28, era: 'Digital', ideology: 'República' },
  'Madagascar': { ptName: 'Madagascar', alpha2: 'mg', capital: 'Antananarivo', continent: 'África', pop: 30.3, mil: 180, gdp: 16, era: 'Industrial', ideology: 'República' },
  'Somalia': { ptName: 'Somália', alpha2: 'so', capital: 'Mogadíscio', continent: 'África', pop: 18.1, mil: 170, gdp: 11, era: 'Industrial', ideology: 'República' },
  'Somaliland': { ptName: 'Somalilândia', alpha2: 'so', capital: 'Hargeisa', continent: 'África', pop: 4.5, mil: 120, gdp: 3, era: 'Industrial', ideology: 'República' },
  'Uganda': { ptName: 'Uganda', alpha2: 'ug', capital: 'Campala', continent: 'África', pop: 48.5, mil: 250, gdp: 49, era: 'Digital', ideology: 'República' },
  'Guinea': { ptName: 'Guiné', alpha2: 'gn', capital: 'Conacri', continent: 'África', pop: 14.2, mil: 160, gdp: 23, era: 'Industrial', ideology: 'Militarismo' },
  'Burkina Faso': { ptName: 'Burkina Faso', alpha2: 'bf', capital: 'Ouagadougou', continent: 'África', pop: 23.2, mil: 170, gdp: 20, era: 'Industrial', ideology: 'Militarismo' },
  'Benin': { ptName: 'Benim', alpha2: 'bj', capital: 'Porto-Novo', continent: 'África', pop: 13.7, mil: 140, gdp: 19, era: 'Digital', ideology: 'República' },
  'Togo': { ptName: 'Togo', alpha2: 'tg', capital: 'Lomé', continent: 'África', pop: 9.0, mil: 130, gdp: 9, era: 'Digital', ideology: 'República' },
  'Sierra Leone': { ptName: 'Serra Leoa', alpha2: 'sl', capital: 'Freetown', continent: 'África', pop: 8.8, mil: 120, gdp: 4, era: 'Industrial', ideology: 'República' },
  'Liberia': { ptName: 'Libéria', alpha2: 'lr', capital: 'Monróvia', continent: 'África', pop: 5.4, mil: 110, gdp: 4, era: 'Industrial', ideology: 'República' },
  'Guinea-Bissau': { ptName: 'Guiné-Bissau', alpha2: 'gw', capital: 'Bissau', continent: 'África', pop: 2.1, mil: 100, gdp: 2, era: 'Industrial', ideology: 'República' },
  'Gambia': { ptName: 'Gâmbia', alpha2: 'gm', capital: 'Banjul', continent: 'África', pop: 2.7, mil: 90, gdp: 2, era: 'Industrial', ideology: 'República' },
  'Eq. Guinea': { ptName: 'Guiné Equatorial', alpha2: 'gq', capital: 'Malabo', continent: 'África', pop: 1.7, mil: 120, gdp: 12, era: 'Digital', ideology: 'República' },
  'Malawi': { ptName: 'Malaui', alpha2: 'mw', capital: 'Lilongwe', continent: 'África', pop: 20.9, mil: 150, gdp: 14, era: 'Industrial', ideology: 'República' },
  'Rwanda': { ptName: 'Ruanda', alpha2: 'rw', capital: 'Kigali', continent: 'África', pop: 14.0, mil: 210, gdp: 14, era: 'Digital', ideology: 'República' },
  'Burundi': { ptName: 'Burundi', alpha2: 'bi', capital: 'Gitega', continent: 'África', pop: 13.2, mil: 130, gdp: 3, era: 'Industrial', ideology: 'República' },
  'Eritrea': { ptName: 'Eritreia', alpha2: 'er', capital: 'Asmara', continent: 'África', pop: 3.7, mil: 200, gdp: 2.5, era: 'Industrial', ideology: 'Militarismo' },
  'Djibouti': { ptName: 'Djibuti', alpha2: 'dj', capital: 'Djibuti', continent: 'África', pop: 1.1, mil: 120, gdp: 4, era: 'Digital', ideology: 'República' },
  'Lesotho': { ptName: 'Lesoto', alpha2: 'ls', capital: 'Maseru', continent: 'África', pop: 2.3, mil: 90, gdp: 2.5, era: 'Industrial', ideology: 'Monarquia' },
  'eSwatini': { ptName: 'Essuatíni', alpha2: 'sz', capital: 'Mbabane', continent: 'África', pop: 1.2, mil: 90, gdp: 4.8, era: 'Industrial', ideology: 'Monarquia' },

  // Oceania & Antártida
  'Australia': {
    ptName: 'Austrália', alpha2: 'au', capital: 'Camberra', continent: 'Oceania',
    pop: 26.6, mil: 510, gdp: 1720, era: 'Digital', ideology: 'Democracia', color: '#0284c7',
    states: ['Nova Gales do Sul', 'Vitória', 'Queensland', 'Austrália Ocidental', 'Tasmânia'],
  },
  'New Zealand': {
    ptName: 'Nova Zelândia', alpha2: 'nz', capital: 'Wellington', continent: 'Oceania',
    pop: 5.2, mil: 210, gdp: 250, era: 'Digital', ideology: 'Democracia', color: '#14b8a6',
    states: ['Ilha do Norte', 'Ilha do Sul', 'Wellington'],
  },
  'Papua New Guinea': { ptName: 'Papua-Nova Guiné', alpha2: 'pg', capital: 'Port Moresby', continent: 'Oceania', pop: 10.3, mil: 140, gdp: 31, era: 'Industrial', ideology: 'Democracia' },
  'Fiji': { ptName: 'Fiji', alpha2: 'fj', capital: 'Suva', continent: 'Oceania', pop: 0.9, mil: 90, gdp: 5, era: 'Digital', ideology: 'República' },
  'Solomon Is.': { ptName: 'Ilhas Salomão', alpha2: 'sb', capital: 'Honiara', continent: 'Oceania', pop: 0.7, mil: 60, gdp: 1.6, era: 'Industrial', ideology: 'Democracia' },
  'Vanuatu': { ptName: 'Vanuatu', alpha2: 'vu', capital: 'Port Vila', continent: 'Oceania', pop: 0.3, mil: 50, gdp: 1, era: 'Industrial', ideology: 'República' },
  'New Caledonia': { ptName: 'Nova Caledônia', alpha2: 'nc', capital: 'Nouméa', continent: 'Oceania', pop: 0.3, mil: 70, gdp: 10, era: 'Digital', ideology: 'Democracia' },
  'Antarctica': { ptName: 'Antártida', alpha2: 'aq', capital: 'Base Polar Internacional', continent: 'Oceania', pop: 0.005, mil: 40, gdp: 0, era: 'Futurista', ideology: 'Democracia', color: '#e2e8f0' },
  'Fr. S. Antarctic Lands': { ptName: 'Terras Austrais', alpha2: 'tf', capital: 'Port-aux-Français', continent: 'Oceania', pop: 0.001, mil: 20, gdp: 0, era: 'Digital', ideology: 'Democracia', color: '#cbd5e1' },
};

// Balanced, vibrant political atlas palette so neighboring nations always stand out crisply
const ATLAS_PALETTE = [
  '#4ade80', // emerald-400
  '#60a5fa', // blue-400
  '#fbbf24', // amber-400
  '#f87171', // red-400
  '#a78bfa', // violet-400
  '#2dd4bf', // teal-400
  '#fb923c', // orange-400
  '#f472b6', // pink-400
  '#a3e635', // lime-400
  '#38bdf8', // sky-400
  '#c084fc', // purple-400
  '#e879f9', // fuchsia-400
];

export const WORLD_GEOJSON: FeatureCollection<Geometry> = topojson.feature(
  worldAtlas as unknown as Parameters<typeof topojson.feature>[0],
  (worldAtlas as unknown as { objects: { countries: Parameters<typeof topojson.feature>[1] } }).objects.countries
) as unknown as FeatureCollection<Geometry>;

export function buildInitialWorldCountries(): Country[] {
  const result: Country[] = [];

  WORLD_GEOJSON.features.forEach((feature, idx) => {
    const rawName = (feature.properties as { name?: string })?.name || `Território ${idx + 1}`;
    const meta = COUNTRY_META[rawName];
    const numericId = idx + 1; // 1..177 guaranteed unique

    const ptName = meta?.ptName || rawName;
    const alpha2 = meta?.alpha2 || 'un';
    const color = meta?.color || ATLAS_PALETTE[(idx * 7 + 3) % ATLAS_PALETTE.length];

    result.push({
      id: `${alpha2.toUpperCase()}_${numericId}`,
      numericId,
      isoNumeric: feature.id ? String(feature.id) : undefined,
      isoAlpha2: alpha2,
      name: ptName,
      originalName: rawName,
      capital: meta?.capital || 'Capital Nacional',
      continent: meta?.continent || 'Ásia',
      color,
      flag: {
        type: meta?.alpha2 ? 'iso' : 'custom',
        value: alpha2,
        customProps: !meta?.alpha2
          ? {
              layout: 'horizontal',
              colors: [color, '#ffffff', '#0f172a'],
              emblem: 'star',
              emblemColor: '#fbbf24',
            }
          : undefined,
      },
      population: meta?.pop ?? 8.5,
      militaryPower: meta?.mil ?? 180,
      gdp: meta?.gdp ?? 45,
      techEra: meta?.era ?? 'Digital',
      techProgress: 25 + ((idx * 17) % 60),
      ideology: meta?.ideology ?? 'República',
      empireId: null,
      allies: [],
      enemies: [],
      decrees: meta?.decrees || ['Constituição Nacional', 'Desenvolvimento Regional'],
      territoryCells: 0,
      states:
        REAL_COUNTRY_STATES[rawName]?.map((s) => s.name) ||
        meta?.states ||
        ['Região Norte', 'Região Central', 'Região Sul'],
      normX: 0.5,
      normY: 0.5,
      centerX: 700,
      centerY: 350,
    });
  });

  return result;
}

export const INITIAL_COUNTRIES: Country[] = buildInitialWorldCountries();

export const STATE_PALETTE = [
  '#34d399', '#60a5fa', '#fbbf24', '#f87171', '#a78bfa',
  '#2dd4bf', '#fb923c', '#f472b6', '#a3e635', '#38bdf8',
  '#c084fc', '#e879f9', '#4ade80', '#facc15', '#818cf8',
];

export interface OceanLabel {
  name: string;
  normX: number;
  normY: number;
}

export const OCEAN_LABELS: OceanLabel[] = [
  { name: 'OCEANO ÁRTICO', normX: 0.50, normY: 0.05 },
  { name: 'OCEANO ATLÂNTICO NORTE', normX: 0.37, normY: 0.32 },
  { name: 'OCEANO ATLÂNTICO SUL', normX: 0.45, normY: 0.67 },
  { name: 'OCEANO PACÍFICO NORTE', normX: 0.13, normY: 0.34 },
  { name: 'OCEANO PACÍFICO SUL', normX: 0.17, normY: 0.65 },
  { name: 'OCEANO PACÍFICO', normX: 0.94, normY: 0.38 },
  { name: 'OCEANO ÍNDICO', normX: 0.69, normY: 0.63 },
  { name: 'OCEANO ANTÁRTICO', normX: 0.50, normY: 0.84 },
];

