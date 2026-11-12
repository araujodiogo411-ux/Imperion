export type Continent =
  | 'América do Sul'
  | 'América do Norte'
  | 'Europa'
  | 'Ásia'
  | 'África'
  | 'Oceania';

export type TechEra = 'Industrial' | 'Atômica' | 'Digital' | 'Futurista';

export type Ideology =
  | 'Democracia'
  | 'República'
  | 'Império'
  | 'Monarquia'
  | 'Militarismo'
  | 'Socialismo'
  | 'Comunismo';

export interface FlagCustomProps {
  layout: 'horizontal' | 'vertical' | 'cross' | 'saltire' | 'canton' | 'solid';
  colors: string[];
  emblem?: 'star' | 'sun' | 'eagle' | 'shield' | 'crescent' | 'crown' | 'sword' | 'circle' | 'lion' | 'none';
  emblemColor?: string;
}

export interface FlagData {
  type: 'iso' | 'emoji' | 'svg' | 'custom' | 'upload';
  value: string;
  customProps?: FlagCustomProps;
}

export interface FormerCountryInfo {
  name: string;
  capital: string;
  color: string;
  flag: FlagData;
  ideology: Ideology;
  originCountryId?: string;
  originCountryName?: string;
}

export interface StateTerritory {
  id: string;
  numericId: number; // 1..65535 for stateOwner grid
  countryId: string;
  name: string;
  capitalCity: string;
  color: string;
  centerX: number;
  centerY: number;
  territoryCells: number;
  formerCountryData?: FormerCountryInfo;
}

export interface StateWar {
  id: string;
  countryId: string;
  name: string;
  attackerStateId: string;
  defenderStateId: string;
  startYear: number;
  startDay: number;
  casualties: {
    attackers: number;
    defenders: number;
  };
}

export interface City {
  id: string;
  name: string;
  countryId: string;
  stateId?: string;
  x: number; // grid X
  y: number; // grid Y
  isNationalCapital?: boolean;
  isStateCapital?: boolean;
}

export interface Country {
  id: string;
  numericId: number;
  isoNumeric?: string;
  isoAlpha2?: string;
  name: string;
  originalName: string;
  capital: string;
  capitalX?: number;
  capitalY?: number;
  continent: Continent;
  color: string;
  flag: FlagData;
  population: number;
  militaryPower: number;
  gdp: number;
  techEra: TechEra;
  techProgress: number;
  ideology: Ideology;
  empireId: string | null;
  allies: string[];
  enemies: string[];
  decrees: string[];
  territoryCells: number;
  states: string[];
  isCustom?: boolean;
  hasCustomTerritory?: boolean;
  originCountryId?: string;
  originCountryName?: string;
  originStateName?: string;
  originStateCapital?: string;
  originStateColor?: string;
  createdAtYear?: number;
  normX: number;
  normY: number;
  centerX: number;
  centerY: number;
}

export interface Empire {
  id: string;
  name: string;
  emperorTitle: string;
  capital: string;
  color: string;
  flag: FlagData;
  memberIds: string[];
  formedAtYear: number;
  ideology: Ideology;
  savedOwnership?: {
    indices: number[];
    owners: number[];
    memberSnapshots: {
      id: string;
      name: string;
      capital: string;
      color: string;
      ideology: Ideology;
      flag: FlagData;
    }[];
  };
}

export interface War {
  id: string;
  name: string;
  attackers: string[];
  defenders: string[];
  startYear: number;
  startDay: number;
  casualties: {
    attackers: number;
    defenders: number;
  };
  isWorldWar: boolean;
  annexationGoal?: {
    aggressorId: string;
    targetId: string;
    targetInitialCells: number;
  };
}

export interface PastWarRecord {
  id: string;
  name: string;
  attackers: string[];
  defenders: string[];
  isWorldWar: boolean;
}

export interface Alliance {
  id: string;
  name: string;
  memberIds: string[];
  color: string;
}

export interface SimEvent {
  id: string;
  type: 'war' | 'peace' | 'empire' | 'cut' | 'alliance' | 'tech' | 'crisis' | 'diplomacy';
  title: string;
  description: string;
  date: string;
  countryId?: string;
}

export type GameTool =
  | 'select'
  | 'scissors'
  | 'states'
  | 'pencil'
  | 'land'
  | 'water_shallow'
  | 'water_deep'
  | 'river'
  | 'empire'
  | 'war'
  | 'peace'
  | 'alliance';
