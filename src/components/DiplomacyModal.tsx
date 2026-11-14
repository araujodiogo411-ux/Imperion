import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Country, Alliance, War } from '../types/game';
import { FlagView } from './FlagView';
import { Handshake, HeartHandshake, Check, X, Globe, Search } from 'lucide-react';
import { sound } from '../utils/audio';
import { normalizeSearch } from '../utils/text';

interface DiplomacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'alliance' | 'peace';
  countries: Country[];
  activeWars: War[];
  alliances: Alliance[];
  onCreateAlliance: (alliance: Alliance) => void;
  onDeclareWorldPeace: () => void;
  onSignPeace: (warId: string) => void;
  preselectedCountryId?: string | null;
}

const ALLIANCE_COLORS = [
  '#2563eb', // Blue NATO
  '#059669', // Emerald Pact
  '#d97706', // Gold Treaty
  '#7c3aed', // Purple Coalition
  '#0284c7', // Sky Union
];

export const DiplomacyModal: React.FC<DiplomacyModalProps> = ({
  isOpen,
  onClose,
  mode,
  countries,
  activeWars,
  alliances,
  onCreateAlliance,
  onDeclareWorldPeace,
  onSignPeace,
  preselectedCountryId,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    preselectedCountryId ? [preselectedCountryId] : []
  );
  const [allianceName, setAllianceName] = useState('Pacto de Defesa Mútua');
  const [color, setColor] = useState(ALLIANCE_COLORS[0]);
  const [countrySearch, setCountrySearch] = useState('');
  const [peaceSearch, setPeaceSearch] = useState('');

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setCountrySearch('');
      setPeaceSearch('');
      if (preselectedCountryId) {
        setSelectedIds([preselectedCountryId]);
      }
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, preselectedCountryId]);

  const filteredCountries = useMemo(() => {
    const q = normalizeSearch(countrySearch);
    const list = q
      ? countries.filter(
          (c) =>
            normalizeSearch(c.name).includes(q) ||
            normalizeSearch(c.capital).includes(q) ||
            normalizeSearch(c.continent).includes(q)
        )
      : countries;
    return list.slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [countries, countrySearch]);

  const filteredWars = useMemo(() => {
    const q = normalizeSearch(peaceSearch);
    if (!q) return activeWars;
    return activeWars.filter((w) => {
      if (normalizeSearch(w.name).includes(q)) return true;
      const involved = [...w.attackers, ...w.defenders];
      return involved.some((cid) => {
        const c = countries.find((item) => item.id === cid);
        return c ? normalizeSearch(c.name).includes(q) : false;
      });
    });
  }, [activeWars, peaceSearch, countries]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    sound.playClick();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleCreateAlliance = () => {
    if (selectedIds.length < 2) return;

    sound.playPeaceChime();

    const newAlliance: Alliance = {
      id: `ALLI_${Date.now()}`,
      name: allianceName.trim() || 'Aliança Estratégica',
      memberIds: selectedIds,
      color,
    };

    onCreateAlliance(newAlliance);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                mode === 'alliance'
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                  : 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {mode === 'alliance' ? (
                <Handshake className="w-5 h-5" />
              ) : (
                <HeartHandshake className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold font-cinzel text-slate-100">
                {mode === 'alliance' ? 'Tratado de Aliança & Cooperação' : 'Conselho de Paz & Desescalada'}
              </h3>
              <p className="text-xs text-slate-400">
                {mode === 'alliance'
                  ? 'Pesquise e selecione 2 ou mais nações para pacto defensivo'
                  : 'Pesquise conflitos para assinar paz ou declare Paz Mundial'}
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
        <div className="p-6 space-y-4 overflow-y-auto">
          {mode === 'alliance' ? (
            <>
              {alliances.length > 0 && (
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1.5">
                  <span className="text-slate-400 font-semibold uppercase text-[11px] block">
                    Alianças Existentes ({alliances.length})
                  </span>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {alliances.map((a) => (
                      <div key={a.id} className="flex items-center justify-between p-1.5 bg-slate-900 rounded">
                        <span className="font-semibold text-blue-300">{a.name}</span>
                        <span className="text-slate-400 text-[11px] font-mono-numbers">
                          {a.memberIds.length} membros
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Nome do Bloco / Aliança
                </label>
                <input
                  type="text"
                  value={allianceName}
                  onChange={(e) => setAllianceName(e.target.value)}
                  placeholder="Ex: Aliança Atlântica, Pacto Sul-Americano..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Distintivo da Aliança
                </label>
                <div className="flex gap-2 items-center">
                  {ALLIANCE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setColor(c);
                        sound.playClick();
                      }}
                      style={{ backgroundColor: c }}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        color === c ? 'border-white scale-125 shadow-md' : 'border-slate-700 hover:scale-110'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Selecione as Nações ({selectedIds.length} selecionadas)
                  </label>
                  <span className={`text-[11px] ${selectedIds.length >= 2 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    Mínimo 2 países
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    placeholder="Pesquisar país para aliança..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-950 rounded-lg border border-slate-800">
                  {filteredCountries.map((c) => {
                    const isSelected = selectedIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleSelect(c.id)}
                        className={`flex items-center gap-2 p-1.5 rounded-md border text-left text-xs transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-blue-600/20 text-blue-200'
                            : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <FlagView flag={c.flag} width={22} height={15} />
                        <span className="truncate flex-1 font-medium">{c.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-950/40 border border-emerald-800/80 rounded-xl text-center space-y-2">
                <Globe className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-emerald-300">
                  Resolução de Paz Mundial
                </h4>
                <p className="text-xs text-slate-300">
                  Cessar-fogo universal imediato. Encerra instantaneamente todas as guerras ativas no planeta e restabelece a diplomacia internacional.
                </p>
                <button
                  onClick={() => {
                    sound.playPeaceChime();
                    onDeclareWorldPeace();
                    onClose();
                  }}
                  className="mt-2 px-5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors shadow-md shadow-emerald-600/20"
                >
                  Proclamar Paz Mundial Completa
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Guerras em Andamento ({activeWars.length})
                </label>

                {activeWars.length > 0 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={peaceSearch}
                      onChange={(e) => setPeaceSearch(e.target.value)}
                      placeholder="Pesquisar país ou guerra para assinar paz..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                )}

                {activeWars.length === 0 ? (
                  <p className="text-xs text-slate-500 p-4 text-center bg-slate-950 rounded-lg border border-slate-800">
                    O mundo está em harmonia. Nenhuma guerra ativa no momento.
                  </p>
                ) : filteredWars.length === 0 ? (
                  <p className="text-xs text-slate-500 p-4 text-center bg-slate-950 rounded-lg border border-slate-800">
                    Nenhuma guerra encontrada para "{peaceSearch}".
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {filteredWars.map((w) => (
                      <div
                        key={w.id}
                        className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs"
                      >
                        <div>
                          <strong className="text-white block">{w.name}</strong>
                          <span className="text-[11px] text-slate-400">
                            {(w.casualties.attackers + w.casualties.defenders).toLocaleString()} baixas
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            sound.playPeaceChime();
                            onSignPeace(w.id);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors"
                        >
                          Cessar-Fogo
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {mode === 'alliance' && (
          <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-950">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              disabled={selectedIds.length < 2}
              onClick={handleCreateAlliance}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-lg ${
                selectedIds.length >= 2
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Handshake className="w-4 h-4" /> Ratificar Aliança
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
