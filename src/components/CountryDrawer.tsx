import React, { useState, useEffect, useMemo } from 'react';
import { Country, Empire, War, PastWarRecord, City, Ideology, StateTerritory } from '../types/game';
import { FlagView } from './FlagView';
import {
  X,
  Swords,
  Handshake,
  Crown,
  Cpu,
  Shield,
  Coins,
  Users,
  Scroll,
  Flag,
  PenTool,
  TrendingUp,
  Edit3,
  Check,
  Map as MapIcon,
  MapPin,
  Trash2,
  RotateCcw,
  Palette,
  Gift,
  Undo2,
  Search,
  Landmark,
} from 'lucide-react';
import { sound } from '../utils/audio';

const IDEOLOGIES: Ideology[] = [
  'República',
  'Democracia',
  'Monarquia',
  'Militarismo',
  'Socialismo',
  'Comunismo',
  'Império',
];

const QUICK_COLORS = [
  '#4ade80',
  '#3b82f6',
  '#ef4444',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#eab308',
  '#f97316',
  '#64748b',
];

interface CountryDrawerProps {
  country: Country | null;
  allCountries: Country[];
  empire: Empire | null;
  activeWars: War[];
  pastWars: PastWarRecord[];
  countryCities: City[];
  countryStates: StateTerritory[];
  onClose: () => void;
  onOpenFlagStudio: (country: Country) => void;
  onStartWarWith: (countryId: string) => void;
  onProposeAlliance: (countryId: string) => void;
  onSelectAsPencilCountry: (country: Country) => void;
  onRedefineTerritory: (country: Country) => void;
  onOpenStatesEditor: (country: Country) => void;
  onRenameCountry: (countryId: string, newName: string) => void;
  onRenameCapital: (countryId: string, newCapital: string) => void;
  onChangePopulation: (countryId: string, newPopulationMillions: number) => void;
  onChangeIdeology: (countryId: string, ideology: Ideology) => void;
  onChangeCountryColor: (countryId: string, color: string) => void;
  onGiftCountry: (donor: Country, recipient: Country, asState: boolean) => void;
  onProclaimStateIndependence: (parentCountry: Country, state: StateTerritory, startWar: boolean) => void;
  onDissolveEmpire: (empireId: string) => void;
  onSignPeace: (warId: string) => void;
  onReopenWar: (record: PastWarRecord) => void;
  onAddDecree: (countryId: string, decree: string) => void;
  onUpgradeTech: (countryId: string) => void;
}

