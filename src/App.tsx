import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Country,
  Empire,
  War,
  PastWarRecord,
  Alliance,
  GameTool,
  SimEvent,
  StateTerritory,
  City,
  Ideology,
  StateWar,
  FlagData,
} from './types/game';
import { INITIAL_COUNTRIES, STATE_PALETTE } from './data/worldCountries';
import { getRealStateFlag } from './data/stateFlags';
import { WorldMapEngine, CutResult, StateCutResult } from './utils/mapEngine';
import { sound } from './utils/audio';

import { WorldCanvas } from './components/WorldCanvas';
import { TopBar } from './components/TopBar';
import { Toolbar } from './components/Toolbar';
import { BrushPalette } from './components/BrushPalette';
import { StatePalette, StateInteractionMode } from './components/StatePalette';
import { CountryDrawer } from './components/CountryDrawer';
import { FlagStudioModal } from './components/FlagStudioModal';
import { NewCountryModal } from './components/NewCountryModal';
import { NewStateCutModal } from './components/NewStateCutModal';
import { EmpireModal } from './components/EmpireModal';
import { WarModal } from './components/WarModal';
import { DiplomacyModal } from './components/DiplomacyModal';
import { EventsLog } from './components/EventsLog';

import { ChevronUp } from 'lucide-react';

