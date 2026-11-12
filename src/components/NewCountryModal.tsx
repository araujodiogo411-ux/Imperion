import React, { useState } from 'react';
import { Country, Continent, Ideology, FlagData } from '../types/game';
import { CutResult, GRID_WIDTH, GRID_HEIGHT } from '../utils/mapEngine';
import { FlagView } from './FlagView';
import { FlagStudioModal } from './FlagStudioModal';
import { Scissors, Sparkles, Check, X, Palette, Flag } from 'lucide-react';
import { sound } from '../utils/audio';

interface NewCountryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newCountry: Country) => void;
  cutInfo?: CutResult | null;
}

const CONTINENTS: Continent[] = [
  'América do Sul',
  'América do Norte',
  'Europa',
  'Ásia',
  'África',
  'Oceania',
];

const IDEOLOGIES: Ideology[] = [
  'República',
  'Democracia',
  'Império',
  'Monarquia',
  'Militarismo',
  'Socialismo',
  'Comunismo',
];

const PALETTE = [
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#10b981',
  '#f97316',
  '#6366f1',
  '#14b8a6',
  '#e11d48',
  '#84cc16',
];

export const NewCountryModal: React.FC<NewCountryModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  cutInfo,
}) => {
  const [name, setName] = useState('Nova República');
  const [capital, setCapital] = useState('Porto Seguro');
  const [continent, setContinent] = useState<Continent>('Ásia');
  const [color, setColor] = useState(PALETTE[0]);
  const [ideology, setIdeology] = useState<Ideology>('República');
  const [flag, setFlag] = useState<FlagData>({
    type: 'custom',
    value: 'NEW',
    customProps: {
      layout: 'horizontal',
      colors: ['#f59e0b', '#ffffff', '#0f172a'],
      emblem: 'star',
      emblemColor: '#f59e0b',
    },
  });

  const [isFlagStudioOpen, setIsFlagStudioOpen] = useState(false);

  if (!isOpen || !cutInfo) return null;

  const handleCreate = () => {
    sound.playImperialFanfare();
    const newCountry: Country = {
      id: `CUST_${Date.now()}`,
      numericId: cutInfo.newNumericId,
      name: name.trim() || 'Nova Terra',
      originalName: name.trim() || 'Nova Terra',
      capital: capital.trim() || 'Capital',
      continent,
      color,
      flag,
      population: Math.max(5, Math.round(cutInfo.cellCount * 0.12)),
      militaryPower: 250,
      gdp: Math.round(cutInfo.cellCount * 0.8),
      techEra: 'Digital',
      techProgress: 20,
      ideology,
      empireId: null,
      allies: [],
      enemies: [],
      decrees: ['Declaração de Soberania', 'Reconhecimento Internacional'],
      territoryCells: cutInfo.cellCount,
      states: ['Província Central', 'Distrito da Fronteira', 'Região Litorânea'],
      isCustom: true,
      normX: cutInfo.centroid.x / GRID_WIDTH,
      normY: cutInfo.centroid.y / GRID_HEIGHT,
      centerX: cutInfo.centroid.x,
      centerY: cutInfo.centroid.y,
    };

    onConfirm(newCountry);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-100 flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Scissors className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-cinzel text-amber-400">
                  Novo País Criado pelo Corte
                </h3>
                <p className="text-xs text-slate-400">
                  {cutInfo.sourceCountryNames.length > 0
                    ? `Fronteiras seccionadas de: ${cutInfo.sourceCountryNames.join(', ')}`
                    : 'Território particionado'}
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

          {/* Form */}
          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Banner of Sliced Land */}
            <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700 flex items-center justify-between text-xs text-slate-300">
              <div>
                <span className="text-slate-400">Área seccionada:</span>{' '}
                <strong className="text-amber-400 font-mono-numbers">{cutInfo.cellCount} km² nominais</strong>
              </div>
              <span className="text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded text-[11px]">
                Pronto para Soberania
              </span>
            </div>

            {/* Country Name & Capital */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Nome do Novo País
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Sibéria Livre, Nova Prússia..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Capital
                </label>
                <input
                  type="text"
                  value={capital}
                  onChange={(e) => setCapital(e.target.value)}
                  placeholder="Ex: Cidade Central"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Continent & Ideology */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Continente
                </label>
                <select
                  value={continent}
                  onChange={(e) => setContinent(e.target.value as Continent)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  {CONTINENTS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Regime Político
                </label>
                <select
                  value={ideology}
                  onChange={(e) => setIdeology(e.target.value as Ideology)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  {IDEOLOGIES.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Flag Preview & Button to open Flag Studio */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Bandeira Nacional
              </label>
              <div className="flex items-center gap-4 p-3 bg-slate-950 rounded-lg border border-slate-800">
                <FlagView flag={flag} width={64} height={42} className="shadow-md" />
                <div className="flex-1">
                  <p className="text-xs text-slate-300 font-medium">Pavilhão Oficial</p>
                  <p className="text-[11px] text-slate-500">Desenhe formas ou importe imagem do PC</p>
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

            {/* Color of Territory */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Cor no Mapa Mundial
              </label>
              <div className="flex gap-2 flex-wrap items-center">
                {PALETTE.map((c) => (
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
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-7 h-7 rounded-full border border-slate-700 bg-transparent cursor-pointer p-0"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-950">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <Sparkles className="w-4 h-4" /> Fundar Nação Soberana
            </button>
          </div>
        </div>
      </div>

      <FlagStudioModal
        isOpen={isFlagStudioOpen}
        onClose={() => setIsFlagStudioOpen(false)}
        onSave={(newFlag) => setFlag(newFlag)}
        countryName={name}
        initialFlag={flag}
      />
    </>
  );
};
