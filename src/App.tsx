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
} from './types/game';
import { INITIAL_COUNTRIES, STATE_PALETTE } from './data/worldCountries';
import { WorldMapEngine, CutResult } from './utils/mapEngine';
import { sound } from './utils/audio';

import { WorldCanvas } from './components/WorldCanvas';
import { TopBar } from './components/TopBar';
import { Toolbar } from './components/Toolbar';
import { BrushPalette } from './components/BrushPalette';
import { StatePalette, StateInteractionMode } from './components/StatePalette';
import { CountryDrawer } from './components/CountryDrawer';
import { FlagStudioModal } from './components/FlagStudioModal';
import { NewCountryModal } from './components/NewCountryModal';
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

  const [isEmpireModalOpen, setIsEmpireModalOpen] = useState(false);
  const [isWarModalOpen, setIsWarModalOpen] = useState(false);
  const [isDiplomacyModalOpen, setIsDiplomacyModalOpen] = useState(false);
  const [diplomacyMode, setDiplomacyMode] = useState<'alliance' | 'peace'>('alliance');

  const [isFlagStudioOpen, setIsFlagStudioOpen] = useState(false);
  const [flagStudioCountry, setFlagStudioCountry] = useState<Country | null>(null);
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
  const aiAutonomyRef = useRef(aiAutonomy);
  const yearRef = useRef(year);
  const dayRef = useRef(day);

  useEffect(() => {
    countriesRef.current = countries;
  }, [countries]);

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
    (country: Country) => {
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
      if (countryStates.length > 0) {
        setSelectedState((prev) =>
          prev && prev.countryId === country.id ? prev : countryStates[0]
        );
      } else {
        setSelectedState(null);
      }

      engine.activeStateViewCountryNumId = country.numericId;
      engine.refreshFullBuffer(countriesRef.current, empiresRef.current, nextStates);
    },
    [engine]
  );

  // Sync map state overlay when entering/leaving 'states' tool or changing selected country in states mode
  useEffect(() => {
    if (!engine.isInitialized) return;
    if (currentTool === 'states' && selectedCountry) {
      ensureStatesForCountry(selectedCountry);
    } else {
      if (engine.activeStateViewCountryNumId !== null) {
        engine.activeStateViewCountryNumId = null;
        engine.refreshFullBuffer(countriesRef.current, empiresRef.current, statesRef.current);
      }
    }
  }, [currentTool, selectedCountry, engine, ensureStatesForCountry]);

  const handleTerritoryUpdated = useCallback(() => {
    engine.recalculateTerritoryCounts(countriesRef.current);
    setCountries([...countriesRef.current]);
  }, [engine]);

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
        engine.recalculateTerritoryCounts(countriesRef.current);

        // Check war annexation goals (conquering a country to turn it into a State)
        const remainingWars = [...activeWarsRef.current];
        let annexedAny = false;

        for (let i = remainingWars.length - 1; i >= 0; i--) {
          const w = remainingWars[i];
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
        } else {
          setActiveWars([...activeWarsRef.current]);
          if (warCycles % 3 === 0) {
            setCountries([...countriesRef.current]);
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

      // Autonomous AI Decisions (Laws, Decrees, Ideologies, Alliances, Wars & Peace)
      if (aiAutonomyRef.current && Math.random() < 0.14 * simSpeed) {
        const activeCountries = countriesRef.current.filter((c) => c.territoryCells > 15);
        if (activeCountries.length >= 2) {
          const actor = activeCountries[Math.floor(Math.random() * activeCountries.length)];
          const roll = Math.random();

          if (roll < 0.42) {
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
          } else if (roll < 0.78) {
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
          } else if (roll < 0.9 && activeWarsRef.current.length < 3) {
            // Autonomous regional conflict between nations on same continent
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
              const aiWar: War = {
                id: `WAR_AI_${Date.now()}`,
                name: `Conflito ${actor.name} vs ${target.name}`,
                attackers: [actor.id],
                defenders: [target.id],
                startYear: nextYear,
                startDay: nextDay,
                casualties: { attackers: 0, defenders: 0 },
                isWorldWar: false,
              };
              const nextWars = [...activeWarsRef.current, aiWar];
              activeWarsRef.current = nextWars;
              setActiveWars(nextWars);
              addEvent({
                type: 'war',
                title: `Guerra Autônoma: ${actor.name} x ${target.name}`,
                description: `Tensões diplomáticas escalaram e ${actor.name} declarou guerra a ${target.name}!`,
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
  }, [isPaused, simSpeed, engine, addEvent]);

  const handleCutFinished = useCallback((cutResult: CutResult) => {
    setPendingCutInfo(cutResult);
    setIsNewCountryModalOpen(true);
  }, []);

  const handleConfirmNewCountry = (newCountry: Country) => {
    const updated = [...countriesRef.current, newCountry];
    countriesRef.current = updated;
    setCountries(updated);
    setSelectedCountry(newCountry);
    engine.recalculateTerritoryCounts(updated);
    engine.refreshFullBuffer(updated, empiresRef.current, statesRef.current);

    addEvent({
      type: 'cut',
      title: `Nova Nação Fundada: ${newCountry.name}!`,
      description: `Um novo país soberano nasceu com capital em ${newCountry.capital}.`,
      countryId: newCountry.id,
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
      engine.recalculateTerritoryCounts(updatedCountries);
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
    const nextWars = [...activeWarsRef.current, newWar];
    activeWarsRef.current = nextWars;
    setActiveWars(nextWars);
    engine.simulateWarTick([newWar], countriesRef.current, empiresRef.current, statesRef.current);
    engine.recalculateTerritoryCounts(countriesRef.current);
    addEvent({
      type: 'war',
      title: `Guerra Declarada: ${newWar.name}`,
      description: 'Tropas mobilizadas nas frentes de combate. Custos militares impactam a economia.',
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
    setAlliances((prev) => [...prev, alliance]);
    addEvent({
      type: 'alliance',
      title: `Aliança Ratificada: ${alliance.name}`,
      description: `${alliance.memberIds.length} nações formaram um pacto de defesa mútua.`,
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

    // Always store as an incorporated StateTerritory with formerCountryData so user can restore or proclaim War for Independence!
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

    engine.recalculateTerritoryCounts(updatedCountries);
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
    const countryFlag = former?.flag || {
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

    engine.recalculateTerritoryCounts(updatedCountries);
    engine.activeStateViewCountryNumId = null;
    engine.refreshFullBuffer(updatedCountries, empiresRef.current, updatedStates);
    countriesRef.current = updatedCountries;
    setCountries(updatedCountries);

    if (startWar) {
      const indWar: War = {
        id: `WAR_IND_${Date.now()}`,
        name: `Independência: ${newCountry.name} vs ${parentCountry.name}`,
        attackers: [newCountry.id],
        defenders: [parentCountry.id],
        startYear: yearRef.current,
        startDay: dayRef.current,
        casualties: { attackers: 0, defenders: 0 },
        isWorldWar: false,
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
        : `Independência Declarada: ${newCountry.name}!`,
      description: startWar
        ? `${newCountry.name} pegou em armas para conquistar sua independência de ${parentCountry.name}!`
        : `${newCountry.name} separou-se de ${parentCountry.name} e tornou-se uma nação soberana.`,
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
    const newState: StateTerritory = {
      id: `STATE_${selectedCountry.id}_${Date.now()}`,
      numericId: nextNumId,
      countryId: selectedCountry.id,
      name,
      capitalCity: capital || name,
      color: color || STATE_PALETTE[statesRef.current.length % STATE_PALETTE.length],
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
    const newWar: War = {
      id: `WAR_ANNEX_${Date.now()}`,
      name: `Anexação Estadual: ${aggressor.name} vs ${target.name}`,
      attackers: [aggressor.id],
      defenders: [target.id],
      startYear: yearRef.current,
      startDay: dayRef.current,
      casualties: { attackers: 0, defenders: 0 },
      isWorldWar: false,
      annexationGoal: {
        aggressorId: aggressor.id,
        targetId: target.id,
        targetInitialCells: Math.max(10, target.territoryCells),
      },
    };
    setActiveWars((prev) => [...prev, newWar]);
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

  const selectedEmpire = useMemo(() => {
    if (!selectedCountry?.empireId) return null;
    return empires.find((e) => e.id === selectedCountry.empireId) || null;
  }, [selectedCountry, empires]);

  const selectedCountryCities = useMemo(() => {
    if (!selectedCountry) return [];
    return cities.filter((ct) => ct.countryId === selectedCountry.id);
  }, [cities, selectedCountry]);

  const selectedCountryStates = useMemo(() => {
    if (!selectedCountry) return [];
    return states.filter((s) => s.countryId === selectedCountry.id);
  }, [states, selectedCountry]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none">
      <TopBar
        year={year}
        day={day}
        simSpeed={simSpeed}
        isPaused={isPaused}
        showDayNight={showDayNight}
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
          selectedCountry={selectedCountry}
          selectedState={selectedState}
          stateInteractionMode={stateInteractionMode}
          dayNightAngle={dayNightAngle}
          showDayNight={showDayNight}
          showLabels={true}
          isPaused={isPaused}
          simSpeed={simSpeed}
          onSelectCountry={(c) => setSelectedCountry(c)}
          onEyedropperPick={(c) => {
            setSelectedCountry(c);
            setBrushAction('paint');
            setIsEyedropperActive(false);
          }}
          onCutFinished={handleCutFinished}
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
            selectedCountry={selectedCountry}
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
            selectedCountry={selectedCountry}
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
          />
        )}

        {/* Country Inspection Drawer */}
        {currentTool === 'select' && (
          <CountryDrawer
            country={selectedCountry}
            allCountries={countries}
            empire={selectedEmpire}
            activeWars={activeWars}
            pastWars={pastWars}
            countryCities={selectedCountryCities}
            countryStates={selectedCountryStates}
            onClose={() => setSelectedCountry(null)}
            onOpenFlagStudio={(country) => {
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
        activeWars={activeWars}
        pastWars={pastWars}
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
        isOpen={isFlagStudioOpen}
        onClose={() => setIsFlagStudioOpen(false)}
        countryName={flagStudioCountry?.name}
        initialFlag={flagStudioCountry?.flag}
        onSave={(newFlag) => {
          if (flagStudioCountry) {
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
