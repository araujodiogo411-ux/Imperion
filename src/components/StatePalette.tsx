import React, { useState, useMemo } from 'react';
import { Country, StateTerritory, StateWar } from '../types/game';
import { STATE_PALETTE } from '../data/worldCountries';
import { FlagView } from './FlagView';
import {
  MapPin,
  Pipette,
  Plus,
  Edit3,
  Crown,
  Swords,
  Search,
  Building2,
  Check,
  X,
  Flag,
  Target,
  Scissors,
  Gift,
  DollarSign,
} from 'lucide-react';
import { sound } from '../utils/audio';
import { normalizeSearch } from '../utils/text';

export type StateInteractionMode =
  | 'paint_state'
  | 'scissors_state'
  | 'move_capital'
  | 'add_city'
  | 'place_new_state';

interface StatePaletteProps {
  countries: Country[];
  selectedCountry: Country | null;
  states: StateTerritory[];
  selectedState: StateTerritory | null;
  stateWars: StateWar[];
  brushRadius: number;
  isEyedropperActive: boolean;
  interactionMode: StateInteractionMode;
  pendingCityName: string;
  pendingCityIsStateCap: boolean;
  onSelectCountry: (country: Country) => void;
  onSelectState: (state: StateTerritory) => void;
  onChangeRadius: (r: number) => void;
  onToggleEyedropper: () => void;
  onChangeInteractionMode: (mode: StateInteractionMode) => void;
  onChangePendingCityName: (name: string) => void;
  onTogglePendingCityIsStateCap: () => void;
  onCreateNewState: (name: string, capital: string, color: string, placeOnMap: boolean) => void;
  onRenameState: (stateId: string, newName: string, newCapital: string) => void;
  onSetCapitalFromState: (country: Country, state: StateTerritory) => void;
  onStartAnnexWar: (aggressor: Country, target: Country) => void;
  onDeclareStateIndependence: (
    parentCountry: Country,
    state: StateTerritory,
    startWar: boolean
  ) => void;
  onStartStateWar: (country: Country, attState: StateTerritory, defState: StateTerritory) => void;
  onEndStateWar: (warId: string) => void;
  onOpenStateFlagStudio: (state: StateTerritory) => void;
  onDonateState: (donorCountry: Country, state: StateTerritory, recipientCountry: Country) => void;
  onSellState: (
    sellerCountry: Country,
    state: StateTerritory,
    buyerCountry: Country,
    priceBillions: number
  ) => void;
}