export default function App() {
  const engine = useMemo(() => new WorldMapEngine(), []);

  const [countries, setCountries] = useState<Country[]>(() =>
    INITIAL_COUNTRIES.map((c) => ({ ...c }))
  );
  const [empires, setEmpires] = useState<Empire[]>([]);
  const [states, setStates] = useState<StateTerritory[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [activeWars, setActiveWars] = useState<War[]>([]);
  const [pastWars, setPastWars] = useState<PastWarRecord[]>([]);
  const [stateWars, setStateWars] = useState<StateWar[]>([]);
  const [alliances, setAlliances] = useState<Alliance[]>([]);

  // Simulation Time & Controls
  const [year, setYear] = useState(2026);
  const [day, setDay] = useState(1);
  const [simSpeed, setSimSpeed] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [dayNightAngle, setDayNightAngle] = useState(45);
  const [showDayNight, setShowDayNight] = useState(false);
  const [showAllStates, setShowAllStates] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [aiAutonomy, setAiAutonomy] = useState(true);

  // Active Tool & Brush Settings
  const [currentTool, setCurrentTool] = useState<GameTool>('select');
  const [brushRadius, setBrushRadius] = useState<number>(12);
  const [brushStyle, setBrushStyle] = useState<'solid' | 'organic'>('organic');
  const [brushAction, setBrushAction] = useState<'paint' | 'erase'>('paint');
  const [paintOverWater, setPaintOverWater] = useState<boolean>(false);
  const [isEyedropperActive, setIsEyedropperActive] = useState<boolean>(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  // States & Cities Editing Controls
  const [selectedState, setSelectedState] = useState<StateTerritory | null>(null);
  const [stateInteractionMode, setStateInteractionMode] =
    useState<StateInteractionMode>('paint_state');
  const [pendingCityName, setPendingCityName] = useState('Nova Cidade');
  const [pendingCityIsStateCap, setPendingCityIsStateCap] = useState(false);

  // Modals
  const [isNewCountryModalOpen, setIsNewCountryModalOpen] = useState(false);
  const [pendingCutInfo, setPendingCutInfo] = useState<CutResult | null>(null);
  const [isNewStateCutModalOpen, setIsNewStateCutModalOpen] = useState(false);
  const [pendingStateCutInfo, setPendingStateCutInfo] = useState<StateCutResult | null>(null);

  const [isEmpireModalOpen, setIsEmpireModalOpen] = useState(false);
  const [isWarModalOpen, setIsWarModalOpen] = useState(false);
  const [isDiplomacyModalOpen, setIsDiplomacyModalOpen] = useState(false);
  const [diplomacyMode, setDiplomacyMode] = useState<'alliance' | 'peace'>('alliance');

  const [isFlagStudioOpen, setIsFlagStudioOpen] = useState(false);
  const [flagStudioCountry, setFlagStudioCountry] = useState<Country | null>(null);
  const [flagStudioState, setFlagStudioState] = useState<StateTerritory | null>(null);
  const [isEventsLogOpen, setIsEventsLogOpen] = useState(false);

  const [events, setEvents] = useState<SimEvent[]>([
    {
      id: 'EVT_INIT_1',
      type: 'diplomacy',
      title: 'Mapa Mundial Real Inicializado',
      description: 'Todas as 177 nações com fronteiras e bandeiras oficiais estão prontas no mapa.',
      date: 'Ano 2026 · Dia 1',
    },
  ]);

  const latestEvent = events[0];

  // Refs for stable simulation loop without resetting intervals
  const countriesRef = useRef(countries);
  const empiresRef = useRef(empires);
  const statesRef = useRef(states);
  const citiesRef = useRef(cities);
  const activeWarsRef = useRef(activeWars);
  const stateWarsRef = useRef(stateWars);
  const alliancesRef = useRef(alliances);
  const aiAutonomyRef = useRef(aiAutonomy);
  const yearRef = useRef(year);
  const dayRef = useRef(day);
  const colonyLogTickRef = useRef(0);
  const popMilestoneRef = useRef(new Map<string, number>());

  useEffect(() => {
    countriesRef.current = countries;
  }, [countries]);

  useEffect(() => {
    alliancesRef.current = alliances;
  }, [alliances]);

  useEffect(() => {
    empiresRef.current = empires;
  }, [empires]);

  useEffect(() => {
    statesRef.current = states;
  }, [states]);

  useEffect(() => {
    citiesRef.current = cities;
  }, [cities]);

  useEffect(() => {
    activeWarsRef.current = activeWars;
  }, [activeWars]);

  useEffect(() => {
    stateWarsRef.current = stateWars;
  }, [stateWars]);

  useEffect(() => {
    aiAutonomyRef.current = aiAutonomy;
  }, [aiAutonomy]);

  useEffect(() => {
    yearRef.current = year;
  }, [year]);

  useEffect(() => {
    dayRef.current = day;
  }, [day]);

  // Initialize GeoJSON real world map once on mount
  const isInitializedRef = useRef(false);
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      engine.initializeFromGeoJSON(countriesRef.current, empiresRef.current, statesRef.current);
      setCountries([...countriesRef.current]);
      const bra = countriesRef.current.find((c) => c.isoAlpha2 === 'br');
      if (bra) setSelectedCountry(bra);
    }
  }, [engine]);

  const addEvent = useCallback((event: Omit<SimEvent, 'id' | 'date'>) => {
    const newEvt: SimEvent = {
      ...event,
      id: `EVT_${Date.now()}_${Math.random()}`,
      date: `Ano ${yearRef.current} · Dia ${dayRef.current}`,
    };
    setEvents((prev) => [newEvt, ...prev.slice(0, 49)]);
  }, []);

  const ensureStatesForCountry = useCallback(
    (
      country: Country,
      activateOverlay: boolean = true,
      syncSelection: boolean = true
    ): StateTerritory[] => {
      const nextNumId =
        statesRef.current.reduce((max, s) => Math.max(max, s.numericId), 0) + 1;
      const created = engine.ensureCountryStatesInitialized(
        country,
        statesRef.current,
        nextNumId
      );
      let nextStates = statesRef.current;
      if (created.length > 0) {
        nextStates = [...statesRef.current, ...created];
        statesRef.current = nextStates;
        setStates(nextStates);
      }

      const countryStates = nextStates.filter((s) => s.countryId === country.id);

      if (syncSelection) {
        if (countryStates.length > 0) {
          setSelectedState((prev) =>
            prev && prev.countryId === country.id ? prev : countryStates[0]
          );
        } else {
          setSelectedState(null);
        }

        engine.selectedCountryNumId = country.numericId;
        engine.activeStateViewCountryNumId = activateOverlay ? country.numericId : null;
        engine.refreshFullBuffer(countriesRef.current, empiresRef.current, nextStates);
      } else if (created.length > 0) {
        engine.updateStateColorCache(nextStates);
      }

      return countryStates;
    },
    [engine]
  );

  // Sync map state overlay when entering/leaving 'states' tool or selecting any country!
  useEffect(() => {
    if (!engine.isInitialized) return;
    if (selectedCountry) {
      ensureStatesForCountry(selectedCountry, currentTool === 'states');
    } else {
      engine.selectedCountryNumId = null;
      engine.activeStateViewCountryNumId = null;
      engine.refreshFullBuffer(countriesRef.current, empiresRef.current, statesRef.current);
    }
  }, [currentTool, selectedCountry?.id, engine, ensureStatesForCountry]);

  const handleToggleShowAllStates = useCallback(() => {
    const next = !showAllStates;
    if (next) {
      let accStates = [...statesRef.current];
      let nextNumId = accStates.reduce((max, s) => Math.max(max, s.numericId), 0) + 1;
      let added = false;

      for (const c of countriesRef.current) {
        if (c.territoryCells <= 0) continue;
        if (!accStates.some((s) => s.countryId === c.id)) {
          const created = engine.ensureCountryStatesInitialized(c, accStates, nextNumId);
          if (created.length > 0) {
            accStates = [...accStates, ...created];
            nextNumId += created.length;
            added = true;
          }
        }
      }
      if (added) {
        statesRef.current = accStates;
        setStates(accStates);
      }
    }

    engine.showAllStatesOnMap = next;
    engine.refreshFullBuffer(countriesRef.current, empiresRef.current, statesRef.current);
    setShowAllStates(next);
  }, [showAllStates, engine]);

  const expandSidesWithAlliances = useCallback(
    (initialAttackers: string[], initialDefenders: string[]) => {
      const attSet = new Set(initialAttackers);
      const defSet = new Set(initialDefenders);
      const joinedAttackers: string[] = [];
      const joinedDefenders: string[] = [];
      const activeIds = new Set(
        countriesRef.current.filter((c) => c.territoryCells > 0).map((c) => c.id)
      );

      let changed = true;
      while (changed) {
        changed = false;
        for (const alliance of alliancesRef.current) {
          const members = alliance.memberIds.filter((id) => activeIds.has(id));
          const hasAtt = members.some((id) => attSet.has(id));
          const hasDef = members.some((id) => defSet.has(id));

          if (hasDef && !hasAtt) {
            for (const m of members) {
              if (!defSet.has(m) && !attSet.has(m)) {
                defSet.add(m);
                joinedDefenders.push(m);
                changed = true;
              }
            }
          } else if (hasAtt && !hasDef) {
            for (const m of members) {
              if (!attSet.has(m) && !defSet.has(m)) {
                attSet.add(m);
                joinedAttackers.push(m);
                changed = true;
              }
            }
          }
        }
      }

      return {
        attackers: Array.from(attSet),
        defenders: Array.from(defSet),
        joinedAttackers,
        joinedDefenders,
      };
    },
    []
  );

  const handleTerritoryUpdated = useCallback(() => {
    const relocs = engine.recalculateTerritoryCounts(countriesRef.current, statesRef.current);
    engine.recalculateStateCounts(statesRef.current);
    setCountries([...countriesRef.current]);
    if (statesRef.current.length > 0) {
      setStates([...statesRef.current]);
    }
    relocs.forEach((r) => {
      addEvent({
        type: 'diplomacy',
        title: `Nova Capital de ${r.countryName}: ${r.newCapital}`,
        description: `Após perder ${r.oldCapital}, ${r.countryName} transferiu sua capital para ${r.newCapital}.`,
        countryId: r.countryId,
      });
    });
  }, [engine, addEvent]);

  const handleStateUpdated = useCallback(() => {
    engine.recalculateStateCounts(statesRef.current);
    setStates([...statesRef.current]);
  }, [engine]);

  // Fast War & State-War Simulation Loop (rapid clashes & frontline territory shifts)
  useEffect(() => {
    if (isPaused) return;

    const warIntervalMs = Math.max(55, 160 / simSpeed);
    let warCycles = 0;
    const warInterval = setInterval(() => {
      warCycles++;
      if (activeWarsRef.current.length > 0) {
        engine.simulateWarTick(
          activeWarsRef.current,
          countriesRef.current,
          empiresRef.current,
          statesRef.current
        );
        const relocs = engine.recalculateTerritoryCounts(countriesRef.current, statesRef.current);
        relocs.forEach((r) => {
          addEvent({
            type: 'war',
            title: `Capital Transferida em ${r.countryName}: ${r.newCapital}`,
            description: `${r.oldCapital} foi ocupada; ${r.countryName} estabeleceu sua nova sede em ${r.newCapital}.`,
            countryId: r.countryId,
          });
        });

        // Check war annexation goals & state-specific conquest goals
        const remainingWars = [...activeWarsRef.current];
        let annexedAny = false;

        for (let i = remainingWars.length - 1; i >= 0; i--) {
          const w = remainingWars[i];
          if (w.targetState) {
            const targetSt = statesRef.current.find((s) => s.id === w.targetState!.stateId);
            if (!targetSt || targetSt.territoryCells === 0) {
              remainingWars.splice(i, 1);
              engine.soldiers = engine.soldiers.filter((s) => s.warId !== w.id);
              annexedAny = true;
              sound.playImperialFanfare();
              addEvent({
                type: 'war',
                title: `Estado ${w.targetState.stateName} conquistado!`,
                description: `O conflito específico por ${w.targetState.stateName} foi concluído com ocupação total do estado.`,
              });
              continue;
            }
          }
          if (w.annexationGoal) {
            const victor = countriesRef.current.find(
              (c) => c.id === w.annexationGoal!.aggressorId
            );
            const target = countriesRef.current.find(
              (c) => c.id === w.annexationGoal!.targetId
            );
            const threshold = Math.max(
              4,
              Math.floor(w.annexationGoal.targetInitialCells * 0.3)
            );
            if (victor && target && target.territoryCells <= threshold) {
              const nextNumId =
                statesRef.current.reduce((m, s) => Math.max(m, s.numericId), 0) + 1;
              const newState = engine.absorbCountryAsState(
                victor,
                target,
                nextNumId,
                countriesRef.current,
                empiresRef.current,
                statesRef.current
              );
              const updatedStates = [...statesRef.current, newState];
              statesRef.current = updatedStates;
              setStates(updatedStates);
              if (!victor.states.includes(newState.name)) {
                victor.states = [...victor.states, newState.name];
              }
              remainingWars.splice(i, 1);
              annexedAny = true;
              sound.playImperialFanfare();
              addEvent({
                type: 'war',
                title: `${target.name} anexado como Estado de ${victor.name}!`,
                description: `Após vitória militar total, ${target.name} tornou-se um novo estado federado de ${victor.name}.`,
                countryId: victor.id,
              });
            }
          }
        }

        if (annexedAny) {
          activeWarsRef.current = remainingWars;
          setActiveWars(remainingWars);
          setCountries([...countriesRef.current]);
          setStates([...statesRef.current]);
        } else {
          setActiveWars([...activeWarsRef.current]);
          if (warCycles % 3 === 0) {
            setCountries([...countriesRef.current]);
            if (activeWarsRef.current.some((w) => w.targetState)) {
              setStates([...statesRef.current]);
            }
          }
        }
      }

      if (stateWarsRef.current.length > 0) {
        engine.simulateStateWarTick(
          stateWarsRef.current,
          countriesRef.current,
          empiresRef.current,
          statesRef.current
        );
        // Auto-finish state war if either state has 0 remaining cells
        const nextStateWars = stateWarsRef.current.filter((sw) => {
          const att = statesRef.current.find((s) => s.id === sw.attackerStateId);
          const def = statesRef.current.find((s) => s.id === sw.defenderStateId);
          if (!att || !def || att.territoryCells === 0 || def.territoryCells === 0) {
            engine.soldiers = engine.soldiers.filter((s) => s.warId !== sw.id);
            return false;
          }
          return true;
        });
        stateWarsRef.current = nextStateWars;
        setStateWars([...nextStateWars]);
        setStates([...statesRef.current]);
      }
    }, warIntervalMs);

    return () => clearInterval(warInterval);
  }, [isPaused, simSpeed, engine, addEvent]);

  // Calendar, Economy & Autonomous AI Simulation Loop
  useEffect(() => {
    if (isPaused) return;

    const intervalMs = Math.max(120, 450 / simSpeed);
    const interval = setInterval(() => {
      let nextDay = dayRef.current + 1;
      let nextYear = yearRef.current;
      if (nextDay > 365) {
        nextDay = 1;
        nextYear += 1;
        setYear(nextYear);
      }
      setDay(nextDay);

      setDayNightAngle((angle) => (angle + 0.8 * simSpeed) % 360);

      // 1. Neutral / Empty Land Automatic Colonization (every 2 sim days)
      if (nextDay % 2 === 0) {
        const colRes = engine.expandIntoNeutralLandTick(
          countriesRef.current,
          empiresRef.current,
          statesRef.current
        );
        if (colRes.changed) {
          for (const g of colRes.gains) {
            const cObj = countriesRef.current.find((c) => c.id === g.countryId);
            if (cObj && g.cells >= 3) {
              cObj.gdp = Math.round((cObj.gdp + g.cells * 0.08) * 10) / 10;
              cObj.population = Math.round((cObj.population + g.cells * 0.01) * 10) / 10;
            }
          }
          setCountries([...countriesRef.current]);
          if (nextDay - colonyLogTickRef.current >= 14 || colonyLogTickRef.current > nextDay) {
            const top = colRes.gains.slice().sort((a, b) => b.cells - a.cells)[0];
            const topCountry = top ? countriesRef.current.find((c) => c.id === top.countryId) : null;
            if (topCountry && top.cells >= 6) {
              colonyLogTickRef.current = nextDay;
              addEvent({
                type: 'diplomacy',
                title: `${topCountry.name} tomou posse de terras neutras`,
                description: `Expedições de ${topCountry.name} e nações vizinhas avançam sobre territórios livres no mapa.`,
                countryId: topCountry.id,
              });
            }
          }
        }
      }

      // 3. Natural Population & GDP Growth (especially visible for newly independent nations!)
      if (nextDay % 20 === 0) {
        const activeList = countriesRef.current.filter((c) => c.territoryCells > 0);
        let econChanged = false;
        for (const c of activeList) {
          const isNewInd = Boolean(c.originCountryId || c.isCustom);
          const growthChance = isNewInd ? 0.55 : 0.12;
          if (Math.random() < growthChance) {
            const popRate = isNewInd ? 0.045 : 0.008;
            const gdpRate = isNewInd ? 0.065 : 0.015;
            c.population = Math.round(c.population * (1 + popRate) * 10) / 10;
            c.gdp = Math.round(c.gdp * (1 + gdpRate) * 10) / 10;
            econChanged = true;

            const lastLoggedPop = popMilestoneRef.current.get(c.id) ?? c.population;
            if (isNewInd && c.population >= lastLoggedPop * 1.18 + 0.5) {
              popMilestoneRef.current.set(c.id, c.population);
              addEvent({
                type: 'diplomacy',
                title: `Crescimento em ${c.name}: Pop. ${c.population.toFixed(1)}M · PIB $${c.gdp.toLocaleString()} Bi`,
                description: `A recém-independente ${c.name} registrou forte expansão populacional e crescimento do PIB.`,
                countryId: c.id,
              });
            }
          }
        }
        if (econChanged) {
          setCountries([...countriesRef.current]);
        }
      }

      // 4. Dynamic Land Emergence & Coastal Submergence Over the Years
      if (aiAutonomyRef.current) {
        const landRoll = Math.random();
        if (landRoll < 0.0026 * simSpeed) {
          const spawned = engine.spawnDynamicLandmass(
            countriesRef.current,
            empiresRef.current,
            statesRef.current
          );
          if (spawned) {
            addEvent({
              type: 'diplomacy',
              title: spawned.nearCountry
                ? `Nova Terra Emergiu Próxima a ${spawned.nearCountry.name}!`
                : 'Nova Ilha Continental Emergiu no Oceano!',
              description: `Movimento tectônico formou ${spawned.cellsCreated} km² de terras neutras. Nações vizinhas já preparam ocupação.`,
              countryId: spawned.nearCountry?.id,
            });
          }
        } else if (landRoll < 0.005 * simSpeed) {
          const submerged = engine.submergeDynamicRegion(
            countriesRef.current,
            empiresRef.current,
            statesRef.current
          );
          if (submerged) {
            submerged.country.population = Math.max(
              0.2,
              Math.round((submerged.country.population - submerged.cellsLost * 0.04) * 10) / 10
            );
            submerged.country.gdp = Math.max(
              1,
              Math.round((submerged.country.gdp * 0.96) * 10) / 10
            );
            setCountries([...countriesRef.current]);
            addEvent({
              type: 'war',
              title: `Águas Submergem Região de ${submerged.country.name}!`,
              description: `Avanço oceânico engoliu ${submerged.cellsLost} km² de território de ${submerged.country.name}.`,
              countryId: submerged.country.id,
            });
          }
        }
      }

      // Periodic tech growth
      if (Math.random() < 0.22 * simSpeed) {
        const list = countriesRef.current.filter((c) => c.territoryCells > 0);
        if (list.length > 0) {
          const randomCountry = list[Math.floor(Math.random() * list.length)];
          randomCountry.techProgress = Math.min(
            100,
            randomCountry.techProgress + Math.floor(Math.random() * 4) + 1
          );

          if (randomCountry.techProgress >= 100 && randomCountry.techEra !== 'Futurista') {
            const nextEraMap: Record<Country['techEra'], Country['techEra']> = {
              Industrial: 'Atômica',
              Atômica: 'Digital',
              Digital: 'Futurista',
              Futurista: 'Futurista',
            };
            randomCountry.techEra = nextEraMap[randomCountry.techEra];
            randomCountry.techProgress = 0;
            addEvent({
              type: 'tech',
              title: `Revolução Tecnológica em ${randomCountry.name}!`,
              description: `${randomCountry.name} avançou para a Era ${randomCountry.techEra}.`,
              countryId: randomCountry.id,
            });
          }
        }
      }

      // Autonomous AI Decisions (Laws, Decrees, Ideologies, Territory Purchases, Alliances, Wars & Peace)
      if (aiAutonomyRef.current && Math.random() < 0.14 * simSpeed) {
        const activeCountries = countriesRef.current.filter((c) => c.territoryCells > 15);
        if (activeCountries.length >= 2) {
          const actor = activeCountries[Math.floor(Math.random() * activeCountries.length)];
          const roll = Math.random();

          if (roll < 0.36) {
            // Enact autonomous law / decree / policy
            const policyPool = [
              { name: 'Reforma Tributária Nacional', gdpMult: 1.03, milDelta: 0 },
              { name: 'Plano de Industrialização Acelerada', gdpMult: 1.04, milDelta: 4 },
              { name: 'Lei de Educação & Ciência Aberta', gdpMult: 1.02, milDelta: 0 },
              { name: 'Estatuto de Livre Comércio', gdpMult: 1.035, milDelta: 0 },
              { name: 'Doutrina de Defesa Fronteiriça', gdpMult: 0.99, milDelta: 12 },
              { name: 'Decreto de Modernização Militar', gdpMult: 0.995, milDelta: 16 },
              { name: 'Pacote de Infraestrutura Ferroviária', gdpMult: 1.03, milDelta: 2 },
            ];
            const chosen = policyPool[Math.floor(Math.random() * policyPool.length)];
            if (!actor.decrees.includes(chosen.name)) {
              actor.decrees = [...actor.decrees.slice(-7), chosen.name];
              actor.gdp = Math.max(1, Math.round(actor.gdp * chosen.gdpMult * 10) / 10);
              actor.militaryPower = Math.max(10, actor.militaryPower + chosen.milDelta);
              setCountries([...countriesRef.current]);
              addEvent({
                type: 'diplomacy',
                title: `${actor.name} promulgou lei: ${chosen.name}`,
                description: `O governo de ${actor.name} aprovou novas diretrizes econômicas e estratégicas.`,
                countryId: actor.id,
              });
            }
          } else if (roll < 0.46 && actor.gdp >= 400) {
            // Wealthy nation buys border territory from a neighbor
            const sellers = activeCountries.filter(
              (c) =>
                c.id !== actor.id &&
                c.continent === actor.continent &&
                c.territoryCells > 35 &&
                c.gdp < actor.gdp * 0.7 &&
                !activeWarsRef.current.some(
                  (w) =>
                    w.attackers.includes(actor.id) ||
                    w.defenders.includes(actor.id) ||
                    w.attackers.includes(c.id) ||
                    w.defenders.includes(c.id)
                )
            );
            if (sellers.length > 0) {
              const seller = sellers[Math.floor(Math.random() * sellers.length)];
              const price = Math.max(25, Math.min(Math.round(actor.gdp * 0.08), Math.round(seller.gdp * 0.12 + 20)));
              const res = engine.buyBorderTerritory(
                actor,
                seller,
                35,
                countriesRef.current,
                empiresRef.current,
                statesRef.current
              );
              if (res.transferredCells > 0) {
                actor.gdp = Math.max(1, Math.round((actor.gdp - price) * 10) / 10);
                seller.gdp = Math.round((seller.gdp + price) * 10) / 10;
                setCountries([...countriesRef.current]);
                addEvent({
                  type: 'diplomacy',
                  title: `${actor.name} comprou território de ${seller.name} por $${price} Bi`,
                  description: `Acordo econômico transferiu ${res.transferredCells} km² de fronteira para ${actor.name}.`,
                  countryId: actor.id,
                });
              }
            }
          } else if (roll < 0.56 && !actor.empireId) {
            // Autonomous political regime change across valid ideologies
            const allowedIdeologies: Ideology[] = [
              'Democracia',
              'República',
              'Monarquia',
              'Militarismo',
              'Socialismo',
              'Comunismo',
            ];
            const candidates = allowedIdeologies.filter((idg) => idg !== actor.ideology);
            const nextIdeology = candidates[Math.floor(Math.random() * candidates.length)];
            actor.ideology = nextIdeology;
            setCountries([...countriesRef.current]);
            addEvent({
              type: 'diplomacy',
              title: `Transição Política em ${actor.name}: ${nextIdeology}`,
              description: `${actor.name} adotou autonomamente o sistema ${nextIdeology}.`,
              countryId: actor.id,
            });
          } else if (roll < 0.76) {
            // Diplomatic treaty / trade / alliance announcement
            const partner = activeCountries[Math.floor(Math.random() * activeCountries.length)];
            if (partner.id !== actor.id) {
              addEvent({
                type: 'diplomacy',
                title: `Acordo Bilateral: ${actor.name} & ${partner.name}`,
                description: `${actor.name} e ${partner.name} assinaram tratado de cooperação comercial e consular.`,
                countryId: actor.id,
              });
            }
          } else if (roll < 0.89 && activeWarsRef.current.length < 3) {
            // Autonomous regional conflict between nations on same continent (with Alliance auto-join!)
            const sameCont = activeCountries.filter(
              (c) =>
                c.id !== actor.id &&
                c.continent === actor.continent &&
                !actor.empireId &&
                !c.empireId &&
                !activeWarsRef.current.some(
                  (w) =>
                    (w.attackers.includes(actor.id) && w.defenders.includes(c.id)) ||
                    (w.attackers.includes(c.id) && w.defenders.includes(actor.id))
                )
            );
            if (sameCont.length > 0) {
              const target = sameCont[Math.floor(Math.random() * sameCont.length)];
              const expanded = expandSidesWithAlliances([actor.id], [target.id]);
              const aiWar: War = {
                id: `WAR_AI_${Date.now()}`,
                name: `Conflito ${actor.name} vs ${target.name}`,
                attackers: expanded.attackers,
                defenders: expanded.defenders,
                startYear: nextYear,
                startDay: nextDay,
                casualties: { attackers: 0, defenders: 0 },
                isWorldWar: expanded.attackers.length + expanded.defenders.length >= 4,
              };
              const nextWars = [...activeWarsRef.current, aiWar];
              activeWarsRef.current = nextWars;
              setActiveWars(nextWars);
              const totalJoined = expanded.joinedAttackers.length + expanded.joinedDefenders.length;
              addEvent({
                type: 'war',
                title: `Guerra Autônoma: ${actor.name} x ${target.name}`,
                description:
                  totalJoined > 0
                    ? `Tensões escalaram e ${totalJoined} aliado(s) entraram automaticamente no conflito por pacto de defesa!`
                    : `Tensões diplomáticas escalaram e ${actor.name} declarou guerra a ${target.name}!`,
                countryId: actor.id,
              });
            }
          } else if (activeWarsRef.current.length > 0 && Math.random() < 0.35) {
            // Autonomous peace settlement on an older AI war
            const aiWar = activeWarsRef.current.find((w) => w.id.startsWith('WAR_AI_'));
            if (aiWar && aiWar.casualties.attackers + aiWar.casualties.defenders > 350) {
              const rem = activeWarsRef.current.filter((w) => w.id !== aiWar.id);
              activeWarsRef.current = rem;
              setActiveWars(rem);
              engine.soldiers = engine.soldiers.filter((s) => s.warId !== aiWar.id);
              addEvent({
                type: 'peace',
                title: `Armistício Assinado: ${aiWar.name}`,
                description: `As nações envolvidas concordaram em encerrar as hostilidades.`,
              });
            }
          }
        }
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isPaused, simSpeed, engine, addEvent, expandSidesWithAlliances]);

  const handleCutFinished = useCallback((cutResult: CutResult) => {
    setPendingCutInfo(cutResult);
    setIsNewCountryModalOpen(true);
  }, []);

  const handleConfirmNewCountry = (newCountry: Country) => {
    const enriched: Country = { ...newCountry };
    popMilestoneRef.current.set(enriched.id, enriched.population);
    const updated = [...countriesRef.current, enriched];
    countriesRef.current = updated;
    setCountries(updated);
    setSelectedCountry(enriched);
    engine.recalculateTerritoryCounts(updated, statesRef.current);
    engine.refreshFullBuffer(updated, empiresRef.current, statesRef.current);

    addEvent({
      type: 'cut',
      title: `Nova Nação Fundada: ${enriched.name}!`,
      description: `Um novo país soberano nasceu com capital em ${enriched.capital} (Pop. ${enriched.population}M · PIB $${enriched.gdp} Bi).`,
      countryId: enriched.id,
    });
  };

  const handleFormEmpire = (newEmpire: Empire) => {
    const savedOwnership = engine.captureEmpireSnapshot(
      newEmpire.memberIds,
      countriesRef.current
    );
    const empireWithSnap: Empire = { ...newEmpire, savedOwnership };

    const updatedEmpires = [...empiresRef.current, empireWithSnap];
    empiresRef.current = updatedEmpires;
    setEmpires(updatedEmpires);

    const updatedCountries = countriesRef.current.map((c) =>
      empireWithSnap.memberIds.includes(c.id) ? { ...c, empireId: empireWithSnap.id } : c
    );
    countriesRef.current = updatedCountries;
    setCountries(updatedCountries);
    if (selectedCountry && empireWithSnap.memberIds.includes(selectedCountry.id)) {
      setSelectedCountry({ ...selectedCountry, empireId: empireWithSnap.id });
    }
    engine.refreshFullBuffer(updatedCountries, updatedEmpires, statesRef.current);

    addEvent({
      type: 'empire',
      title: `Proclamação do ${empireWithSnap.name}!`,
      description: `${empireWithSnap.memberIds.length} países se uniram sob ${empireWithSnap.emperorTitle}.`,
    });
  };

  const handleDissolveEmpire = (empireId: string) => {
    const emp = empiresRef.current.find((e) => e.id === empireId);
    const updatedEmpires = empiresRef.current.filter((e) => e.id !== empireId);
    empiresRef.current = updatedEmpires;
    setEmpires(updatedEmpires);

    const snapshotMap = new Map(
      emp?.savedOwnership?.memberSnapshots.map((m) => [m.id, m]) || []
    );

    const updatedCountries = countriesRef.current.map((c) => {
      if (c.empireId !== empireId) return c;
      const snap = snapshotMap.get(c.id);
      return snap
        ? {
            ...c,
            empireId: null,
            name: snap.name,
            capital: snap.capital,
            color: snap.color,
            ideology: snap.ideology,
            flag: snap.flag,
          }
        : { ...c, empireId: null };
    });

    if (emp?.savedOwnership) {
      engine.restoreEmpireSnapshot(emp, updatedCountries, updatedEmpires, statesRef.current);
    } else {
      engine.recalculateTerritoryCounts(updatedCountries, statesRef.current);
      engine.refreshFullBuffer(updatedCountries, updatedEmpires, statesRef.current);
    }

    countriesRef.current = updatedCountries;
    setCountries(updatedCountries);
    if (selectedCountry?.empireId === empireId) {
      const refreshed = updatedCountries.find((c) => c.id === selectedCountry.id) || null;
      setSelectedCountry(refreshed);
    }

    if (emp) {
      addEvent({
        type: 'empire',
        title: `Império Desfeito: ${emp.name}`,
        description: `As fronteiras anteriores, bandeiras e governos originais foram restaurados.`,
      });
    }
  };

  const handleDeclareWar = (newWar: War) => {
    const expanded = expandSidesWithAlliances(newWar.attackers, newWar.defenders);
    const fullWar: War = {
      ...newWar,
      attackers: expanded.attackers,
      defenders: expanded.defenders,
      isWorldWar: expanded.attackers.length + expanded.defenders.length >= 4 || newWar.isWorldWar,
    };
    const nextWars = [...activeWarsRef.current, fullWar];
    activeWarsRef.current = nextWars;
    setActiveWars(nextWars);
    engine.simulateWarTick([fullWar], countriesRef.current, empiresRef.current, statesRef.current);
    engine.recalculateTerritoryCounts(countriesRef.current, statesRef.current);

    const joinedAllies = [...expanded.joinedAttackers, ...expanded.joinedDefenders]
      .map((id) => countriesRef.current.find((c) => c.id === id)?.name)
      .filter(Boolean);

    addEvent({
      type: 'war',
      title: `Guerra Declarada: ${fullWar.name}`,
      description:
        joinedAllies.length > 0
          ? `Aliados mobilizados pelo pacto de defesa mútua: ${joinedAllies.join(', ')}.`
          : 'Tropas mobilizadas nas frentes de combate. Custos militares impactam a economia.',
    });
  };

  const handleSignPeace = (warId: string) => {
    const war = activeWarsRef.current.find((w) => w.id === warId);
    const remaining = activeWarsRef.current.filter((w) => w.id !== warId);
    activeWarsRef.current = remaining;
    setActiveWars(remaining);
    engine.soldiers = engine.soldiers.filter((s) => s.warId !== warId);
    if (war) {
      sound.playPeaceChime();
      setPastWars((prev) => {
        if (prev.some((pw) => pw.name === war.name)) return prev;
        return [
          {
            id: `PAST_${war.id}`,
            name: war.name,
            attackers: war.attackers,
            defenders: war.defenders,
            isWorldWar: war.isWorldWar,
          },
          ...prev.slice(0, 19),
        ];
      });
      addEvent({
        type: 'peace',
        title: `Paz Assinada: ${war.name}`,
        description: `Armistício ratificado após ${
          war.casualties.attackers + war.casualties.defenders
        } baixas.`,
      });
    }
  };

  const handleReopenWar = (record: PastWarRecord) => {
    const newWar: War = {
      id: `WAR_${Date.now()}`,
      name: record.name,
      attackers: record.attackers,
      defenders: record.defenders,
      startYear: yearRef.current,
      startDay: dayRef.current,
      casualties: { attackers: 0, defenders: 0 },
      isWorldWar: record.isWorldWar,
    };
    const nextWars = [...activeWarsRef.current, newWar];
    activeWarsRef.current = nextWars;
    setActiveWars(nextWars);
    engine.simulateWarTick([newWar], countriesRef.current, empiresRef.current, statesRef.current);
    addEvent({
      type: 'war',
      title: `Guerra Retomada: ${record.name}`,
      description: 'O tratado de paz foi rompido e os combates recomeçaram na fronteira.',
    });
  };

  const handleDeclareWorldPeace = () => {
    const current = activeWarsRef.current;
    if (current.length > 0) {
      setPastWars((prev) => {
        const additions: PastWarRecord[] = current
          .filter((w) => !prev.some((pw) => pw.name === w.name))
          .map((w) => ({
            id: `PAST_${w.id}`,
            name: w.name,
            attackers: w.attackers,
            defenders: w.defenders,
            isWorldWar: w.isWorldWar,
          }));
        return [...additions, ...prev].slice(0, 20);
      });
    }
    activeWarsRef.current = [];
    setActiveWars([]);
    engine.soldiers = [];
    sound.playPeaceChime();
    addEvent({
      type: 'peace',
      title: 'Paz Mundial Ratificada!',
      description: 'Todas as guerras ativas foram encerradas por tratado global.',
    });
  };

  const handleCreateAlliance = (alliance: Alliance) => {
    const nextAlliances = [...alliancesRef.current, alliance];
    alliancesRef.current = nextAlliances;
    setAlliances(nextAlliances);

    // If any member of the new alliance is already in an active war, pull the other alliance members into that war!
    const pulledNotes: string[] = [];
    const updatedWars = activeWarsRef.current.map((w) => {
      const hasAtt = alliance.memberIds.some((id) => w.attackers.includes(id));
      const hasDef = alliance.memberIds.some((id) => w.defenders.includes(id));
      if (hasAtt && !hasDef) {
        const added = alliance.memberIds.filter((id) => !w.attackers.includes(id));
        if (added.length > 0) pulledNotes.push(`${w.name}`);
        return { ...w, attackers: [...w.attackers, ...added] };
      }
      if (hasDef && !hasAtt) {
        const added = alliance.memberIds.filter((id) => !w.defenders.includes(id));
        if (added.length > 0) pulledNotes.push(`${w.name}`);
        return { ...w, defenders: [...w.defenders, ...added] };
      }
      return w;
    });

    if (pulledNotes.length > 0) {
      activeWarsRef.current = updatedWars;
      setActiveWars(updatedWars);
      engine.simulateWarTick(updatedWars, countriesRef.current, empiresRef.current, statesRef.current);
    }

    addEvent({
      type: 'alliance',
      title: `Aliança Ratificada: ${alliance.name}`,
      description:
        pulledNotes.length > 0
          ? `${alliance.memberIds.length} nações firmaram pacto e entraram imediatamente em guerra ao lado dos aliados (${pulledNotes.join(', ')}).`
          : `${alliance.memberIds.length} nações formaram um pacto de defesa mútua (entram juntas em guerras).`,
    });
  };

  const handleRenameCountry = (countryId: string, newName: string) => {
    const updated = countriesRef.current.map((c) =>
      c.id === countryId ? { ...c, name: newName } : c
    );
    countriesRef.current = updated;
    setCountries(updated);
    if (selectedCountry?.id === countryId) {
      setSelectedCountry({ ...selectedCountry, name: newName });
    }
    addEvent({
      type: 'diplomacy',
      title: `Nação Renomeada para ${newName}`,
      description: `O nome oficial do país foi atualizado no mapa diplomático.`,
      countryId,
    });
  };

  const handleRenameCapital = (countryId: string, newCapital: string) => {
    const updated = countriesRef.current.map((c) =>
      c.id === countryId ? { ...c, capital: newCapital } : c
    );
    countriesRef.current = updated;
    setCountries(updated);
    if (selectedCountry?.id === countryId) {
      setSelectedCountry({ ...selectedCountry, capital: newCapital });
    }
    const target = updated.find((c) => c.id === countryId);
    if (target) {
      addEvent({
        type: 'diplomacy',
        title: `Capital de ${target.name} renomeada para ${newCapital}`,
        description: `O nome oficial da capital nacional foi atualizado sem alterar os estados.`,
        countryId,
      });
    }
  };

  const handleSetCapitalFromState = (country: Country, state: StateTerritory) => {
    const newCapitalName = state.capitalCity || state.name;
    const updated = countriesRef.current.map((c) =>
      c.id === country.id
        ? {
            ...c,
            capital: newCapitalName,
            capitalX: state.centerX,
            capitalY: state.centerY,
          }
        : c
    );
    countriesRef.current = updated;
    setCountries(updated);
    if (selectedCountry?.id === country.id) {
      setSelectedCountry({
        ...selectedCountry,
        capital: newCapitalName,
        capitalX: state.centerX,
        capitalY: state.centerY,
      });
    }
    addEvent({
      type: 'diplomacy',
      title: `${newCapitalName} é a nova Capital de ${country.name}!`,
      description: `A sede nacional de ${country.name} foi transferida para ${newCapitalName} (${state.name}).`,
      countryId: country.id,
    });
  };

  const handleChangePopulation = (countryId: string, newPopulationMillions: number) => {
    const target = countriesRef.current.find((c) => c.id === countryId);
    if (!target || newPopulationMillions <= 0) return;

    const oldPop = Math.max(0.1, target.population);
    const oldGdp = target.gdp;
    const ratio = newPopulationMillions / oldPop;
    const nextPop = Math.round(newPopulationMillions * 10) / 10;
    const nextGdp = Math.max(1, Math.round(target.gdp * ratio * 10) / 10);
    const nextMil = Math.max(10, Math.round(target.militaryPower * Math.pow(ratio, 0.35)));

    const updated = countriesRef.current.map((c) =>
      c.id === countryId
        ? { ...c, population: nextPop, gdp: nextGdp, militaryPower: nextMil }
        : c
    );
    countriesRef.current = updated;
    setCountries(updated);
    if (selectedCountry?.id === countryId) {
      setSelectedCountry({
        ...selectedCountry,
        population: nextPop,
        gdp: nextGdp,
        militaryPower: nextMil,
      });
    }

    if (nextPop > oldPop) {
      addEvent({
        type: 'diplomacy',
        title: `Crescimento em ${target.name}: População ${nextPop.toFixed(1)}M · PIB $${nextGdp.toLocaleString()} Bi`,
        description: `População subiu de ${oldPop.toFixed(1)}M para ${nextPop.toFixed(1)}M, elevando o PIB de $${oldGdp.toLocaleString()} Bi para $${nextGdp.toLocaleString()} Bi.`,
        countryId,
      });
    }
  };

  const handleBuyTerritory = (
    buyer: Country,
    seller: Country,
    cells: number,
    priceBillions: number
  ) => {
    if (buyer.id === seller.id || priceBillions <= 0 || buyer.gdp < priceBillions) return;
    const res = engine.buyBorderTerritory(
      buyer,
      seller,
      cells,
      countriesRef.current,
      empiresRef.current,
      statesRef.current
    );
    if (res.transferredCells === 0) return;

    const updated = countriesRef.current.map((c) => {
      if (c.id === buyer.id) {
        return { ...c, gdp: Math.max(1, Math.round((c.gdp - priceBillions) * 10) / 10) };
      }
      if (c.id === seller.id) {
        return { ...c, gdp: Math.round((c.gdp + priceBillions) * 10) / 10 };
      }
      return c;
    });
    countriesRef.current = updated;
    setCountries(updated);

    if (selectedCountry?.id === buyer.id) {
      const refBuyer = updated.find((c) => c.id === buyer.id);
      if (refBuyer) setSelectedCountry(refBuyer);
    } else if (selectedCountry?.id === seller.id) {
      const refSeller = updated.find((c) => c.id === seller.id);
      if (refSeller) setSelectedCountry(refSeller);
    }

    addEvent({
      type: 'diplomacy',
      title: `${buyer.name} comprou território de ${seller.name} por $${priceBillions.toLocaleString()} Bi`,
      description: `Transação econômica transferiu ${res.transferredCells} km² de ${seller.name} para ${buyer.name}.`,
      countryId: buyer.id,
    });
  };

  const handleChangeIdeology = (countryId: string, ideology: Ideology) => {
    sound.playClick();
    const updated = countriesRef.current.map((c) =>
      c.id === countryId ? { ...c, ideology } : c
    );
    countriesRef.current = updated;
    setCountries(updated);
    if (selectedCountry?.id === countryId) {
      setSelectedCountry({ ...selectedCountry, ideology });
    }
    const target = updated.find((c) => c.id === countryId);
    if (target) {
      addEvent({
        type: 'diplomacy',
        title: `Novo Regime em ${target.name}: ${ideology}`,
        description: `${target.name} alterou seu sistema de governo para ${ideology}.`,
        countryId,
      });
    }
  };

  const handleChangeCountryColor = (countryId: string, color: string) => {
    const target = countriesRef.current.find((c) => c.id === countryId);
    const updated = countriesRef.current.map((c) =>
      c.id === countryId ? { ...c, color } : c
    );
    countriesRef.current = updated;
    setCountries(updated);
    if (selectedCountry?.id === countryId) {
      setSelectedCountry({ ...selectedCountry, color });
    }
    if (target) {
      engine.soldiers.forEach((s) => {
        if (s.ownerNumericId === target.numericId) s.color = color;
      });
    }
    engine.refreshFullBuffer(updated, empiresRef.current, statesRef.current);
  };

  const handleGiftCountry = (donor: Country, recipient: Country, asState: boolean) => {
    if (donor.id === recipient.id) return;
    sound.playPeaceChime();

    // Ensure recipient states are initialized first so gifting never erases real states
    const initNumId = statesRef.current.reduce((m, s) => Math.max(m, s.numericId), 0) + 1;
    const initCreated = engine.ensureCountryStatesInitialized(
      recipient,
      statesRef.current,
      initNumId
    );
    const statesWithRecipientInit =
      initCreated.length > 0 ? [...statesRef.current, ...initCreated] : statesRef.current;

    const nextStateNumId =
      statesWithRecipientInit.reduce((m, s) => Math.max(m, s.numericId), 0) + 1;

    // Always store as an incorporated StateTerritory with state.flag & formerCountryData so flags persist across returns/independence!
    const createdState: StateTerritory = {
      id: `STATE_INC_${donor.id}_${Date.now()}`,
      numericId: nextStateNumId,
      countryId: recipient.id,
      name: donor.originStateName || donor.name,
      capitalCity: donor.originStateCapital || donor.capital,
      color:
        donor.originStateColor ||
        donor.color ||
        STATE_PALETTE[statesWithRecipientInit.length % STATE_PALETTE.length],
      flag: donor.flag,
      centerX: donor.centerX,
      centerY: donor.centerY,
      territoryCells: donor.territoryCells,
      formerCountryData: {
        name: donor.name,
        capital: donor.capital,
        color: donor.color,
        flag: donor.flag,
        ideology: donor.ideology,
        originCountryId: donor.originCountryId,
        originCountryName: donor.originCountryName,
      },
    };

    const baseStates = statesWithRecipientInit.filter((s) => s.countryId !== donor.id);
    const updatedStates = [...baseStates, createdState];
    statesRef.current = updatedStates;
    setStates(updatedStates);

    engine.transferCountryTerritory(
      donor,
      recipient,
      countriesRef.current,
      empiresRef.current,
      updatedStates,
      nextStateNumId
    );

    const updatedCities = citiesRef.current.map((ct) =>
      ct.countryId === donor.id
        ? {
            ...ct,
            countryId: recipient.id,
            stateId: createdState.id,
            isNationalCapital: false,
          }
        : ct
    );
    citiesRef.current = updatedCities;
    setCities(updatedCities);

    const updatedWars = activeWarsRef.current
      .map((w) => ({
        ...w,
        attackers: w.attackers.filter((id) => id !== donor.id),
        defenders: w.defenders.filter((id) => id !== donor.id),
      }))
      .filter((w) => w.attackers.length > 0 && w.defenders.length > 0);
    activeWarsRef.current = updatedWars;
    setActiveWars(updatedWars);

    setAlliances((prev) =>
      prev
        .map((a) => ({
          ...a,
          memberIds: a.memberIds.filter((id) => id !== donor.id),
        }))
        .filter((a) => a.memberIds.length >= 2)
    );

    const updatedEmpires = empiresRef.current.map((e) => ({
      ...e,
      memberIds: e.memberIds.filter((id) => id !== donor.id),
    }));
    empiresRef.current = updatedEmpires;
    setEmpires(updatedEmpires);

    const updatedCountries = countriesRef.current
      .filter((c) => c.id !== donor.id)
      .map((c) => {
        if (c.id !== recipient.id) return c;
        const nextStatesList = !c.states.includes(createdState.name)
          ? [...c.states, createdState.name]
          : c.states;
        return {
          ...c,
          states: nextStatesList,
          population: Math.round((c.population + donor.population * 0.8) * 10) / 10,
          gdp: Math.round((c.gdp + donor.gdp * 0.8) * 10) / 10,
        };
      });

    engine.recalculateTerritoryCounts(updatedCountries, updatedStates);
    engine.refreshFullBuffer(updatedCountries, updatedEmpires, updatedStates);
    countriesRef.current = updatedCountries;
    setCountries(updatedCountries);

    const nextRecipient = updatedCountries.find((c) => c.id === recipient.id) || null;
    setSelectedCountry(nextRecipient);

    addEvent({
      type: 'diplomacy',
      title: asState
        ? `${donor.name} devolvido como Estado de ${recipient.name}`
        : `${donor.name} entregue para ${recipient.name}`,
      description: `O território de ${donor.name} foi incorporado a ${recipient.name}, mantendo direito de devolução ou guerra pela independência.`,
      countryId: recipient.id,
    });
  };

  const handleDeclareStateIndependence = (
    parentCountry: Country,
    state: StateTerritory,
    startWar: boolean = false
  ) => {
    if (startWar) sound.playWarCannon();
    else sound.playImperialFanfare();

    const nextCountryNumId =
      countriesRef.current.reduce((m, c) => Math.max(m, c.numericId), 0) + 1;

    const res = engine.declareStateIndependence(
      parentCountry,
      state,
      nextCountryNumId,
      countriesRef.current,
      empiresRef.current,
      statesRef.current
    );

    const former = state.formerCountryData;
    const countryName = former?.name || state.name;
    const countryCapital = former?.capital || state.capitalCity || state.name;
    const countryColor = former?.color || state.color;
    const countryFlag = state.flag || former?.flag || {
      type: 'custom' as const,
      value: '',
      customProps: {
        layout: 'horizontal' as const,
        colors: [state.color, '#ffffff', '#0f172a'],
        emblem: 'star' as const,
        emblemColor: '#fbbf24',
      },
    };
    const countryIdeology = former?.ideology || parentCountry.ideology;

    const newCountry: Country = {
      id: `IND_${state.id}_${Date.now()}`,
      numericId: nextCountryNumId,
      name: countryName,
      originalName: countryName,
      capital: countryCapital,
      capitalX: res.centroid.x,
      capitalY: res.centroid.y,
      continent: parentCountry.continent,
      color: countryColor,
      flag: countryFlag,
      population: Math.max(0.5, Math.round(res.cellCount * 0.08 * 10) / 10),
      militaryPower: Math.max(25, Math.min(180, Math.round(res.cellCount * 0.6) + 25)),
      gdp: Math.max(5, Math.round(res.cellCount * 0.8 * 10) / 10),
      techEra: parentCountry.techEra,
      techProgress: parentCountry.techProgress,
      ideology: countryIdeology,
      empireId: null,
      allies: [],
      enemies: startWar ? [parentCountry.id] : [],
      decrees: [
        startWar ? 'Proclamação de Guerra pela Independência' : 'Declaração de Independência',
      ],
      territoryCells: res.cellCount,
      states: [],
      isCustom: true,
      hasCustomTerritory: true,
      originCountryId: former?.originCountryId || parentCountry.id,
      originCountryName: former?.originCountryName || parentCountry.name,
      originStateName: state.name,
      originStateCapital: state.capitalCity,
      originStateColor: state.color,
      createdAtYear: yearRef.current,
      normX: res.centroid.x / engine.width,
      normY: res.centroid.y / engine.height,
      centerX: res.centroid.x,
      centerY: res.centroid.y,
    };

    popMilestoneRef.current.set(newCountry.id, newCountry.population);

    const updatedStates = statesRef.current.filter((s) => s.id !== state.id);
    statesRef.current = updatedStates;
    setStates(updatedStates);

    const updatedCities = citiesRef.current.map((ct) =>
      ct.stateId === state.id
        ? { ...ct, countryId: newCountry.id, stateId: undefined, isStateCapital: false }
        : ct
    );
    citiesRef.current = updatedCities;
    setCities(updatedCities);

    const updatedCountries = [
      ...countriesRef.current.map((c) =>
        c.id === parentCountry.id
          ? { ...c, states: c.states.filter((stName) => stName !== state.name) }
          : c
      ),
      newCountry,
    ];

    engine.recalculateTerritoryCounts(updatedCountries, updatedStates);
    engine.activeStateViewCountryNumId = null;
    engine.selectedCountryNumId = newCountry.numericId;
    engine.refreshFullBuffer(updatedCountries, empiresRef.current, updatedStates);
    countriesRef.current = updatedCountries;
    setCountries(updatedCountries);

    if (startWar) {
      const expanded = expandSidesWithAlliances([newCountry.id], [parentCountry.id]);
      const indWar: War = {
        id: `WAR_IND_${Date.now()}`,
        name: `Independência: ${newCountry.name} vs ${parentCountry.name}`,
        attackers: expanded.attackers,
        defenders: expanded.defenders,
        startYear: yearRef.current,
        startDay: dayRef.current,
        casualties: { attackers: 0, defenders: 0 },
        isWorldWar: expanded.attackers.length + expanded.defenders.length >= 4,
      };
      const nextWars = [...activeWarsRef.current, indWar];
      activeWarsRef.current = nextWars;
      setActiveWars(nextWars);
      engine.simulateWarTick([indWar], updatedCountries, empiresRef.current, updatedStates);
    }

    setSelectedState(null);
    setSelectedCountry(newCountry);
    setCurrentTool('select');

    addEvent({
      type: startWar ? 'war' : 'cut',
      title: startWar
        ? `Guerra pela Independência: ${newCountry.name} vs ${parentCountry.name}!`
        : `Independência Declarada: ${newCountry.name} (Pop. ${newCountry.population}M · PIB $${newCountry.gdp} Bi)`,
      description: startWar
        ? `${newCountry.name} pegou em armas pela independência contra ${parentCountry.name} (Pop. inicial ${newCountry.population}M, PIB $${newCountry.gdp} Bi)!`
        : `${newCountry.name} separou-se de ${parentCountry.name} com população inicial de ${newCountry.population}M e PIB de $${newCountry.gdp} Bi.`,
      countryId: newCountry.id,
    });
  };

  const handleCreateNewState = (
    name: string,
    capital: string,
    color: string,
    placeOnMap: boolean
  ) => {
    if (!selectedCountry) return;
    const nextNumId = statesRef.current.reduce((m, s) => Math.max(m, s.numericId), 0) + 1;
    const stColor = color || STATE_PALETTE[statesRef.current.length % STATE_PALETTE.length];
    const newState: StateTerritory = {
      id: `STATE_${selectedCountry.id}_${Date.now()}`,
      numericId: nextNumId,
      countryId: selectedCountry.id,
      name,
      capitalCity: capital || name,
      color: stColor,
      flag: getRealStateFlag(selectedCountry.originalName, name, stColor),
      centerX: selectedCountry.centerX,
      centerY: selectedCountry.centerY,
      territoryCells: 0,
    };
    const updatedStates = [...statesRef.current, newState];
    statesRef.current = updatedStates;
    setStates(updatedStates);
    setSelectedState(newState);

    const updatedCountries = countriesRef.current.map((c) =>
      c.id === selectedCountry.id && !c.states.includes(name)
        ? { ...c, states: [...c.states, name] }
        : c
    );
    countriesRef.current = updatedCountries;
    setCountries(updatedCountries);
    setSelectedCountry({
      ...selectedCountry,
      states: selectedCountry.states.includes(name)
        ? selectedCountry.states
        : [...selectedCountry.states, name],
    });

    engine.updateStateColorCache(updatedStates);
    setStateInteractionMode(placeOnMap ? 'place_new_state' : 'paint_state');

    addEvent({
      type: 'diplomacy',
      title: `Novo Estado Fundado: ${name}`,
      description: placeOnMap
        ? `Clique dentro de ${selectedCountry.name} para demarcar o território inicial de ${name}.`
        : `Use o pincel dentro de ${selectedCountry.name} para pintar o território de ${name}.`,
      countryId: selectedCountry.id,
    });
  };

  const handleStateCutFinished = useCallback((cutResult: StateCutResult) => {
    setPendingStateCutInfo(cutResult);
    setIsNewStateCutModalOpen(true);
  }, []);

  const handleCancelCutState = () => {
    if (!pendingStateCutInfo) return;
    const countryStates = statesRef.current.filter(
      (s) => s.countryId === pendingStateCutInfo.countryId
    );
    const w = engine.width;
    const len = engine.stateOwner.length;
    for (let i = 0; i < len; i++) {
      if (engine.stateOwner[i] === pendingStateCutInfo.newStateNumericId) {
        if (countryStates.length === 0) {
          engine.stateOwner[i] = 0;
        } else {
          const x = i % w;
          const y = (i - x) / w;
          let bestId = countryStates[0].numericId;
          let bestDist = Infinity;
          for (const st of countryStates) {
            const d = (x - st.centerX) ** 2 + (y - st.centerY) ** 2;
            if (d < bestDist) {
              bestDist = d;
              bestId = st.numericId;
            }
          }
          engine.stateOwner[i] = bestId;
        }
      }
    }
    engine.recalculateStateCounts(statesRef.current);
    engine.refreshFullBuffer(countriesRef.current, empiresRef.current, statesRef.current);
    setStates([...statesRef.current]);
    setPendingStateCutInfo(null);
  };

  const handleConfirmCutState = (newState: StateTerritory) => {
    const updatedStates = [...statesRef.current, newState];
    statesRef.current = updatedStates;
    setStates(updatedStates);
    setSelectedState(newState);

    const updatedCountries = countriesRef.current.map((c) =>
      c.id === newState.countryId && !c.states.includes(newState.name)
        ? { ...c, states: [...c.states, newState.name] }
        : c
    );
    countriesRef.current = updatedCountries;
    setCountries(updatedCountries);
    if (selectedCountry?.id === newState.countryId) {
      setSelectedCountry({
        ...selectedCountry,
        states: selectedCountry.states.includes(newState.name)
          ? selectedCountry.states
          : [...selectedCountry.states, newState.name],
      });
    }

    engine.updateStateColorCache(updatedStates);
    engine.recalculateStateCounts(updatedStates);
    engine.refreshFullBuffer(updatedCountries, empiresRef.current, updatedStates);
    setStateInteractionMode('paint_state');
    setPendingStateCutInfo(null);

    const parentName =
      updatedCountries.find((c) => c.id === newState.countryId)?.name || 'País';
    addEvent({
      type: 'cut',
      title: `Novo Estado Cortado: ${newState.name} (${parentName})`,
      description: `Um novo estado com bandeira própria foi criado em ${parentName} (Capital: ${newState.capitalCity}).`,
      countryId: newState.countryId,
    });
  };

  const executeStateTransfer = (
    donorCountry: Country,
    state: StateTerritory,
    recipientCountry: Country,
    paymentBillions: number = 0
  ): boolean => {
    if (donorCountry.id === recipientCountry.id) return false;

    const initNumId = statesRef.current.reduce((m, s) => Math.max(m, s.numericId), 0) + 1;
    const initCreated = engine.ensureCountryStatesInitialized(
      recipientCountry,
      statesRef.current,
      initNumId
    );
    const baseStates =
      initCreated.length > 0 ? [...statesRef.current, ...initCreated] : [...statesRef.current];

    const res = engine.transferStateToCountry(
      donorCountry,
      state,
      recipientCountry,
      countriesRef.current,
      empiresRef.current,
      baseStates
    );
    if (res.transferredCells === 0) return false;

    const updatedStates = baseStates.map((s) =>
      s.id === state.id
        ? {
            ...s,
            countryId: recipientCountry.id,
            centerX: res.centroid.x,
            centerY: res.centroid.y,
          }
        : s
    );
    statesRef.current = updatedStates;
    setStates(updatedStates);

    const updatedCities = citiesRef.current.map((ct) =>
      ct.stateId === state.id
        ? { ...ct, countryId: recipientCountry.id, isNationalCapital: false }
        : ct
    );
    citiesRef.current = updatedCities;
    setCities(updatedCities);

    const donorShare =
      donorCountry.territoryCells > 0
        ? Math.min(0.45, res.transferredCells / Math.max(1, donorCountry.territoryCells + res.transferredCells))
        : 0.1;
    const movedPop = Math.round(donorCountry.population * donorShare * 10) / 10;

    const updatedCountries = countriesRef.current.map((c) => {
      if (c.id === donorCountry.id) {
        return {
          ...c,
          states: c.states.filter((stName) => stName !== state.name),
          population: Math.max(0.2, Math.round((c.population - movedPop) * 10) / 10),
          gdp: Math.round((c.gdp + paymentBillions) * 10) / 10,
        };
      }
      if (c.id === recipientCountry.id) {
        const nextStates = c.states.includes(state.name)
          ? c.states
          : [...c.states, state.name];
        return {
          ...c,
          states: nextStates,
          population: Math.round((c.population + movedPop) * 10) / 10,
          gdp: Math.max(1, Math.round((c.gdp - paymentBillions) * 10) / 10),
        };
      }
      return c;
    });

    engine.recalculateTerritoryCounts(updatedCountries, updatedStates);
    engine.refreshFullBuffer(updatedCountries, empiresRef.current, updatedStates);
    countriesRef.current = updatedCountries;
    setCountries(updatedCountries);

    const nextDonor = updatedCountries.find((c) => c.id === donorCountry.id);
    if (nextDonor) {
      setSelectedCountry(nextDonor);
      const remState = updatedStates.find((s) => s.countryId === nextDonor.id) || null;
      setSelectedState(remState);
    }
    return true;
  };

  const handleDonateState = (
    donorCountry: Country,
    state: StateTerritory,
    recipientCountry: Country
  ) => {
    const ok = executeStateTransfer(donorCountry, state, recipientCountry, 0);
    if (!ok) return;
    sound.playPeaceChime();
    addEvent({
      type: 'diplomacy',
      title: `Estado Doado: ${state.name} (${donorCountry.name} ➔ ${recipientCountry.name})`,
      description: `${donorCountry.name} doou o estado ${state.name} (mantendo sua bandeira e capital ${state.capitalCity}) para ${recipientCountry.name}.`,
      countryId: recipientCountry.id,
    });
  };

  const handleSellState = (
    sellerCountry: Country,
    state: StateTerritory,
    buyerCountry: Country,
    priceBillions: number
  ) => {
    if (buyerCountry.gdp < priceBillions) {
      addEvent({
        type: 'diplomacy',
        title: `Venda Recusada: ${buyerCountry.name} sem saldo para ${state.name}`,
        description: `${buyerCountry.name} possui PIB de $${buyerCountry.gdp.toLocaleString()} Bi e não pôde pagar $${priceBillions.toLocaleString()} Bi por ${state.name}.`,
        countryId: sellerCountry.id,
      });
      return;
    }

    const maxWilling = Math.max(25, Math.round(state.territoryCells * 2.5));
    if (priceBillions > maxWilling) {
      addEvent({
        type: 'diplomacy',
        title: `${buyerCountry.name} recusou comprar ${state.name} por $${priceBillions} Bi`,
        description: `O valor pedido ($${priceBillions} Bi) foi considerado alto demais por ${buyerCountry.name} (máx. aceitável ~$${maxWilling} Bi).`,
        countryId: sellerCountry.id,
      });
      return;
    }

    const ok = executeStateTransfer(sellerCountry, state, buyerCountry, priceBillions);
    if (!ok) return;
    sound.playPeaceChime();
    addEvent({
      type: 'diplomacy',
      title: `Estado Vendido: ${state.name} para ${buyerCountry.name} por $${priceBillions.toLocaleString()} Bi!`,
      description: `${buyerCountry.name} aceitou a proposta de ${sellerCountry.name} e incorporou ${state.name}.`,
      countryId: buyerCountry.id,
    });
  };

  const handleSetSovereignCountry = (countryId: string, sovereign: Country | null) => {
    const target = countriesRef.current.find((c) => c.id === countryId);
    const updated = countriesRef.current.map((c) =>
      c.id === countryId
        ? {
            ...c,
            sovereignCountryId: sovereign ? sovereign.id : null,
            sovereignCountryName: sovereign ? sovereign.name : undefined,
          }
        : c
    );
    countriesRef.current = updated;
    setCountries(updated);
    if (selectedCountry?.id === countryId) {
      setSelectedCountry({
        ...selectedCountry,
        sovereignCountryId: sovereign ? sovereign.id : null,
        sovereignCountryName: sovereign ? sovereign.name : undefined,
      });
    }
    if (target) {
      addEvent({
        type: 'diplomacy',
        title: sovereign
          ? `${target.name} vinculado a ${sovereign.name}`
          : `${target.name} agora é totalmente independente`,
        description: sovereign
          ? `${target.name} mantém sua bandeira e governo local como território de ${sovereign.name}.`
          : `${target.name} deixou de responder a outro país soberano.`,
        countryId,
      });
    }
  };

  const handleCarveNewState = (gx: number, gy: number) => {
    if (!selectedCountry || !selectedState) return;
    const idx = engine.getIndex(gx, gy);
    if (engine.owner[idx] !== selectedCountry.numericId) return;

    sound.playClick();
    const count = engine.carveNewStateTerritory(
      gx,
      gy,
      Math.max(5, brushRadius),
      selectedCountry.numericId,
      selectedState.numericId,
      countriesRef.current,
      empiresRef.current,
      statesRef.current
    );

    if (count > 0) {
      setStates([...statesRef.current]);
      const updatedSelected =
        statesRef.current.find((s) => s.id === selectedState.id) || selectedState;
      setSelectedState({ ...updatedSelected });
      setStateInteractionMode('paint_state');
    }
  };

  const handleStartStateWar = (
    country: Country,
    attState: StateTerritory,
    defState: StateTerritory
  ) => {
    const newSw: StateWar = {
      id: `SWAR_${Date.now()}`,
      countryId: country.id,
      name: `${attState.name} vs ${defState.name}`,
      attackerStateId: attState.id,
      defenderStateId: defState.id,
      startYear: yearRef.current,
      startDay: dayRef.current,
      casualties: { attackers: 0, defenders: 0 },
    };
    const next = [...stateWarsRef.current, newSw];
    stateWarsRef.current = next;
    setStateWars(next);
    engine.activeStateViewCountryNumId = country.numericId;
    engine.simulateStateWarTick([newSw], countriesRef.current, empiresRef.current, statesRef.current);
    setStates([...statesRef.current]);

    addEvent({
      type: 'war',
      title: `Guerra Civil Estadual em ${country.name}: ${attState.name} x ${defState.name}`,
      description: `Tropas de ${attState.name} avançam sobre o território de ${defState.name}.`,
      countryId: country.id,
    });
  };

  const handleEndStateWar = (warId: string) => {
    sound.playPeaceChime();
    const sw = stateWarsRef.current.find((w) => w.id === warId);
    const next = stateWarsRef.current.filter((w) => w.id !== warId);
    stateWarsRef.current = next;
    setStateWars(next);
    engine.soldiers = engine.soldiers.filter((s) => s.warId !== warId);
    if (sw) {
      addEvent({
        type: 'peace',
        title: `Paz Estadual Assinada: ${sw.name}`,
        description: `Confronto interno encerrado com sucesso.`,
        countryId: sw.countryId,
      });
    }
  };

  const handleRenameState = (stateId: string, newName: string, newCapital: string) => {
    const targetState = statesRef.current.find((s) => s.id === stateId);
    const updatedStates = statesRef.current.map((s) =>
      s.id === stateId ? { ...s, name: newName, capitalCity: newCapital } : s
    );
    statesRef.current = updatedStates;
    setStates(updatedStates);
    if (selectedState?.id === stateId) {
      setSelectedState({ ...selectedState, name: newName, capitalCity: newCapital });
    }
    if (targetState) {
      const updatedCountries = countriesRef.current.map((c) =>
        c.id === targetState.countryId
          ? {
              ...c,
              states: c.states.map((stName) => (stName === targetState.name ? newName : stName)),
            }
          : c
      );
      countriesRef.current = updatedCountries;
      setCountries(updatedCountries);
      if (selectedCountry?.id === targetState.countryId) {
        setSelectedCountry({
          ...selectedCountry,
          states: selectedCountry.states.map((stName) =>
            stName === targetState.name ? newName : stName
          ),
        });
      }
    }
  };

  const handleMoveCapital = (gx: number, gy: number) => {
    if (!selectedCountry) return;
    const idx = engine.getIndex(gx, gy);
    if (engine.owner[idx] !== selectedCountry.numericId) return;

    sound.playClick();
    const updated = countriesRef.current.map((c) =>
      c.id === selectedCountry.id ? { ...c, capitalX: gx, capitalY: gy } : c
    );
    countriesRef.current = updated;
    setCountries(updated);
    setSelectedCountry({ ...selectedCountry, capitalX: gx, capitalY: gy });
    addEvent({
      type: 'diplomacy',
      title: `Capital de ${selectedCountry.name} Reposicionada`,
      description: `A sede nacional de ${selectedCountry.capital} foi transferida para a nova localização marcada no mapa.`,
      countryId: selectedCountry.id,
    });
  };

  const handlePlaceCity = (gx: number, gy: number) => {
    const idx = engine.getIndex(gx, gy);
    const ownerNumId = engine.owner[idx];
    const ownerCountry =
      countriesRef.current.find((c) => c.numericId === ownerNumId) || selectedCountry;
    if (!ownerCountry) return;

    sound.playClick();
    const name = pendingCityName.trim() || `Cidade ${citiesRef.current.length + 1}`;
    const stateNumId = engine.stateOwner[idx];
    const stateObj = statesRef.current.find((s) => s.numericId === stateNumId);

    const newCity: City = {
      id: `CITY_${Date.now()}`,
      name,
      countryId: ownerCountry.id,
      stateId: stateObj?.id,
      x: gx,
      y: gy,
      isStateCapital: pendingCityIsStateCap,
    };

    const updatedCities = [...citiesRef.current, newCity];
    citiesRef.current = updatedCities;
    setCities(updatedCities);

    if (pendingCityIsStateCap && stateObj) {
      handleRenameState(stateObj.id, stateObj.name, name);
    }

    addEvent({
      type: 'diplomacy',
      title: `${pendingCityIsStateCap ? 'Nova Capital Estadual' : 'Nova Cidade'}: ${name}`,
      description: `Fundada em ${ownerCountry.name}${stateObj ? ` (${stateObj.name})` : ''}.`,
      countryId: ownerCountry.id,
    });
  };

  const handleStartAnnexWar = (aggressor: Country, target: Country) => {
    const expanded = expandSidesWithAlliances([aggressor.id], [target.id]);
    const newWar: War = {
      id: `WAR_ANNEX_${Date.now()}`,
      name: `Anexação Estadual: ${aggressor.name} vs ${target.name}`,
      attackers: expanded.attackers,
      defenders: expanded.defenders,
      startYear: yearRef.current,
      startDay: dayRef.current,
      casualties: { attackers: 0, defenders: 0 },
      isWorldWar: expanded.attackers.length + expanded.defenders.length >= 4,
      annexationGoal: {
        aggressorId: aggressor.id,
        targetId: target.id,
        targetInitialCells: Math.max(10, target.territoryCells),
      },
    };
    const nextWars = [...activeWarsRef.current, newWar];
    activeWarsRef.current = nextWars;
    setActiveWars(nextWars);
    addEvent({
      type: 'war',
      title: `Guerra de Anexação Estadual: ${aggressor.name} ➔ ${target.name}`,
      description: `Se ${aggressor.name} dominar ${target.name}, ele se tornará um novo Estado de ${aggressor.name}!`,
    });
  };

  const handleAddDecree = (countryId: string, decree: string) => {
    setCountries((prev) =>
      prev.map((c) =>
        c.id === countryId && !c.decrees.includes(decree)
          ? { ...c, decrees: [...c.decrees, decree] }
          : c
      )
    );
  };

  const handleUpgradeTech = (countryId: string) => {
    sound.playClick();
    setCountries((prev) =>
      prev.map((c) =>
        c.id === countryId ? { ...c, techProgress: Math.min(100, c.techProgress + 25) } : c
      )
    );
  };

  const handleClearCountryTerritory = (country: Country) => {
    engine.clearCountryTerritory(
      country,
      countriesRef.current,
      empiresRef.current,
      statesRef.current
    );
    setCountries([...countriesRef.current]);
    setCurrentTool('pencil');
    setBrushAction('paint');
    setSelectedCountry(country);
    addEvent({
      type: 'diplomacy',
      title: `Redefinição Territorial: ${country.name}`,
      description: `O território anterior de ${country.name} foi limpo. Use o Pincel para desenhar seu novo território no mapa.`,
      countryId: country.id,
    });
  };

  const handleToggleSound = () => {
    sound.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        sound.playClick();
        setIsPaused((p) => !p);
      } else if (e.key === '1') setSimSpeed(1);
      else if (e.key === '2') setSimSpeed(2);
      else if (e.key === '5') setSimSpeed(5);
      else if (e.key.toLowerCase() === 's') setCurrentTool('select');
      else if (e.key.toLowerCase() === 'c') setCurrentTool('scissors');
      else if (e.key.toLowerCase() === 'p') setCurrentTool('pencil');
      else if (e.key.toLowerCase() === 'l') setCurrentTool('land');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeSelectedCountry = useMemo(() => {
    if (!selectedCountry) return null;
    return countries.find((c) => c.id === selectedCountry.id) || selectedCountry;
  }, [countries, selectedCountry]);

  const selectedEmpire = useMemo(() => {
    if (!activeSelectedCountry?.empireId) return null;
    return empires.find((e) => e.id === activeSelectedCountry.empireId) || null;
  }, [activeSelectedCountry, empires]);

  const selectedCountryCities = useMemo(() => {
    if (!activeSelectedCountry) return [];
    return cities.filter((ct) => ct.countryId === activeSelectedCountry.id);
  }, [cities, activeSelectedCountry]);

  const selectedCountryStates = useMemo(() => {
    if (!activeSelectedCountry) return [];
    return states.filter((s) => s.countryId === activeSelectedCountry.id);
  }, [states, activeSelectedCountry]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none">
      <TopBar
        year={year}
        day={day}
        simSpeed={simSpeed}
        isPaused={isPaused}
        showDayNight={showDayNight}
        showAllStates={showAllStates}
        soundEnabled={soundEnabled}
        aiAutonomy={aiAutonomy}
        activeWarsCount={activeWars.length + stateWars.length}
        empiresCount={empires.length}
        countriesCount={countries.length}
        countries={countries}
        onSelectCountryFromSearch={(c) => {
          setSelectedCountry(c);
          setCurrentTool('select');
        }}
        onTogglePause={() => setIsPaused((p) => !p)}
        onSetSpeed={(spd) => {
          setSimSpeed(spd);
          setIsPaused(false);
        }}
        onStepDay={() => {
          setDay((d) => (d >= 365 ? 1 : d + 1));
          setDayNightAngle((a) => (a + 2) % 360);
        }}
        onToggleDayNight={() => setShowDayNight((dn) => !dn)}
        onToggleShowAllStates={handleToggleShowAllStates}
        onToggleSound={handleToggleSound}
        onToggleAiAutonomy={() => setAiAutonomy((v) => !v)}
        onOpenEventsLog={() => setIsEventsLogOpen(true)}
      />

      <div className="relative flex-1 w-full h-full overflow-hidden">
        <Toolbar
          currentTool={currentTool}
          onSelectTool={(tool) => {
            setIsEyedropperActive(false);
            setCurrentTool(tool);
          }}
          brushRadius={brushRadius}
          onChangeBrushRadius={setBrushRadius}
          onOpenEmpireModal={() => setIsEmpireModalOpen(true)}
          onOpenWarModal={() => setIsWarModalOpen(true)}
          onOpenDiplomacyModal={(mode) => {
            setDiplomacyMode(mode);
            setIsDiplomacyModalOpen(true);
          }}
        />

        <WorldCanvas
          engine={engine}
          countries={countries}
          empires={empires}
          states={states}
          cities={cities}
          activeWars={activeWars}
          currentTool={currentTool}
          brushRadius={brushRadius}
          brushStyle={brushStyle}
          brushAction={brushAction}
          paintOverWater={paintOverWater}
          isEyedropperActive={isEyedropperActive}
          selectedCountry={activeSelectedCountry}
          selectedState={selectedState}
          stateInteractionMode={stateInteractionMode}
          dayNightAngle={dayNightAngle}
          showDayNight={showDayNight}
          showLabels={true}
          showAllStates={showAllStates}
          isPaused={isPaused}
          simSpeed={simSpeed}
          onSelectCountry={(c) => setSelectedCountry(c)}
          onEyedropperPick={(c) => {
            setSelectedCountry(c);
            setBrushAction('paint');
            setIsEyedropperActive(false);
          }}
          onCutFinished={handleCutFinished}
          onStateCutFinished={handleStateCutFinished}
          onTerritoryUpdated={handleTerritoryUpdated}
          onStateUpdated={handleStateUpdated}
          onMoveCapital={handleMoveCapital}
          onPlaceCity={handlePlaceCity}
          onCarveNewState={handleCarveNewState}
        />

        {/* Artistic Brush & Territory Definition Palette */}
        {currentTool === 'pencil' && (
          <BrushPalette
            countries={countries}
            selectedCountry={activeSelectedCountry}
            brushRadius={brushRadius}
            brushStyle={brushStyle}
            brushAction={brushAction}
            paintOverWater={paintOverWater}
            isEyedropperActive={isEyedropperActive}
            onSelectCountry={(c) => setSelectedCountry(c)}
            onChangeRadius={setBrushRadius}
            onChangeStyle={setBrushStyle}
            onChangeAction={setBrushAction}
            onTogglePaintOverWater={() => setPaintOverWater((v) => !v)}
            onToggleEyedropper={() => setIsEyedropperActive((v) => !v)}
            onClearCountryTerritory={handleClearCountryTerritory}
          />
        )}

        {/* States, Capitals & Cities Editor Palette */}
        {currentTool === 'states' && (
          <StatePalette
            countries={countries}
            selectedCountry={activeSelectedCountry}
            states={states}
            selectedState={selectedState}
            stateWars={stateWars}
            brushRadius={brushRadius}
            isEyedropperActive={isEyedropperActive}
            interactionMode={stateInteractionMode}
            pendingCityName={pendingCityName}
            pendingCityIsStateCap={pendingCityIsStateCap}
            onSelectCountry={(c) => setSelectedCountry(c)}
            onSelectState={(st) => setSelectedState(st)}
            onChangeRadius={setBrushRadius}
            onToggleEyedropper={() => setIsEyedropperActive((v) => !v)}
            onChangeInteractionMode={setStateInteractionMode}
            onChangePendingCityName={setPendingCityName}
            onTogglePendingCityIsStateCap={() => setPendingCityIsStateCap((v) => !v)}
            onCreateNewState={handleCreateNewState}
            onRenameState={handleRenameState}
            onSetCapitalFromState={handleSetCapitalFromState}
            onStartAnnexWar={handleStartAnnexWar}
            onDeclareStateIndependence={handleDeclareStateIndependence}
            onStartStateWar={handleStartStateWar}
            onEndStateWar={handleEndStateWar}
            onOpenStateFlagStudio={(st) => {
              setFlagStudioCountry(null);
              setFlagStudioState(st);
              setIsFlagStudioOpen(true);
            }}
            onDonateState={handleDonateState}
            onSellState={handleSellState}
          />
        )}

        {/* Country Inspection Drawer */}
        {currentTool === 'select' && (
          <CountryDrawer
            country={activeSelectedCountry}
            allCountries={countries}
            empire={selectedEmpire}
            activeWars={activeWars}
            pastWars={pastWars}
            countryCities={selectedCountryCities}
            countryStates={selectedCountryStates}
            onClose={() => setSelectedCountry(null)}
            onOpenFlagStudio={(country) => {
              setFlagStudioState(null);
              setFlagStudioCountry(country);
              setIsFlagStudioOpen(true);
            }}
            onStartWarWith={() => setIsWarModalOpen(true)}
            onProposeAlliance={() => {
              setDiplomacyMode('alliance');
              setIsDiplomacyModalOpen(true);
            }}
            onSelectAsPencilCountry={(country) => {
              setSelectedCountry(country);
              setBrushAction('paint');
              setCurrentTool('pencil');
            }}
            onRedefineTerritory={handleClearCountryTerritory}
            onOpenStatesEditor={(country) => {
              setSelectedCountry(country);
              setCurrentTool('states');
            }}
            onRenameCountry={handleRenameCountry}
            onRenameCapital={handleRenameCapital}
            onChangePopulation={handleChangePopulation}
            onChangeIdeology={handleChangeIdeology}
            onChangeCountryColor={handleChangeCountryColor}
            onGiftCountry={handleGiftCountry}
            onProclaimStateIndependence={handleDeclareStateIndependence}
            onDissolveEmpire={handleDissolveEmpire}
            onSignPeace={handleSignPeace}
            onReopenWar={handleReopenWar}
            onAddDecree={handleAddDecree}
            onUpgradeTech={handleUpgradeTech}
            onBuyTerritory={handleBuyTerritory}
            onSetSovereignCountry={handleSetSovereignCountry}
          />
        )}

        {/* Breaking News Ticker */}
        <div className="absolute bottom-4 right-4 z-20 max-w-xs w-full pointer-events-none hidden md:block">
          {latestEvent && (
            <div
              onClick={() => {
                sound.playClick();
                setIsEventsLogOpen(true);
              }}
              className="p-2.5 bg-slate-900/90 hover:bg-slate-900 backdrop-blur-md border border-slate-700/80 hover:border-amber-500/50 rounded-xl shadow-xl flex items-center justify-between gap-2 cursor-pointer pointer-events-auto transition-all group"
            >
              <div className="overflow-hidden">
                <div className="flex items-center gap-2 text-[10px] text-amber-400 font-semibold">
                  <span>Crônica</span>
                  <span className="text-slate-500 font-mono-numbers">{latestEvent.date}</span>
                </div>
                <p className="text-xs font-medium text-slate-200 truncate group-hover:text-amber-200">
                  {latestEvent.title}
                </p>
              </div>
              <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-white shrink-0" />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <NewCountryModal
        isOpen={isNewCountryModalOpen}
        onClose={() => setIsNewCountryModalOpen(false)}
        onConfirm={handleConfirmNewCountry}
        cutInfo={pendingCutInfo}
      />

      <NewStateCutModal
        isOpen={isNewStateCutModalOpen}
        onClose={() => setIsNewStateCutModalOpen(false)}
        onCancelCut={handleCancelCutState}
        onConfirm={handleConfirmCutState}
        cutInfo={pendingStateCutInfo}
        parentCountryName={
          countries.find((c) => c.id === pendingStateCutInfo?.countryId)?.name ||
          activeSelectedCountry?.name ||
          'País'
        }
      />

      <EmpireModal
        isOpen={isEmpireModalOpen}
        onClose={() => setIsEmpireModalOpen(false)}
        countries={countries}
        empires={empires}
        onFormEmpire={handleFormEmpire}
        onDissolveEmpire={handleDissolveEmpire}
        preselectedCountryIds={selectedCountry ? [selectedCountry.id] : []}
      />

      <WarModal
        isOpen={isWarModalOpen}
        onClose={() => setIsWarModalOpen(false)}
        countries={countries}
        states={states}
        activeWars={activeWars}
        pastWars={pastWars}
        onEnsureStatesForCountry={(country) =>
          ensureStatesForCountry(
            country,
            currentTool === 'states' && selectedCountry?.id === country.id,
            false
          )
        }
        onDeclareWar={handleDeclareWar}
        onSignPeace={handleSignPeace}
        onReopenWar={handleReopenWar}
        preselectedCountryId={selectedCountry?.id}
      />

      <DiplomacyModal
        isOpen={isDiplomacyModalOpen}
        onClose={() => setIsDiplomacyModalOpen(false)}
        mode={diplomacyMode}
        countries={countries}
        activeWars={activeWars}
        alliances={alliances}
        onCreateAlliance={handleCreateAlliance}
        onDeclareWorldPeace={handleDeclareWorldPeace}
        onSignPeace={handleSignPeace}
        preselectedCountryId={selectedCountry?.id}
      />

      <FlagStudioModal
        key={`${flagStudioState?.id || flagStudioCountry?.id || 'none'}_${String(isFlagStudioOpen)}`}
        isOpen={isFlagStudioOpen}
        onClose={() => setIsFlagStudioOpen(false)}
        countryName={flagStudioState?.name || flagStudioCountry?.name}
        initialFlag={flagStudioState?.flag || flagStudioCountry?.flag}
        onSave={(newFlag: FlagData) => {
          if (flagStudioState) {
            const updatedStates = statesRef.current.map((st) =>
              st.id === flagStudioState.id
                ? {
                    ...st,
                    flag: newFlag,
                    ...(st.formerCountryData
                      ? { formerCountryData: { ...st.formerCountryData, flag: newFlag } }
                      : {}),
                  }
                : st
            );
            statesRef.current = updatedStates;
            setStates(updatedStates);
            if (selectedState?.id === flagStudioState.id) {
              setSelectedState({ ...selectedState, flag: newFlag });
            }
            addEvent({
              type: 'diplomacy',
              title: `Bandeira Estadual Atualizada: ${flagStudioState.name}`,
              description: `O estandarte oficial do estado ${flagStudioState.name} foi atualizado.`,
              countryId: flagStudioState.countryId,
            });
          } else if (flagStudioCountry) {
            const updated = countriesRef.current.map((c) =>
              c.id === flagStudioCountry.id ? { ...c, flag: newFlag } : c
            );
            countriesRef.current = updated;
            setCountries(updated);
            if (selectedCountry?.id === flagStudioCountry.id) {
              setSelectedCountry({ ...selectedCountry, flag: newFlag });
            }
          }
        }}
      />

      <EventsLog
        isOpen={isEventsLogOpen}
        onClose={() => setIsEventsLogOpen(false)}
        events={events}
      />
    </div>
  );
}