export const CountryDrawer: React.FC<CountryDrawerProps> = ({
  country,
  allCountries,
  empire,
  activeWars,
  pastWars,
  countryCities,
  countryStates,
  onClose,
  onOpenFlagStudio,
  onStartWarWith,
  onProposeAlliance,
  onSelectAsPencilCountry,
  onRedefineTerritory,
  onOpenStatesEditor,
  onRenameCountry,
  onRenameCapital,
  onChangePopulation,
  onChangeIdeology,
  onChangeCountryColor,
  onGiftCountry,
  onProclaimStateIndependence,
  onDissolveEmpire,
  onSignPeace,
  onReopenWar,
  onAddDecree,
  onUpgradeTech,
}) => {
  const [newDecreeInput, setNewDecreeInput] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [isRenamingCap, setIsRenamingCap] = useState(false);
  const [capInput, setCapInput] = useState('');
  const [isEditingPop, setIsEditingPop] = useState(false);
  const [popInput, setPopInput] = useState('');

  // Gift / Return territory picker state
  const [showTransferPicker, setShowTransferPicker] = useState(false);
  const [transferAsState, setTransferAsState] = useState(false);
  const [transferSearch, setTransferSearch] = useState('');

  useEffect(() => {
    setIsRenaming(false);
    setIsRenamingCap(false);
    setIsEditingPop(false);
    setShowTransferPicker(false);
    setTransferSearch('');
    if (country) {
      setRenameInput(country.name);
      setCapInput(country.capital);
      setPopInput(String(Math.round(country.population * 10) / 10));
    }
  }, [country]);

  const transferCandidates = useMemo(() => {
    if (!country) return [];
    const q = transferSearch.trim().toLowerCase();
    return allCountries
      .filter((c) => c.id !== country.id && c.territoryCells > 0)
      .filter((c) =>
        !q
          ? true
          : c.name.toLowerCase().includes(q) ||
            c.capital.toLowerCase().includes(q) ||
            c.continent.toLowerCase().includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [allCountries, country, transferSearch]);

  if (!country) return null;

  const originCountry = country.originCountryId
    ? allCountries.find((c) => c.id === country.originCountryId && c.territoryCells > 0)
    : undefined;

  const handleAddCustomDecree = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDecreeInput.trim()) {
      sound.playClick();
      onAddDecree(country.id, newDecreeInput.trim());
      setNewDecreeInput('');
    }
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (renameInput.trim()) {
      sound.playClick();
      onRenameCountry(country.id, renameInput.trim());
      setIsRenaming(false);
    }
  };

  const displayName = empire ? empire.name : country.name;
  const displayFlag = empire ? empire.flag : country.flag;

  const countryActiveWars = activeWars.filter(
    (w) => w.attackers.includes(country.id) || w.defenders.includes(country.id)
  );
  const countryPastWars = pastWars.filter(
    (w) => w.attackers.includes(country.id) || w.defenders.includes(country.id)
  );

  return (
    <div className="fixed top-14 right-4 bottom-14 z-40 w-96 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl flex flex-col text-slate-100 overflow-hidden animate-in slide-in-from-right duration-200">
      {/* Top Banner / Header */}
      <div
        className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-2"
        style={{
          background: empire
            ? `linear-gradient(to right, ${empire.color}33, #090d16)`
            : `linear-gradient(to right, ${country.color}22, #090d16)`,
        }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <FlagView flag={displayFlag} width={48} height={32} className="shadow-md shrink-0" />
          <div className="min-w-0 flex-1">
            {isRenaming ? (
              <form onSubmit={handleSaveRename} className="flex items-center gap-1">
                <input
                  type="text"
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  autoFocus
                  className="w-full bg-slate-950 border border-amber-400 rounded px-2 py-0.5 text-sm font-bold text-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="p-1 bg-amber-400 text-slate-950 rounded hover:bg-amber-300"
                  title="Salvar nome"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-base font-cinzel text-white leading-tight truncate">
                  {displayName}
                </h3>
                {empire && (
                  <span title="Membro de Império">
                    <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                  </span>
                )}
                <button
                  onClick={() => {
                    setRenameInput(country.name);
                    setIsRenaming(true);
                  }}
                  className="text-slate-400 hover:text-amber-300 p-0.5 shrink-0"
                  title="Renomear país"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {isRenamingCap ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (capInput.trim()) {
                    sound.playClick();
                    onRenameCapital(country.id, capInput.trim());
                    setIsRenamingCap(false);
                  }
                }}
                className="flex items-center gap-1 mt-1"
              >
                <input
                  type="text"
                  value={capInput}
                  onChange={(e) => setCapInput(e.target.value)}
                  placeholder="Nova capital..."
                  autoFocus
                  className="w-full bg-slate-950 border border-cyan-400 rounded px-2 py-0.5 text-[11px] text-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="p-0.5 bg-cyan-400 text-slate-950 rounded hover:bg-cyan-300"
                  title="Salvar capital"
                >
                  <Check className="w-3 h-3" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <span className="truncate">
                  {empire
                    ? `Província (${country.name}) · ★ ${country.capital}`
                    : `${country.ideology} · ★ ${country.capital} · ${country.continent}`}
                </span>
                <button
                  onClick={() => {
                    setCapInput(country.capital);
                    setIsRenamingCap(true);
                  }}
                  className="text-slate-500 hover:text-cyan-300 p-0.5 shrink-0"
                  title="Renomear capital nacional"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
        {/* Imperial Badge if in Empire + Dissolve Empire button */}
        {empire && (
          <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-lg text-amber-200 flex items-center justify-between gap-2">
            <div>
              <span className="font-bold block text-amber-300">Parte do {empire.name}</span>
              <span className="text-[11px] text-slate-400">Governado por {empire.emperorTitle}</span>
            </div>
            <button
              onClick={() => {
                sound.playPeaceChime();
                onDissolveEmpire(empire.id);
              }}
              className="px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600/35 text-red-300 border border-red-500/40 rounded-lg text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Desfazer Império
            </button>
          </div>
        )}

        {/* Former State Independence Banner: Return to original country or any country */}
        {country.originCountryId && (
          <div className="p-3 bg-cyan-950/30 border border-cyan-500/40 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                <Undo2 className="w-3.5 h-3.5" /> Ex-Estado Independente
              </span>
              <span className="text-[10px] text-slate-400">
                Origem: {country.originCountryName}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {originCountry && (
                <button
                  onClick={() => {
                    sound.playClick();
                    onGiftCountry(country, originCountry, true);
                  }}
                  className="w-full py-1.5 px-2.5 bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200 border border-cyan-500/40 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Undo2 className="w-3.5 h-3.5" /> Devolver Estado para {originCountry.name}
                </button>
              )}
              <button
                onClick={() => {
                  sound.playClick();
                  setTransferAsState(true);
                  setShowTransferPicker((v) => !v);
                }}
                className="w-full py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-medium transition-colors"
              >
                Devolver como Estado para Outro País...
              </button>
            </div>
          </div>
        )}

        {/* Gifted / Incorporated Former Nations inside this Country */}
        {countryStates.some((st) => st.formerCountryData && st.territoryCells > 0) && (
          <div className="p-3 bg-purple-950/30 border border-purple-500/40 rounded-lg space-y-2">
            <span className="font-bold text-purple-300 flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5" /> Territórios &amp; Nações Incorporadas
            </span>
            <div className="space-y-1.5">
              {countryStates
                .filter((st) => st.formerCountryData && st.territoryCells > 0)
                .map((st) => (
                  <div
                    key={st.id}
                    className="p-2 bg-slate-950/80 border border-slate-800 rounded-lg space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <FlagView flag={st.formerCountryData!.flag} width={20} height={14} />
                        <span className="font-semibold text-white truncate">{st.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono-numbers">
                        {st.territoryCells} px
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => {
                          sound.playImperialFanfare();
                          onProclaimStateIndependence(country, st, false);
                        }}
                        className="py-1 px-2 bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded text-[11px] font-semibold transition-colors"
                      >
                        Devolver Independência
                      </button>
                      <button
                        onClick={() => {
                          sound.playWarCannon();
                          onProclaimStateIndependence(country, st, true);
                        }}
                        className="py-1 px-2 bg-red-600/25 hover:bg-red-600/40 text-red-300 border border-red-500/40 rounded text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Swords className="w-3 h-3" /> Guerra Independência
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Quick Action Bar */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              sound.playPencil();
              onSelectAsPencilCountry(country);
            }}
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 rounded-lg font-medium transition-colors"
          >
            <PenTool className="w-3.5 h-3.5" /> Pintar Território
          </button>
          <button
            onClick={() => {
              sound.playClick();
              onRedefineTerritory(country);
            }}
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 rounded-lg font-medium transition-colors"
            title="Limpar o território atual e desenhar um novo do zero"
          >
            <PenTool className="w-3.5 h-3.5" /> Definir do Zero
          </button>
          <button
            onClick={() => {
              sound.playClick();
              onOpenStatesEditor(country);
            }}
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/35 rounded-lg font-medium transition-colors"
          >
            <MapIcon className="w-3.5 h-3.5" /> Estados & Capitais
          </button>
          <button
            onClick={() => onOpenFlagStudio(country)}
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-medium transition-colors"
          >
            <Flag className="w-3.5 h-3.5" /> Mudar Bandeira
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setTransferAsState(false);
              setShowTransferPicker((v) => !v);
            }}
            className="col-span-2 flex items-center justify-center gap-1.5 py-2 px-3 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/40 rounded-lg font-semibold transition-colors"
            title="Transferir todo o território deste país de presente para outro país"
          >
            <Gift className="w-3.5 h-3.5" /> Dar Nação de Brinde / Transferir Território
          </button>
        </div>

        {/* Gift / Transfer Country Picker */}
        {showTransferPicker && (
          <div className="p-3 bg-slate-950 border border-purple-500/40 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-300">
                {transferAsState
                  ? `Devolver ${country.name} como Estado para:`
                  : `Presentear território de ${country.name} para:`}
              </span>
              <button
                onClick={() => setShowTransferPicker(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={transferSearch}
                onChange={(e) => setTransferSearch(e.target.value)}
                placeholder="Pesquisar país recebedor..."
                autoFocus
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
              />
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
              {transferCandidates.map((target) => (
                <button
                  key={target.id}
                  onClick={() => {
                    sound.playClick();
                    onGiftCountry(country, target, transferAsState);
                    setShowTransferPicker(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-purple-950/50 text-left text-slate-200 transition-colors"
                >
                  <FlagView flag={target.flag} width={20} height={14} />
                  <span className="truncate flex-1 font-medium">{target.name}</span>
                  <span className="text-[10px] text-purple-300 font-semibold">
                    {transferAsState ? 'Devolver' : 'Presentear'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Regime Político / Ideologia & Cor do Território */}
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
              <Landmark className="w-3.5 h-3.5 text-amber-400" /> Regime Político / Sistema
            </label>
            <select
              value={country.ideology}
              onChange={(e) => {
                sound.playClick();
                onChangeIdeology(country.id, e.target.value as Ideology);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              {IDEOLOGIES.map((idg) => (
                <option key={idg} value={idg}>
                  {idg}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
              <Palette className="w-3.5 h-3.5 text-emerald-400" /> Cor do Território no Mapa
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {QUICK_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    onChangeCountryColor(country.id, c);
                  }}
                  style={{ backgroundColor: c }}
                  className={`w-5 h-5 rounded-full border transition-transform ${
                    country.color.toLowerCase() === c.toLowerCase()
                      ? 'border-white scale-125 shadow'
                      : 'border-slate-700 hover:scale-110'
                  }`}
                />
              ))}
              <input
                type="color"
                value={country.color}
                onChange={(e) => onChangeCountryColor(country.id, e.target.value)}
                title="Escolher qualquer cor personalizada"
                className="w-6 h-6 rounded-full border border-slate-600 bg-transparent cursor-pointer p-0 ml-1"
              />
            </div>
          </div>
        </div>

        {/* Active Wars & Past Wars for this country */}
        {(countryActiveWars.length > 0 || countryPastWars.length > 0) && (
          <div className="space-y-2 p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wide text-red-400 flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5" /> Guerras & Tratados
            </span>
            {countryActiveWars.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between gap-2 p-2 bg-red-950/30 border border-red-900/50 rounded"
              >
                <span className="text-red-200 font-medium truncate">{w.name}</span>
                <button
                  onClick={() => onSignPeace(w.id)}
                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold shrink-0"
                >
                  Assinar Paz
                </button>
              </div>
            ))}
            {countryPastWars.map((pw) => (
              <div
                key={pw.id}
                className="flex items-center justify-between gap-2 p-2 bg-slate-900 border border-slate-800 rounded"
              >
                <span className="text-slate-300 truncate">{pw.name}</span>
                <button
                  onClick={() => {
                    sound.playWarCannon();
                    onReopenWar(pw);
                  }}
                  className="px-2 py-1 bg-red-600/25 hover:bg-red-600/45 text-red-300 border border-red-500/40 rounded text-[11px] font-semibold flex items-center gap-1 shrink-0"
                >
                  <RotateCcw className="w-3 h-3" /> Voltar à Guerra
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Vital Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 col-span-2">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" /> População (e impacto no PIB)
              </div>
              <button
                onClick={() => {
                  setPopInput(String(Math.round(country.population * 10) / 10));
                  setIsEditingPop((v) => !v);
                }}
                className="text-blue-400 hover:text-blue-300 text-[11px] font-semibold flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" /> {isEditingPop ? 'Fechar' : 'Alterar'}
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm font-bold text-white font-mono-numbers">
                {country.population >= 1000
                  ? `${(country.population / 1000).toFixed(2)} Bilhões`
                  : `${country.population.toFixed(1)} Milhões`}
              </span>
              <div className="flex items-center gap-1">
                {[1, 10, 50].map((inc) => (
                  <button
                    key={inc}
                    onClick={() => {
                      sound.playClick();
                      const next = Math.round((country.population + inc) * 10) / 10;
                      onChangePopulation(country.id, next);
                      setPopInput(String(next));
                    }}
                    className="px-1.5 py-0.5 rounded bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-[10px] font-mono-numbers font-bold"
                    title={`Adicionar ${inc} milhões de habitantes (aumenta o PIB)`}
                  >
                    +{inc}M
                  </button>
                ))}
              </div>
            </div>
            {isEditingPop && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const val = parseFloat(popInput.replace(',', '.'));
                  if (!Number.isNaN(val) && val > 0) {
                    sound.playClick();
                    onChangePopulation(country.id, val);
                    setIsEditingPop(false);
                  }
                }}
                className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-800"
              >
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={popInput}
                  onChange={(e) => setPopInput(e.target.value)}
                  className="flex-1 bg-slate-900 border border-blue-500/50 rounded px-2 py-1 text-xs text-white font-mono-numbers focus:outline-none"
                  placeholder="Milhões de habitantes"
                />
                <span className="text-[10px] text-slate-400">M</span>
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold rounded text-[11px]"
                >
                  Aplicar
                </button>
              </form>
            )}
          </div>

          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Shield className="w-3.5 h-3.5 text-red-400" /> Força Militar
            </div>
            <span className="text-sm font-bold text-red-400 font-mono-numbers">
              {country.militaryPower} índice
            </span>
          </div>

          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" /> PIB Nominal
            </div>
            <span className="text-sm font-bold text-emerald-400 font-mono-numbers">
              ${country.gdp.toLocaleString()} Bi
            </span>
          </div>

          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" /> Território
            </div>
            <span className="text-sm font-bold text-white font-mono-numbers">
              {country.territoryCells.toLocaleString()} km²
            </span>
          </div>
        </div>

        {/* Technology Evolution Progress */}
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Cpu className="w-4 h-4 text-cyan-400" /> Era Tecnológica: {country.techEra}
            </div>
            <button
              onClick={() => onUpgradeTech(country.id)}
              className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 px-2 py-0.5 bg-cyan-950/60 border border-cyan-800 rounded transition-colors"
            >
              Acelerar P&amp;D
            </button>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${country.techProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Progresso da Era</span>
            <span className="font-mono-numbers">{country.techProgress}%</span>
          </div>
        </div>

        {/* Decrees / Policies */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <Scroll className="w-4 h-4 text-amber-400" /> Decretos & Políticas Ativas
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {country.decrees.map((dec, idx) => (
              <div
                key={idx}
                className="p-2 bg-slate-950 rounded border border-slate-800 text-slate-300 flex items-center justify-between"
              >
                <span>{dec}</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-900">
                  Em Vigor
                </span>
              </div>
            ))}
          </div>

          {/* Add Decree Input */}
          <form onSubmit={handleAddCustomDecree} className="flex gap-1.5 pt-1">
            <input
              type="text"
              value={newDecreeInput}
              onChange={(e) => setNewDecreeInput(e.target.value)}
              placeholder="Promulgar novo decreto..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded text-xs transition-colors"
            >
              Assinar
            </button>
          </form>
        </div>

        {/* Cities / Capitals */}
        {countryCities.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wide flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Cidades &amp; Capitais ({countryCities.length})
            </span>
            <div className="flex flex-wrap gap-1">
              {countryCities.map((ct) => (
                <span
                  key={ct.id}
                  className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-200 text-[11px]"
                >
                  {ct.isStateCapital ? '◆ ' : '• '}
                  {ct.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* States / Provinces */}
        {country.states && country.states.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wide block">
              Estados &amp; Províncias Federadas ({country.states.length})
            </span>
            <div className="flex flex-wrap gap-1">
              {country.states.map((st, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[11px]"
                >
                  {st}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Diplomatic Relations */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={() => onStartWarWith(country.id)}
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 rounded-lg font-medium transition-colors"
          >
            <Swords className="w-3.5 h-3.5" /> Declarar Guerra
          </button>
          <button
            onClick={() => onProposeAlliance(country.id)}
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-lg font-medium transition-colors"
          >
            <Handshake className="w-3.5 h-3.5" /> Propor Aliança
          </button>
        </div>
      </div>
    </div>
  );
};
