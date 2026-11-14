import React, { useState, useMemo } from 'react';
import { Country, Empire, FlagData } from '../types/game';
import { FlagView } from './FlagView';
import { FlagStudioModal } from './FlagStudioModal';
import { Crown, Check, X, Shield, Flag, Trash2, Search } from 'lucide-react';
import { sound } from '../utils/audio';
import { normalizeSearch } from '../utils/text';

interface EmpireModalProps {
  isOpen: boolean;
  onClose: () => void;
  countries: Country[];
  empires: Empire[];
  onFormEmpire: (empire: Empire) => void;
  onDissolveEmpire: (empireId: string) => void;
  preselectedCountryIds?: string[];
}

const IMPERIAL_COLORS = [
  '#b45309', // Imperial Gold
  '#7e22ce', // Royal Purple
  '#991b1b', // Roman Crimson
  '#1e3a8a', // Deep Imperial Blue
  '#065f46', // Emerald Dynasty
  '#18181b', // Obsidian Sovereign
];

export const EmpireModal: React.FC<EmpireModalProps> = ({
  isOpen,
  onClose,
  countries,
  empires,
  onFormEmpire,
  onDissolveEmpire,
  preselectedCountryIds = [],
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    preselectedCountryIds.length >= 3
      ? preselectedCountryIds
      : countries.slice(0, 3).map((c) => c.id)
  );

  const [empireName, setEmpireName] = useState('Grande Império Unificado');
  const [emperorTitle, setEmperorTitle] = useState('Imperador Soberano');
  const [color, setColor] = useState(IMPERIAL_COLORS[0]);
  const [capital, setCapital] = useState('');
  const [flag, setFlag] = useState<FlagData>({
    type: 'custom',
    value: 'EMP',
    customProps: {
      layout: 'solid',
      colors: ['#7e22ce'],
      emblem: 'crown',
      emblemColor: '#fbbf24',
    },
  });

  const [isFlagStudioOpen, setIsFlagStudioOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

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

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    sound.playClick();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleForm = () => {
    if (selectedIds.length < 3) {
      return;
    }

    sound.playImperialFanfare();

    const chosenCapital =
      capital ||
      countries.find((c) => selectedIds.includes(c.id))?.capital ||
      'Capital Imperial';

    const newEmpire: Empire = {
      id: `EMP_${Date.now()}`,
      name: empireName.trim() || 'Império Soberano',
      emperorTitle: emperorTitle.trim() || 'Imperador',
      capital: chosenCapital,
      color,
      flag,
      memberIds: selectedIds,
      formedAtYear: 2026,
      ideology: 'Império',
    };

    onFormEmpire(newEmpire);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
        <div className="bg-slate-900 border border-amber-500/40 rounded-xl shadow-2xl max-w-xl w-full overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-amber-500/30 flex items-center justify-between bg-gradient-to-r from-amber-950/40 to-slate-950">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-inner">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-cinzel text-amber-300">
                  Fundação de Império
                </h3>
                <p className="text-xs text-slate-400">
                  Selecione 3 ou mais países para unir sob um único estandarte imperial
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

          {/* Body */}
          <div className="p-6 space-y-5 overflow-y-auto">
            {/* Active Empires (Dissolve option) */}
            {empires.length > 0 && (
              <div className="p-3 bg-slate-950 border border-amber-500/30 rounded-lg space-y-2">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
                  <Crown className="w-3.5 h-3.5" /> Impérios Ativos ({empires.length})
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {empires.map((emp) => (
                    <div
                      key={emp.id}
                      className="flex items-center justify-between gap-2 p-2 bg-slate-900 rounded border border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FlagView flag={emp.flag} width={28} height={19} />
                        <div className="truncate">
                          <div className="font-bold text-white truncate">{emp.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {emp.memberIds.length} nações · {emp.emperorTitle}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          sound.playPeaceChime();
                          onDissolveEmpire(emp.id);
                        }}
                        className="px-2.5 py-1.5 text-[11px] font-semibold bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/40 rounded-md flex items-center gap-1 shrink-0 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> Desfazer Império
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rule Callout */}
            <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-lg text-xs text-amber-200/90 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Decreto Imperial:</strong> Os países anexados deixarão de exibir seus nomes e bandeiras individuais no mapa mundial. Seus territórios ficarão unificados sob o nome e pavilhão do Império.
              </div>
            </div>

            {/* Empire Name & Title */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Nome do Império
                </label>
                <input
                  type="text"
                  value={empireName}
                  onChange={(e) => setEmpireName(e.target.value)}
                  placeholder="Ex: Império Romano Renascido..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Título do Soberano
                </label>
                <input
                  type="text"
                  value={emperorTitle}
                  onChange={(e) => setEmperorTitle(e.target.value)}
                  placeholder="Ex: César, Grão-Czar, Imperador..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Imperial Flag */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Estandarte Imperial
              </label>
              <div className="flex items-center gap-4 p-3 bg-slate-950 rounded-lg border border-slate-800">
                <FlagView flag={flag} width={68} height={45} className="shadow-lg border border-amber-500/40" />
                <div className="flex-1">
                  <p className="text-xs text-amber-300 font-bold">Pavilhão da Coroa</p>
                  <p className="text-[11px] text-slate-400">
                    Crie com formas heráldicas ou importe imagem do seu computador
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFlagStudioOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Flag className="w-3.5 h-3.5" /> Estúdio de Bandeira
                </button>
              </div>
            </div>

            {/* Imperial Color */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Cor Imperial no Mapa
              </label>
              <div className="flex gap-2.5 items-center">
                {IMPERIAL_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setColor(c);
                      sound.playClick();
                    }}
                    style={{ backgroundColor: c }}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      color === c ? 'border-amber-300 scale-125 shadow-md shadow-amber-500/30' : 'border-slate-700 hover:scale-110'
                    }`}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-7 h-7 rounded-full border border-slate-700 bg-transparent cursor-pointer p-0"
                />
              </div>
            </div>

            {/* Country Selector (Pick 3 or more) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Nações Anexadas ({selectedIds.length} selecionadas · Mínimo 3)
                </label>
                <span className={`text-[11px] font-mono-numbers ${selectedIds.length >= 3 ? 'text-emerald-400' : 'text-amber-400 font-semibold'}`}>
                  {selectedIds.length >= 3 ? 'Requisito satisfeito' : 'Selecione ao menos 3 países'}
                </span>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  placeholder="Pesquisar país para unir ao Império..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-950 rounded-lg border border-slate-800">
                {filteredCountries.map((c) => {
                  const isSelected = selectedIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleSelect(c.id)}
                      className={`flex items-center gap-2 p-1.5 rounded-md border text-left text-xs transition-colors ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                          : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <FlagView flag={c.flag} width={22} height={15} />
                      <span className="truncate flex-1 font-medium">{c.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-800 flex justify-between items-center bg-slate-950">
            <span className="text-xs text-slate-400">
              {selectedIds.length} províncias imperiais
            </span>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={selectedIds.length < 3}
                onClick={handleForm}
                className={`px-5 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-lg ${
                  selectedIds.length >= 3
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/20 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Crown className="w-4 h-4" /> Proclamar o Império
              </button>
            </div>
          </div>
        </div>
      </div>

      <FlagStudioModal
        isOpen={isFlagStudioOpen}
        onClose={() => setIsFlagStudioOpen(false)}
        onSave={(newFlag) => setFlag(newFlag)}
        countryName={empireName}
        initialFlag={flag}
      />
    </>
  );
};