export const StatePalette: React.FC<StatePaletteProps> = ({
  countries,
  selectedCountry,
  states,
  selectedState,
  stateWars,
  brushRadius,
  isEyedropperActive,
  interactionMode,
  pendingCityName,
  pendingCityIsStateCap,
  onSelectCountry,
  onSelectState,
  onChangeRadius,
  onToggleEyedropper,
  onChangeInteractionMode,
  onChangePendingCityName,
  onTogglePendingCityIsStateCap,
  onCreateNewState,
  onRenameState,
  onSetCapitalFromState,
  onStartAnnexWar,
  onDeclareStateIndependence,
  onStartStateWar,
  onEndStateWar,
  onOpenStateFlagStudio,
  onDonateState,
  onSellState,
}) => {
  const [search, setSearch] = useState('');
  const [stateSearch, setStateSearch] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showAnnexPicker, setShowAnnexPicker] = useState(false);
  const [annexSearch, setAnnexSearch] = useState('');

  // Donate / Sell State popups
  const [showDonateStatePicker, setShowDonateStatePicker] = useState(false);
  const [donateStateSearch, setDonateStateSearch] = useState('');
  const [showSellStatePicker, setShowSellStatePicker] = useState(false);
  const [sellStateSearch, setSellStateSearch] = useState('');
  const [sellBuyerId, setSellBuyerId] = useState('');
  const [sellPriceInput, setSellPriceInput] = useState('45');

  // Clean "Fundar Novo Estado" modal popover
  const [showNewStateModal, setShowNewStateModal] = useState(false);
  const [newStateName, setNewStateName] = useState('');
  const [newStateCapital, setNewStateCapital] = useState('');
  const [newStateColor, setNewStateColor] = useState(STATE_PALETTE[0]);

  // Civil / Inter-State War panel
  const [showStateWarModal, setShowStateWarModal] = useState(false);
  const [warAttStateId, setWarAttStateId] = useState('');
  const [warDefStateId, setWarDefStateId] = useState('');
  const [warStateSearch, setWarStateSearch] = useState('');

  // Rename State popup
  const [editingStateId, setEditingStateId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCap, setEditCap] = useState('');

  const allCountryStates = useMemo(() => {
    if (!selectedCountry) return [];
    return states.filter((s) => s.countryId === selectedCountry.id);
  }, [states, selectedCountry]);

  const countryStates = useMemo(() => {
    const q = normalizeSearch(stateSearch);
    return q
      ? allCountryStates.filter(
          (s) =>
            normalizeSearch(s.name).includes(q) ||
            normalizeSearch(s.capitalCity).includes(q)
        )
      : allCountryStates;
  }, [allCountryStates, stateSearch]);

  const activeCountryStateWars = useMemo(() => {
    if (!selectedCountry) return [];
    return stateWars.filter((sw) => sw.countryId === selectedCountry.id);
  }, [stateWars, selectedCountry]);

  const filteredCountries = useMemo(() => {
    const q = normalizeSearch(search);
    const list = q
      ? countries.filter((c) => normalizeSearch(c.name).includes(q))
      : countries;
    return list.slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [countries, search]);

  const annexTargets = useMemo(() => {
    if (!selectedCountry) return [];
    const q = normalizeSearch(annexSearch);
    return countries
      .filter((c) => c.id !== selectedCountry.id && c.territoryCells > 0)
      .filter((c) => (!q ? true : normalizeSearch(c.name).includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [countries, selectedCountry, annexSearch]);

  const filteredWarStates = useMemo(() => {
    const q = normalizeSearch(warStateSearch);
    const active = allCountryStates.filter((s) => s.territoryCells > 0);
    return q ? active.filter((s) => normalizeSearch(s.name).includes(q)) : active;
  }, [allCountryStates, warStateSearch]);

  const donateCandidates = useMemo(() => {
    if (!selectedCountry) return [];
    const q = normalizeSearch(donateStateSearch);
    return countries
      .filter((c) => c.id !== selectedCountry.id && c.territoryCells > 0)
      .filter((c) => (!q ? true : normalizeSearch(c.name).includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [countries, selectedCountry, donateStateSearch]);

  const sellCandidates = useMemo(() => {
    if (!selectedCountry) return [];
    const q = normalizeSearch(sellStateSearch);
    return countries
      .filter((c) => c.id !== selectedCountry.id && c.territoryCells > 0)
      .filter((c) => (!q ? true : normalizeSearch(c.name).includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [countries, selectedCountry, sellStateSearch]);

  const suggestStatePrice = (st: StateTerritory | null): number => {
    if (!st) return 30;
    return Math.max(5, Math.round(st.territoryCells * 1.4));
  };

  const openNewStateCreator = () => {
    sound.playClick();
    setNewStateName('');
    setNewStateCapital('');
    setNewStateColor(STATE_PALETTE[allCountryStates.length % STATE_PALETTE.length]);
    setShowNewStateModal(true);
    setShowCountryPicker(false);
    setShowAnnexPicker(false);
    setShowStateWarModal(false);
    setShowDonateStatePicker(false);
    setShowSellStatePicker(false);
  };

  const openStateWarCreator = () => {
    sound.playClick();
    const active = allCountryStates.filter((s) => s.territoryCells > 0);
    const att = selectedState && selectedState.territoryCells > 0 ? selectedState : active[0];
    const def = active.find((s) => s.id !== att?.id) || active[1];
    setWarAttStateId(att?.id || '');
    setWarDefStateId(def?.id || '');
    setWarStateSearch('');
    setShowStateWarModal((v) => !v);
    setShowNewStateModal(false);
    setShowCountryPicker(false);
    setShowAnnexPicker(false);
    setShowDonateStatePicker(false);
    setShowSellStatePicker(false);
  };

  return (
    <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 pointer-events-auto w-[calc(100vw-0.75rem)] sm:w-auto max-w-[96vw]">
      {/* Country Picker Popup */}
      {showCountryPicker && (
        <div className="w-80 max-w-[calc(100vw-1rem)] bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl p-3 space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar país para ver estados..."
              autoFocus
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>
          <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
            {filteredCountries.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  sound.playClick();
                  onSelectCountry(c);
                  setShowCountryPicker(false);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${
                  selectedCountry?.id === c.id
                    ? 'bg-amber-400/20 text-amber-200 border border-amber-400/40'
                    : 'hover:bg-slate-800 text-slate-200'
                }`}
              >
                <FlagView flag={c.flag} width={22} height={15} />
                <span className="truncate flex-1 font-medium">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Clean "Fundar Novo Estado" Modal Popover */}
      {showNewStateModal && selectedCountry && (
        <div className="w-96 max-w-[calc(100vw-1rem)] bg-slate-900/98 backdrop-blur-md border border-emerald-500/50 rounded-xl shadow-2xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-300 flex items-center gap-1.5 text-sm">
              <Plus className="w-4 h-4" /> Fundar Novo Estado em {selectedCountry.name}
            </span>
            <button
              onClick={() => setShowNewStateModal(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Nome do Novo Estado</label>
              <input
                type="text"
                value={newStateName}
                onChange={(e) => setNewStateName(e.target.value)}
                placeholder="Ex: Guanabara, Novo Sul..."
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Capital do Estado</label>
              <input
                type="text"
                value={newStateCapital}
                onChange={(e) => setNewStateCapital(e.target.value)}
                placeholder="Deixe vazio para usar o nome do estado"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Cor do Estado no Mapa</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {STATE_PALETTE.slice(0, 10).map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setNewStateColor(col)}
                    style={{ backgroundColor: col }}
                    className={`w-5 h-5 rounded-full border transition-transform ${
                      newStateColor === col ? 'border-white scale-125' : 'border-slate-700'
                    }`}
                  />
                ))}
                <input
                  type="color"
                  value={newStateColor}
                  onChange={(e) => setNewStateColor(e.target.value)}
                  className="w-6 h-6 rounded-full border border-slate-600 bg-transparent cursor-pointer p-0"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled={!newStateName.trim()}
              onClick={() => {
                if (!newStateName.trim()) return;
                sound.playClick();
                onCreateNewState(
                  newStateName.trim(),
                  newStateCapital.trim() || newStateName.trim(),
                  newStateColor,
                  true
                );
                setShowNewStateModal(false);
              }}
              className="py-2 px-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <Target className="w-3.5 h-3.5" /> Demarcar no Mapa
            </button>
            <button
              type="button"
              disabled={!newStateName.trim()}
              onClick={() => {
                if (!newStateName.trim()) return;
                sound.playClick();
                onCreateNewState(
                  newStateName.trim(),
                  newStateCapital.trim() || newStateName.trim(),
                  newStateColor,
                  false
                );
                setShowNewStateModal(false);
              }}
              className="py-2 px-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-emerald-300 border border-emerald-500/40 font-semibold rounded-lg transition-colors"
            >
              Pintar com Pincel
            </button>
          </div>
        </div>
      )}

      {/* Inter-State Civil War Panel */}
      {showStateWarModal && selectedCountry && (
        <div className="w-96 max-w-[calc(100vw-1rem)] bg-slate-900/98 backdrop-blur-md border border-orange-500/50 rounded-xl shadow-2xl p-3.5 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-orange-300 flex items-center gap-1.5">
              <Swords className="w-4 h-4" /> Guerra entre Estados ({selectedCountry.name})
            </span>
            <button
              onClick={() => setShowStateWarModal(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            type="text"
            value={warStateSearch}
            onChange={(e) => setWarStateSearch(e.target.value)}
            placeholder="Filtrar estados..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-orange-400"
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-orange-300 font-semibold block mb-1">
                Estado Atacante
              </label>
              <select
                value={warAttStateId}
                onChange={(e) => setWarAttStateId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
              >
                {filteredWarStates.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-red-300 font-semibold block mb-1">
                Estado Defensor
              </label>
              <select
                value={warDefStateId}
                onChange={(e) => setWarDefStateId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
              >
                {filteredWarStates.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            disabled={!warAttStateId || !warDefStateId || warAttStateId === warDefStateId}
            onClick={() => {
              const att = allCountryStates.find((s) => s.id === warAttStateId);
              const def = allCountryStates.find((s) => s.id === warDefStateId);
              if (att && def && att.id !== def.id) {
                sound.playWarCannon();
                onStartStateWar(selectedCountry, att, def);
              }
            }}
            className="w-full py-1.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-slate-950 font-bold rounded-lg transition-colors"
          >
            Iniciar Guerra entre Estados
          </button>

          {activeCountryStateWars.length > 0 && (
            <div className="space-y-1 max-h-28 overflow-y-auto pt-1 border-t border-slate-800">
              {activeCountryStateWars.map((sw) => (
                <div
                  key={sw.id}
                  className="flex items-center justify-between gap-2 p-1.5 bg-slate-950 border border-slate-800 rounded"
                >
                  <span className="truncate text-orange-200 font-medium">{sw.name}</span>
                  <button
                    onClick={() => onEndStateWar(sw.id)}
                    className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold shrink-0"
                  >
                    Assinar Paz
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Annex Foreign Country as State (War) Popup */}
      {showAnnexPicker && selectedCountry && (
        <div className="w-80 max-w-[calc(100vw-1rem)] bg-slate-900/95 backdrop-blur-md border border-red-500/40 rounded-xl shadow-2xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-red-300 flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5" /> Conquistar País como Estado
            </span>
            <button onClick={() => setShowAnnexPicker(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Se <strong>{selectedCountry.name}</strong> dominar o país na guerra, ele vira um novo Estado!
          </p>
          <input
            type="text"
            value={annexSearch}
            onChange={(e) => setAnnexSearch(e.target.value)}
            placeholder="Escolher país alvo..."
            autoFocus
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-400"
          />
          <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
            {annexTargets.map((target) => (
              <button
                key={target.id}
                onClick={() => {
                  sound.playWarCannon();
                  onStartAnnexWar(selectedCountry, target);
                  setShowAnnexPicker(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left hover:bg-red-950/50 text-slate-200 transition-colors"
              >
                <FlagView flag={target.flag} width={20} height={14} />
                <span className="truncate flex-1">{target.name}</span>
                <span className="text-[10px] text-red-400 font-semibold">Guerrear</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Donate State Picker Popup */}
      {showDonateStatePicker && selectedCountry && selectedState && (
        <div className="w-84 max-w-[calc(100vw-1rem)] bg-slate-900/98 backdrop-blur-md border border-purple-500/50 rounded-xl shadow-2xl p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-purple-300 flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5" /> Doar Estado {selectedState.name}
            </span>
            <button onClick={() => setShowDonateStatePicker(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Transferir o estado <strong>{selectedState.name}</strong> gratuitamente para outro país:
          </p>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={donateStateSearch}
              onChange={(e) => setDonateStateSearch(e.target.value)}
              placeholder="Pesquisar país recebedor..."
              autoFocus
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
            />
          </div>
          <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
            {donateCandidates.map((target) => (
              <button
                key={target.id}
                onClick={() => {
                  sound.playPeaceChime();
                  onDonateState(selectedCountry, selectedState, target);
                  setShowDonateStatePicker(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left hover:bg-purple-950/50 text-slate-200 transition-colors"
              >
                <FlagView flag={target.flag} width={20} height={14} />
                <span className="truncate flex-1 font-medium">{target.name}</span>
                <span className="text-[10px] text-purple-300 font-semibold">Doar Estado</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sell State Picker Popup */}
      {showSellStatePicker && selectedCountry && selectedState && (
        <div className="w-96 max-w-[calc(100vw-1rem)] bg-slate-900/98 backdrop-blur-md border border-emerald-500/50 rounded-xl shadow-2xl p-3.5 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-300 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" /> Vender Estado {selectedState.name}
            </span>
            <button onClick={() => setShowSellStatePicker(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Área: <strong>{selectedState.territoryCells} px</strong> · Preço sugerido:{' '}
            <strong className="text-emerald-300 font-mono-numbers">
              ${suggestStatePrice(selectedState)} Bi
            </strong>
          </p>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={sellStateSearch}
              onChange={(e) => setSellStateSearch(e.target.value)}
              placeholder="Pesquisar país comprador..."
              autoFocus
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
            />
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
            {sellCandidates.map((buyer) => (
              <button
                key={buyer.id}
                type="button"
                onClick={() => {
                  sound.playClick();
                  setSellBuyerId(buyer.id);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${
                  sellBuyerId === buyer.id
                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-200'
                    : 'hover:bg-slate-800 text-slate-200'
                }`}
              >
                <FlagView flag={buyer.flag} width={20} height={14} />
                <span className="truncate flex-1 font-medium">{buyer.name}</span>
                <span className="text-[10px] text-slate-400 font-mono-numbers">
                  PIB ${buyer.gdp.toLocaleString()} Bi
                </span>
              </button>
            ))}
          </div>
          {sellBuyerId && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <span className="text-[11px] text-slate-400 shrink-0">Preço ($ Bi):</span>
              <input
                type="number"
                min="1"
                step="1"
                value={sellPriceInput}
                onChange={(e) => setSellPriceInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono-numbers focus:outline-none focus:border-emerald-400"
              />
              <button
                type="button"
                disabled={Number(sellPriceInput) <= 0}
                onClick={() => {
                  const buyer = countries.find((c) => c.id === sellBuyerId);
                  const price = Math.max(1, Number(sellPriceInput) || 0);
                  if (buyer) {
                    onSellState(selectedCountry, selectedState, buyer, price);
                    setShowSellStatePicker(false);
                  }
                }}
                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold rounded text-[11px] transition-colors"
              >
                Propor Venda
              </button>
            </div>
          )}
        </div>
      )}

      {/* Rename State Popup */}
      {editingStateId && (
        <div className="w-80 max-w-[calc(100vw-1rem)] bg-slate-900/95 backdrop-blur-md border border-amber-500/40 rounded-xl shadow-2xl p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-300">Editar Estado &amp; Capital</span>
            <button onClick={() => setEditingStateId(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Nome do Estado"
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-400"
          />
          <input
            type="text"
            value={editCap}
            onChange={(e) => setEditCap(e.target.value)}
            placeholder="Capital do Estado"
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-400"
          />
          <button
            onClick={() => {
              if (editName.trim()) {
                sound.playClick();
                onRenameState(editingStateId, editName.trim(), editCap.trim() || editName.trim());
                setEditingStateId(null);
              }
            }}
            className="w-full py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded flex items-center justify-center gap-1"
          >
            <Check className="w-3.5 h-3.5" /> Salvar Alterações
          </button>
        </div>
      )}

      {/* Main States Dock */}
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-xl shadow-2xl p-2.5 sm:p-3 flex flex-col gap-2 sm:gap-2.5 w-full sm:w-[860px] max-w-[96vw] max-h-[42vh] sm:max-h-none overflow-y-auto sm:overflow-visible text-xs">
        {/* Top Row: Country Selection + Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => {
              sound.playClick();
              setShowCountryPicker((v) => !v);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors"
          >
            {selectedCountry ? (
              <>
                <FlagView flag={selectedCountry.flag} width={22} height={15} />
                <span className="font-bold text-white">{selectedCountry.name}</span>
              </>
            ) : (
              <span className="text-amber-400 font-semibold">Selecionar País...</span>
            )}
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onToggleEyedropper();
            }}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border transition-colors ${
              isEyedropperActive
                ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="Pegar país clicando no mapa"
          >
            <Pipette className="w-3.5 h-3.5" />
            <span>Pegar</span>
          </button>

          <div className="w-[1px] h-5 bg-slate-800" />

          {/* Interaction Modes */}
          <button
            onClick={() => {
              sound.playClick();
              onChangeInteractionMode('paint_state');
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-colors ${
              interactionMode === 'paint_state'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            <span>Pintar Estado</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onChangeInteractionMode('scissors_state');
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-colors ${
              interactionMode === 'scissors_state'
                ? 'bg-lime-400 text-slate-950 border-lime-300 font-bold'
                : 'bg-slate-800 text-lime-300 border-slate-700 hover:text-white'
            }`}
            title="Desenhe um corte dentro do país para fundar um novo Estado com bandeira"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Tesoura (Novo Estado)</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onChangeInteractionMode('move_capital');
            }}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border transition-colors ${
              interactionMode === 'move_capital'
                ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="Clique no mapa para mover o ponto da Capital Nacional"
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Mover Capital</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onChangeInteractionMode('add_city');
            }}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border transition-colors ${
              interactionMode === 'add_city'
                ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-bold'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Nova Cidade</span>
          </button>

          {selectedCountry && (
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={openStateWarCreator}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border font-semibold transition-colors ${
                  activeCountryStateWars.length > 0 || showStateWarModal
                    ? 'bg-orange-500/25 text-orange-300 border-orange-500/50'
                    : 'bg-slate-800 text-orange-300 border-slate-700 hover:bg-orange-950/40'
                }`}
                title="Guerra civil entre estados deste país"
              >
                <Swords className="w-3.5 h-3.5" />
                <span>Guerra Estadual{activeCountryStateWars.length > 0 ? ` (${activeCountryStateWars.length})` : ''}</span>
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  setShowAnnexPicker((v) => !v);
                  setShowNewStateModal(false);
                  setShowStateWarModal(false);
                }}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/35 text-red-300 border border-red-500/40 font-semibold transition-colors"
                title="Conquistar outro país via guerra para torná-lo um novo Estado"
              >
                <Swords className="w-3.5 h-3.5" />
                <span>Anexar País</span>
              </button>
            </div>
          )}
        </div>

        {/* City Creator Input Bar */}
        {interactionMode === 'add_city' && (
          <div className="flex items-center gap-2 p-2 bg-slate-950 rounded-lg border border-cyan-500/40">
            <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
            <input
              type="text"
              value={pendingCityName}
              onChange={(e) => onChangePendingCityName(e.target.value)}
              placeholder="Nome da nova cidade..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
            <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={pendingCityIsStateCap}
                onChange={onTogglePendingCityIsStateCap}
                className="accent-cyan-400"
              />
              Capital de Estado
            </label>
            <span className="text-[11px] text-cyan-300 font-medium">
              Clique no mapa para posicionar
            </span>
          </div>
        )}

        {interactionMode === 'move_capital' && (
          <div className="px-3 py-1.5 bg-amber-950/30 border border-amber-500/30 rounded-lg text-[11px] text-amber-200">
            Clique dentro de <strong>{selectedCountry?.name || 'um país'}</strong> no mapa para mover sua Capital Nacional!
          </div>
        )}

        {interactionMode === 'place_new_state' && selectedState && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-emerald-950/40 border border-emerald-500/50 rounded-lg text-[11px] text-emerald-200">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Clique dentro de <strong>{selectedCountry?.name}</strong> no mapa para demarcar o território inicial de{' '}
                <strong className="text-white">{selectedState.name}</strong>!
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-slate-400">Raio:</span>
              <input
                type="range"
                min={4}
                max={30}
                value={brushRadius}
                onChange={(e) => onChangeRadius(Number(e.target.value))}
                className="w-16 accent-emerald-400"
              />
              <button
                onClick={() => onChangeInteractionMode('paint_state')}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700"
              >
                Concluir
              </button>
            </div>
          </div>
        )}

        {interactionMode === 'scissors_state' && (
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-lime-950/40 border border-lime-500/45 rounded-lg text-[11px] text-lime-200">
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-lime-400 shrink-0" />
              <span>
                Arraste dentro de <strong>{selectedCountry?.name || 'um país'}</strong> para cortar e fundar um novo Estado com nome, capital e bandeira!
              </span>
            </div>
            <button
              onClick={() => onChangeInteractionMode('paint_state')}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 shrink-0"
            >
              Voltar ao Pincel
            </button>
          </div>
        )}

        {/* States List + Selected State Controls */}
        {selectedCountry &&
          (interactionMode === 'paint_state' ||
            interactionMode === 'scissors_state' ||
            interactionMode === 'place_new_state') && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] text-slate-400">
                  Estados de <strong className="text-white">{selectedCountry.name}</strong> ({countryStates.length}):
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="relative">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1.5" />
                    <input
                      type="text"
                      value={stateSearch}
                      onChange={(e) => setStateSearch(e.target.value)}
                      placeholder="Buscar estado..."
                      className="w-28 bg-slate-950 border border-slate-700 rounded pl-6 pr-2 py-0.5 text-[11px] text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400">Pincel:</span>
                  <input
                    type="range"
                    min={2}
                    max={35}
                    value={brushRadius}
                    onChange={(e) => onChangeRadius(Number(e.target.value))}
                    className="w-14 accent-emerald-400 cursor-pointer"
                  />
                  <span className="font-mono-numbers text-slate-200 w-4">{brushRadius}</span>
                </div>
              </div>

              {/* Selected State Quick Actions Strip */}
              {selectedState && (
                <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-slate-950/90 border border-slate-800 rounded-lg flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <FlagView
                      flag={selectedState.flag || selectedCountry.flag}
                      width={24}
                      height={16}
                      className="border border-white/25 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-white truncate block leading-tight">
                        {selectedState.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Cap: {selectedState.capitalCity} · {selectedState.territoryCells} px
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      onClick={() => {
                        sound.playClick();
                        onOpenStateFlagStudio(selectedState);
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-semibold text-[11px] transition-colors"
                      title={`Mudar ou desenhar a bandeira de ${selectedState.name}`}
                    >
                      <Flag className="w-3 h-3" /> Bandeira
                    </button>

                    <button
                      onClick={() => {
                        sound.playClick();
                        onSetCapitalFromState(selectedCountry, selectedState);
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200 border border-cyan-500/40 font-semibold text-[11px] transition-colors"
                      title={`Trocar a capital de ${selectedCountry.name} para ${selectedState.capitalCity} (${selectedState.name})`}
                    >
                      <Crown className="w-3 h-3 text-amber-400" />
                      {selectedState.capitalCity} Capital
                    </button>

                    {selectedState.territoryCells > 0 && (
                      <>
                        <button
                          onClick={() => {
                            sound.playClick();
                            setShowDonateStatePicker((v) => !v);
                            setShowSellStatePicker(false);
                            setDonateStateSearch('');
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500/35 text-purple-300 border border-purple-500/40 font-semibold text-[11px] transition-colors"
                          title={`Doar o estado ${selectedState.name} para outro país`}
                        >
                          <Gift className="w-3 h-3" /> Doar
                        </button>

                        <button
                          onClick={() => {
                            sound.playClick();
                            setSellPriceInput(String(suggestStatePrice(selectedState)));
                            setSellBuyerId('');
                            setSellStateSearch('');
                            setShowSellStatePicker((v) => !v);
                            setShowDonateStatePicker(false);
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/40 font-semibold text-[11px] transition-colors"
                          title={`Vender o estado ${selectedState.name} para outro país`}
                        >
                          <DollarSign className="w-3 h-3" /> Vender
                        </button>

                        <button
                          onClick={() => {
                            sound.playImperialFanfare();
                            onDeclareStateIndependence(selectedCountry, selectedState, false);
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] transition-colors"
                          title={`Tornar ${selectedState.name} independente pacificamente`}
                        >
                          <Flag className="w-3 h-3" /> Independência
                        </button>

                        <button
                          onClick={() => {
                            sound.playWarCannon();
                            onDeclareStateIndependence(selectedCountry, selectedState, true);
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-red-600/25 hover:bg-red-600/45 text-red-300 border border-red-500/40 font-bold text-[11px] transition-colors"
                          title={`Proclamar guerra pela independência de ${selectedState.name} contra ${selectedCountry.name}`}
                        >
                          <Swords className="w-3 h-3" /> Guerra Indep.
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  onClick={openNewStateCreator}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-emerald-500/70 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/60 shrink-0 font-bold"
                >
                  <Plus className="w-3.5 h-3.5" /> Fundar Estado
                </button>

                {countryStates.map((st) => {
                  const isActive = selectedState?.id === st.id;
                  return (
                    <div
                      key={st.id}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg border shrink-0 transition-colors ${
                        isActive
                          ? 'bg-slate-800 border-amber-400 text-white shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <button
                        onClick={() => {
                          sound.playClick();
                          onSelectState(st);
                        }}
                        className="flex items-center gap-1.5 text-left"
                        title={`${st.name} · Capital: ${st.capitalCity}`}
                      >
                        <FlagView
                          flag={st.flag || selectedCountry.flag}
                          width={18}
                          height={12}
                          className="shrink-0"
                        />
                        <span
                          className="w-2 h-2 rounded-full shrink-0 border border-white/25"
                          style={{ backgroundColor: st.color }}
                        />
                        <span className="font-medium whitespace-nowrap">{st.name}</span>
                      </button>
                      <button
                        onClick={() => {
                          setEditingStateId(st.id);
                          setEditName(st.name);
                          setEditCap(st.capitalCity);
                        }}
                        className="text-slate-500 hover:text-amber-300 ml-0.5 p-0.5"
                        title="Renomear estado ou mudar capital do estado"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
      </div>
    </div>
  );
};
