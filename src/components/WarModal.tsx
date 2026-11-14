import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Country, War, Continent, PastWarRecord, StateTerritory } from '../types/game';
import { FlagView } from './FlagView';
import { Swords, Flame, Skull, Check, X, Globe2, RotateCcw, Search, Map as MapIcon } from 'lucide-react';
import { sound } from '../utils/audio';
import { normalizeSearch } from '../utils/text';

interface WarModalProps {
  isOpen: boolean;
  onClose: () => void;
  countries: Country[];
  states: StateTerritory[];
  activeWars: War[];
  pastWars: PastWarRecord[];
  onEnsureStatesForCountry: (country: Country) => StateTerritory[];
  onDeclareWar: (newWar: War) => void;
  onSignPeace: (warId: string) => void;
  onReopenWar: (record: PastWarRecord) => void;
  preselectedCountryId?: string | null;
}

export const WarModal: React.FC<WarModalProps> = ({
  isOpen,
  onClose,
  countries,
  states,
  activeWars,
  pastWars,
  onEnsureStatesForCountry,
  onDeclareWar,
  onSignPeace,
  onReopenWar,
  preselectedCountryId,
}) => {
  const [aggressorId, setAggressorId] = useState<string>(
    preselectedCountryId || countries[0]?.id || 'USA'
  );
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [targetScope, setTargetScope] = useState<'country' | 'state'>('country');
  const [targetStateId, setTargetStateId] = useState<string>('');
  const [stateTargetSearch, setStateTargetSearch] = useState('');
  const [warName, setWarName] = useState('Grande Conflito Territorial');

  // Search states
  const [aggressorSearch, setAggressorSearch] = useState('');
  const [showAggressorList, setShowAggressorList] = useState(false);
  const [targetSearch, setTargetSearch] = useState('');
  const [warSearch, setWarSearch] = useState('');
  const wasOpenRef = useRef(false);

  // Only reset search inputs when transitioning from closed -> open (not on background country updates!)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      if (preselectedCountryId) {
        setAggressorId(preselectedCountryId);
        setTargetIds((prev) => prev.filter((id) => id !== preselectedCountryId));
      }
      setAggressorSearch('');
      setTargetSearch('');
      setWarSearch('');
      setStateTargetSearch('');
      setTargetScope('country');
      setTargetStateId('');
      setShowAggressorList(false);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, preselectedCountryId]);

  const singleTargetCountry = useMemo(() => {
    if (targetIds.length !== 1) return null;
    return countries.find((c) => c.id === targetIds[0]) || null;
  }, [countries, targetIds]);

  const singleTargetStates = useMemo(() => {
    if (!singleTargetCountry) return [];
    const q = normalizeSearch(stateTargetSearch);
    const list = states.filter(
      (s) => s.countryId === singleTargetCountry.id && s.territoryCells > 0
    );
    return (q ? list.filter((s) => normalizeSearch(s.name).includes(q)) : list)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [states, singleTargetCountry, stateTargetSearch]);

  const filteredAggressors = useMemo(() => {
    const q = normalizeSearch(aggressorSearch);
    const list = q
      ? countries.filter(
          (c) =>
            normalizeSearch(c.name).includes(q) ||
            normalizeSearch(c.capital).includes(q) ||
            normalizeSearch(c.continent).includes(q)
        )
      : countries;
    return list.slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [countries, aggressorSearch]);

  const filteredTargets = useMemo(() => {
    const q = normalizeSearch(targetSearch);
    const list = countries.filter((c) => c.id !== aggressorId && c.territoryCells > 0);
    const filtered = q
      ? list.filter(
          (c) =>
            normalizeSearch(c.name).includes(q) ||
            normalizeSearch(c.capital).includes(q) ||
            normalizeSearch(c.continent).includes(q)
        )
      : list;
    return filtered.slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [countries, aggressorId, targetSearch]);

  const filteredActiveWars = useMemo(() => {
    const q = normalizeSearch(warSearch);
    if (!q) return activeWars;
    return activeWars.filter((w) => {
      if (normalizeSearch(w.name).includes(q)) return true;
      return [...w.attackers, ...w.defenders].some((cid) => {
        const c = countries.find((item) => item.id === cid);
        return c ? normalizeSearch(c.name).includes(q) : false;
      });
    });
  }, [activeWars, warSearch, countries]);

  const filteredPastWars = useMemo(() => {
    const q = normalizeSearch(warSearch);
    if (!q) return pastWars;
    return pastWars.filter((pw) => {
      if (normalizeSearch(pw.name).includes(q)) return true;
      return [...pw.attackers, ...pw.defenders].some((cid) => {
        const c = countries.find((item) => item.id === cid);
        return c ? normalizeSearch(c.name).includes(q) : false;
      });
    });
  }, [pastWars, warSearch, countries]);

  if (!isOpen) return null;

  const toggleTarget = (id: string) => {
    sound.playClick();
    if (targetIds.includes(id)) {
      setTargetIds(targetIds.filter((item) => item !== id));
      setTargetScope('country');
      setTargetStateId('');
    } else {
      const next = [...targetIds, id];
      setTargetIds(next);
      if (next.length !== 1) {
        setTargetScope('country');
        setTargetStateId('');
      }
    }
  };

  const selectEntireContinent = (continent: Continent) => {
    sound.playClick();
    const continentCountryIds = countries
      .filter((c) => c.continent === continent && c.id !== aggressorId)
      .map((c) => c.id);

    const merged = Array.from(new Set([...targetIds, ...continentCountryIds]));
    setTargetIds(merged);
    if (merged.length !== 1) {
      setTargetScope('country');
      setTargetStateId('');
    }
  };

  const handleEnableStateTargeting = () => {
    if (!singleTargetCountry) return;
    sound.playClick();
    const loadedStates = onEnsureStatesForCountry(singleTargetCountry);
    setTargetScope('state');
    const firstValid = loadedStates.find((s) => s.territoryCells > 0);
    if (firstValid) setTargetStateId(firstValid.id);
  };

  const selectedTargetState =
    targetScope === 'state' && singleTargetCountry
      ? states.find((s) => s.id === targetStateId && s.countryId === singleTargetCountry.id) || null
      : null;

  const handleDeclare = () => {
    if (targetIds.length === 0) return;

    sound.playWarCannon();

    const aggressorCountry = countries.find((c) => c.id === aggressorId);
    const targetNames = targetIds
      .map((id) => countries.find((c) => c.id === id)?.name)
      .filter(Boolean);

    const generatedName =
      selectedTargetState && singleTargetCountry
        ? `Guerra por ${selectedTargetState.name}: ${aggressorCountry?.name} vs ${singleTargetCountry.name}`
        : targetIds.length > 2
        ? `Guerra Mundial: ${aggressorCountry?.name} vs Coalizão`
        : `Guerra de ${aggressorCountry?.name} contra ${targetNames.join(', ')}`;

    const newWar: War = {
      id: `WAR_${Date.now()}`,
      name:
        warName.trim() && warName !== 'Grande Conflito Territorial'
          ? warName.trim()
          : generatedName,
      attackers: [aggressorId],
      defenders: targetIds,
      startYear: 2026,
      startDay: Math.floor(Math.random() * 300) + 1,
      casualties: { attackers: 0, defenders: 0 },
      isWorldWar: targetIds.length >= 3,
      ...(selectedTargetState && singleTargetCountry
        ? {
            targetState: {
              stateId: selectedTargetState.id,
              stateNumericId: selectedTargetState.numericId,
              parentCountryId: singleTargetCountry.id,
              stateName: selectedTargetState.name,
            },
          }
        : {}),
    };

    onDeclareWar(newWar);
    onClose();
  };

  const aggressor = countries.find((c) => c.id === aggressorId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-red-600/40 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-red-900/40 flex items-center justify-between bg-gradient-to-r from-red-950/60 to-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-600/20 text-red-500 flex items-center justify-center border border-red-500/30">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-cinzel text-red-400">
                Gabinete de Guerra & Conflitos
              </h3>
              <p className="text-xs text-slate-400">
                Pesquise países, declare guerra bilateral, coalizão ou Guerra Mundial
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Active & Past Wars Search if any wars exist */}
          {(activeWars.length > 0 || pastWars.length > 0) && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={warSearch}
                onChange={(e) => setWarSearch(e.target.value)}
                placeholder="Pesquisar guerras ativas ou tratados anteriores..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          {/* Active Wars Section */}
          {filteredActiveWars.length > 0 && (
            <div className="p-3 bg-red-950/20 border border-red-900/50 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wide">
                <Flame className="w-4 h-4 text-red-500" /> Guerras Ativas ({filteredActiveWars.length})
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {filteredActiveWars.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between p-2 bg-slate-950 rounded border border-red-950 text-xs"
                  >
                    <div>
                      <strong className="text-white">{w.name}</strong>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 text-red-300">
                          <Skull className="w-3 h-3 text-red-400" />{' '}
                          {(w.casualties.attackers + w.casualties.defenders).toLocaleString()} baixas
                        </span>
                        {w.isWorldWar && (
                          <span className="bg-red-900/60 text-red-200 px-1.5 py-0.2 rounded text-[10px]">
                            Guerra Mundial
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onSignPeace(w.id)}
                      className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
                    >
                      Assinar Paz
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past Wars Section */}
          {filteredPastWars.length > 0 && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wide">
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> Tratados Anteriores (Voltar à Guerra)
              </div>
              <div className="space-y-1.5 max-h-28 overflow-y-auto">
                {filteredPastWars.map((pw) => (
                  <div
                    key={pw.id}
                    className="flex items-center justify-between p-2 bg-slate-900 rounded border border-slate-800 text-xs"
                  >
                    <span className="text-slate-200 font-medium truncate pr-2">{pw.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playWarCannon();
                        onReopenWar(pw);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-red-600/25 hover:bg-red-600/45 text-red-300 border border-red-500/40 rounded shrink-0 transition-colors"
                    >
                      Voltar à Guerra
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aggressor Country Searchable Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              1. Selecione a Nação Beligerante (Agressora)
            </label>
            <button
              type="button"
              onClick={() => setShowAggressorList((v) => !v)}
              className="w-full flex items-center justify-between gap-3 bg-slate-800 hover:bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white transition-colors"
            >
              {aggressor ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  <FlagView flag={aggressor.flag} width={26} height={17} />
                  <span className="font-bold truncate">{aggressor.name}</span>
                  <span className="text-xs text-slate-400 truncate">
                    · Poder Militar: {aggressor.militaryPower} · {aggressor.continent}
                  </span>
                </div>
              ) : (
                <span className="text-slate-400">Escolher país agressor...</span>
              )}
              <span className="text-xs text-amber-400 font-semibold shrink-0">
                {showAggressorList ? 'Fechar' : 'Pesquisar / Trocar'}
              </span>
            </button>

            {showAggressorList && (
              <div className="p-2.5 bg-slate-950 border border-slate-700 rounded-lg space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={aggressorSearch}
                    onChange={(e) => setAggressorSearch(e.target.value)}
                    placeholder="Pesquisar nome do país agressor..."
                    autoFocus
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {filteredAggressors.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setAggressorId(c.id);
                        setTargetIds((prev) => prev.filter((id) => id !== c.id));
                        setShowAggressorList(false);
                      }}
                      className={`flex items-center gap-2 p-1.5 rounded-md border text-left text-xs transition-colors ${
                        c.id === aggressorId
                          ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                          : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <FlagView flag={c.flag} width={20} height={14} />
                      <span className="truncate flex-1 font-medium">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Target Countries Search + Continent Selectors */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-amber-400" />
              2. Pesquise e Selecione os Alvos ({targetIds.length} selecionados)
            </label>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={targetSearch}
                onChange={(e) => setTargetSearch(e.target.value)}
                placeholder="Pesquisar país alvo pelo nome, capital ou continente..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 py-1">Atacar bloco:</span>
              {(['América do Sul', 'Europa', 'Ásia', 'África'] as Continent[]).map((cont) => (
                <button
                  key={cont}
                  type="button"
                  onClick={() => selectEntireContinent(cont)}
                  className="px-2 py-0.5 text-[11px] rounded bg-slate-800 hover:bg-red-900/40 hover:text-red-300 border border-slate-700 transition-colors"
                >
                  Toda a {cont}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTargetIds([])}
                className="px-2 py-0.5 text-[11px] rounded bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
              >
                Limpar seleção
              </button>
            </div>
          </div>

          {/* Target Countries Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-950 rounded-lg border border-slate-800">
            {filteredTargets.length === 0 ? (
              <p className="col-span-full text-center text-xs text-slate-500 py-4">
                Nenhum país encontrado para "{targetSearch}"
              </p>
            ) : (
              filteredTargets.map((c) => {
                const isSelected = targetIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleTarget(c.id)}
                    className={`flex items-center gap-2 p-1.5 rounded-md border text-left text-xs transition-colors ${
                      isSelected
                        ? 'border-red-500 bg-red-600/20 text-red-200'
                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <FlagView flag={c.flag} width={22} height={15} />
                    <span className="truncate flex-1 font-medium">{c.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Target Scope: Entire Country OR Specific State */}
          {singleTargetCountry && (
            <div className="p-3 bg-slate-950 border border-amber-500/40 rounded-lg space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <MapIcon className="w-3.5 h-3.5" />
                  Alvo em {singleTargetCountry.name}:
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setTargetScope('country');
                      setTargetStateId('');
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors ${
                      targetScope === 'country'
                        ? 'bg-red-600 text-white border-red-400'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
                    }`}
                  >
                    País Inteiro
                  </button>
                  <button
                    type="button"
                    onClick={handleEnableStateTargeting}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors ${
                      targetScope === 'state'
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-slate-900 text-amber-300 border-amber-500/40 hover:bg-amber-950/40'
                    }`}
                  >
                    Estado Específico
                  </button>
                </div>
              </div>

              {targetScope === 'state' && (
                <div className="space-y-2 pt-1 border-t border-slate-800">
                  <p className="text-[11px] text-slate-400">
                    Somente o estado selecionado será atacado (os outros estados de{' '}
                    <strong>{singleTargetCountry.name}</strong> não entram nas fronteiras de combate):
                  </p>
                  <div className="relative">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={stateTargetSearch}
                      onChange={(e) => setStateTargetSearch(e.target.value)}
                      placeholder={`Buscar estado de ${singleTargetCountry.name}...`}
                      className="w-full bg-slate-900 border border-slate-700 rounded pl-7 pr-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-32 overflow-y-auto">
                    {singleTargetStates.map((st) => {
                      const isStSelected = targetStateId === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            setTargetStateId(st.id);
                          }}
                          className={`flex items-center gap-1.5 p-1.5 rounded border text-left text-[11px] transition-colors ${
                            isStSelected
                              ? 'border-amber-400 bg-amber-500/20 text-amber-200 font-bold'
                              : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <FlagView flag={st.flag || singleTargetCountry.flag} width={18} height={12} />
                          <span className="truncate flex-1">{st.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* War Name */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Nome do Conflito / Casus Belli
            </label>
            <input
              type="text"
              value={warName}
              onChange={(e) => setWarName(e.target.value)}
              placeholder="Ex: Guerra de Libertação, Guerra de Conquista..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex justify-between items-center bg-slate-950">
          <div className="text-xs text-slate-400">
            {targetIds.length === 0 ? (
              'Selecione ao menos 1 alvo'
            ) : selectedTargetState && singleTargetCountry ? (
              <span className="text-amber-300 font-bold">
                Alvo: Estado {selectedTargetState.name} ({singleTargetCountry.name})
              </span>
            ) : targetIds.length >= 3 ? (
              <span className="text-red-400 font-bold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> Estado de Guerra Mundial ({targetIds.length} nações)
              </span>
            ) : (
              <span>{targetIds.length} país(es) em combate</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              disabled={targetIds.length === 0}
              onClick={handleDeclare}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-lg ${
                targetIds.length > 0
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Swords className="w-4 h-4" /> Declarar Guerra Oficial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
