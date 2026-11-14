import React, { useState, useEffect } from 'react';
import { FlagData, StateTerritory } from '../types/game';
import { StateCutResult } from '../utils/mapEngine';
import { STATE_PALETTE } from '../data/worldCountries';
import { FlagView } from './FlagView';
import { FlagStudioModal } from './FlagStudioModal';
import { Scissors, Check, X, Palette, Flag } from 'lucide-react';
import { sound } from '../utils/audio';

interface NewStateCutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancelCut: () => void;
  onConfirm: (state: StateTerritory) => void;
  cutInfo: StateCutResult | null;
  parentCountryName: string;
}

export const NewStateCutModal: React.FC<NewStateCutModalProps> = ({
  isOpen,
  onClose,
  onCancelCut,
  onConfirm,
  cutInfo,
  parentCountryName,
}) => {
  const [name, setName] = useState('Novo Estado');
  const [capital, setCapital] = useState('Nova Capital');
  const [color, setColor] = useState(STATE_PALETTE[0]);
  const [flag, setFlag] = useState<FlagData>({
    type: 'custom',
    value: 'CUSTOM',
    customProps: {
      layout: 'horizontal',
      colors: ['#16a34a', '#ffffff', '#facc15'],
      emblem: 'star',
      emblemColor: '#1e3a8a',
    },
  });
  const [isFlagStudioOpen, setIsFlagStudioOpen] = useState(false);

  useEffect(() => {
    if (isOpen && cutInfo) {
      const col = STATE_PALETTE[cutInfo.newStateNumericId % STATE_PALETTE.length];
      setName('Novo Estado');
      setCapital('Nova Capital');
      setColor(col);
      setFlag({
        type: 'custom',
        value: 'CUSTOM',
        customProps: {
          layout: 'horizontal',
          colors: [col, '#ffffff', '#0f172a'],
          emblem: 'star',
          emblemColor: '#fbbf24',
        },
      });
    }
  }, [isOpen, cutInfo]);

  if (!isOpen || !cutInfo) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    sound.playImperialFanfare();

    const newState: StateTerritory = {
      id: `STATE_CUT_${cutInfo.countryId}_${Date.now()}`,
      numericId: cutInfo.newStateNumericId,
      countryId: cutInfo.countryId,
      name: name.trim(),
      capitalCity: capital.trim() || name.trim(),
      color,
      flag,
      centerX: cutInfo.centroid.x,
      centerY: cutInfo.centroid.y,
      territoryCells: cutInfo.cellCount,
    };

    onConfirm(newState);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
        <div className="bg-slate-900 border border-emerald-500/50 rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-slate-100">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Scissors className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-cinzel text-emerald-300">
                  Novo Estado Cortado ({parentCountryName})
                </h3>
                <p className="text-[11px] text-slate-400">
                  {cutInfo.sourceStateNames.length > 0
                    ? `Desmembrado de: ${cutInfo.sourceStateNames.slice(0, 3).join(', ')}`
                    : `Nova subdivisão em ${parentCountryName}`}{' '}
                  · {cutInfo.cellCount} km²
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onCancelCut();
                onClose();
              }}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleConfirm} className="p-6 space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-300 block mb-1">Nome do Estado</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                placeholder="Ex: Guanabara, Triângulo Mineiro..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">Capital do Estado</label>
              <input
                type="text"
                value={capital}
                onChange={(e) => setCapital(e.target.value)}
                placeholder="Cidade sede estadual..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                <Palette className="w-3.5 h-3.5 text-emerald-400" /> Cor no Mapa
              </label>
              <div className="flex gap-1.5 flex-wrap items-center">
                {STATE_PALETTE.slice(0, 10).map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setColor(col);
                    }}
                    style={{ backgroundColor: col }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      color === col ? 'border-white scale-115 shadow' : 'border-slate-700'
                    }`}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-6 h-6 rounded-full border border-slate-600 bg-transparent cursor-pointer p-0"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <FlagView flag={flag} width={54} height={36} className="border border-white/25" />
                <div>
                  <span className="font-semibold text-white block">Bandeira Estadual</span>
                  <span className="text-[11px] text-slate-400">
                    Desenhe ou importe do computador
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setIsFlagStudioOpen(true);
                }}
                className="px-3 py-1.5 bg-amber-400/15 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 rounded-lg font-semibold flex items-center gap-1.5 shrink-0"
              >
                <Flag className="w-3.5 h-3.5" /> Editar Bandeira
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  onCancelCut();
                  onClose();
                }}
                className="px-4 py-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                Cancelar Corte
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Fundar Estado
              </button>
            </div>
          </form>
        </div>
      </div>

      <FlagStudioModal
        isOpen={isFlagStudioOpen}
        onClose={() => setIsFlagStudioOpen(false)}
        countryName={name || 'Novo Estado'}
        initialFlag={flag}
        onSave={(newFlag) => setFlag(newFlag)}
      />
    </>
  );
};
