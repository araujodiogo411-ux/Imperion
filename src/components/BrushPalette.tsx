import React, { useState, useMemo } from 'react';
import { Country } from '../types/game';
import { FlagView } from './FlagView';
import {
  PenTool,
  Eraser,
  Sparkles,
  Pipette,
  Trash2,
  Search,
  Waves,
} from 'lucide-react';
import { sound } from '../utils/audio';
import { normalizeSearch } from '../utils/text';

interface BrushPaletteProps {
  countries: Country[];
  selectedCountry: Country | null;
  brushRadius: number;
  brushStyle: 'solid' | 'organic';
  brushAction: 'paint' | 'erase';
  paintOverWater: boolean;
  isEyedropperActive: boolean;
  onSelectCountry: (country: Country) => void;
  onChangeRadius: (r: number) => void;
  onChangeStyle: (s: 'solid' | 'organic') => void;
  onChangeAction: (a: 'paint' | 'erase') => void;
  onTogglePaintOverWater: () => void;
  onToggleEyedropper: () => void;
  onClearCountryTerritory: (country: Country) => void;
}

export const BrushPalette: React.FC<BrushPaletteProps> = ({
  countries,
  selectedCountry,
  brushRadius,
  brushStyle,
  brushAction,
  paintOverWater,
  isEyedropperActive,
  onSelectCountry,
  onChangeRadius,
  onChangeStyle,
  onChangeAction,
  onTogglePaintOverWater,
  onToggleEyedropper,
  onClearCountryTerritory,
}) => {
  const [search, setSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const filteredCountries = useMemo(() => {
    const q = normalizeSearch(search);
    const list = q
      ? countries.filter((c) => normalizeSearch(c.name).includes(q))
      : countries;
    return list.slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [countries, search]);

  return (
    <div className="absolute bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 pointer-events-auto max-w-[calc(100vw-0.75rem)]">
      {/* Country Quick-Selector Dropdown */}
      {showPicker && (
        <div className="w-[calc(100vw-1rem)] max-w-80 sm:w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl p-3 space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar país para definir território..."
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
                  onChangeAction('paint');
                  setShowPicker(false);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${
                  selectedCountry?.id === c.id
                    ? 'bg-amber-400/20 text-amber-200 border border-amber-400/40'
                    : 'hover:bg-slate-800 text-slate-200'
                }`}
              >
                <FlagView flag={c.flag} width={22} height={15} />
                <span className="truncate flex-1 font-medium">{c.name}</span>
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20"
                  style={{ backgroundColor: c.color }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Dock */}
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-xl shadow-2xl px-2.5 sm:px-3.5 py-2 flex items-center gap-2 sm:gap-3 text-xs flex-wrap justify-center max-h-[38vh] overflow-y-auto sm:overflow-visible">
        {/* Selected Country Button */}
        <button
          onClick={() => {
            sound.playClick();
            setShowPicker((p) => !p);
          }}
          className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors"
          title="Escolher país para pintar ou definir território"
        >
          {selectedCountry ? (
            <>
              <FlagView flag={selectedCountry.flag} width={22} height={15} />
              <span className="font-semibold text-white max-w-32 truncate">
                {selectedCountry.name}
              </span>
            </>
          ) : (
            <span className="text-amber-400 font-semibold">Escolher País...</span>
          )}
        </button>

        {/* Eyedropper */}
        <button
          onClick={() => {
            sound.playClick();
            onToggleEyedropper();
          }}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-colors ${
            isEyedropperActive
              ? 'bg-amber-400 text-slate-950 border-amber-300 font-semibold'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
          }`}
          title="Conta-gotas: Clique em qualquer país do mapa para selecioná-lo"
        >
          <Pipette className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Pegar do Mapa</span>
        </button>

        <div className="w-[1px] h-5 bg-slate-800" />

        {/* Paint vs Erase */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => {
              sound.playClick();
              onChangeAction('paint');
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
              brushAction === 'paint'
                ? 'bg-emerald-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" /> Pintar
          </button>
          <button
            onClick={() => {
              sound.playClick();
              onChangeAction('erase');
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
              brushAction === 'erase'
                ? 'bg-slate-200 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Transformar território em terra neutra sem país"
          >
            <Eraser className="w-3.5 h-3.5" /> Borracha
          </button>
        </div>

        {/* Artistic Brush Style */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => {
              sound.playClick();
              onChangeStyle('solid');
            }}
            className={`px-2 py-1 rounded-md transition-colors ${
              brushStyle === 'solid'
                ? 'bg-amber-400 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Liso
          </button>
          <button
            onClick={() => {
              sound.playClick();
              onChangeStyle('organic');
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
              brushStyle === 'organic'
                ? 'bg-amber-400 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Bordas orgânicas de cartografia artística"
          >
            <Sparkles className="w-3 h-3" /> Artístico
          </button>
        </div>

        {/* Brush Size Slider */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px]">Tamanho</span>
          <input
            type="range"
            min={2}
            max={45}
            value={brushRadius}
            onChange={(e) => onChangeRadius(Number(e.target.value))}
            className="w-20 accent-amber-400 cursor-pointer"
          />
          <span className="font-mono-numbers text-slate-300 w-6 text-[11px]">{brushRadius}</span>
        </div>

        {/* Paint Over Water Toggle */}
        <button
          onClick={() => {
            sound.playClick();
            onTogglePaintOverWater();
          }}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] transition-colors ${
            paintOverWater
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
          }`}
          title="Se ativo, o pincel também cria terra ao passar sobre o oceano"
        >
          <Waves className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Sobre o Mar</span>
        </button>

        {/* Clear Country Territory (Redefine from scratch) */}
        {selectedCountry && (
          <button
            onClick={() => {
              sound.playClick();
              onClearCountryTerritory(selectedCountry);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/70 transition-colors"
            title="Limpar todo o território atual deste país para redesenhá-lo do zero"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Limpar País</span>
          </button>
        )}
      </div>
    </div>
  );
};
