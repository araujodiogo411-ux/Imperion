import React from 'react';
import { GameTool } from '../types/game';
import {
  MousePointer,
  Scissors,
  Map as MapIcon,
  PenTool,
  Trees,
  Waves,
  Droplet,
  Crown,
  Swords,
  Handshake,
  HeartHandshake,
} from 'lucide-react';
import { sound } from '../utils/audio';

interface ToolbarProps {
  currentTool: GameTool;
  onSelectTool: (tool: GameTool) => void;
  brushRadius: number;
  onChangeBrushRadius: (radius: number) => void;
  onOpenEmpireModal: () => void;
  onOpenWarModal: () => void;
  onOpenDiplomacyModal: (mode: 'alliance' | 'peace') => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  onSelectTool,
  brushRadius,
  onChangeBrushRadius,
  onOpenEmpireModal,
  onOpenWarModal,
  onOpenDiplomacyModal,
}) => {
  const handleToolClick = (tool: GameTool) => {
    sound.playClick();
    if (tool === 'empire') {
      onOpenEmpireModal();
    } else if (tool === 'war') {
      onOpenWarModal();
    } else if (tool === 'alliance') {
      onOpenDiplomacyModal('alliance');
    } else if (tool === 'peace') {
      onOpenDiplomacyModal('peace');
    } else {
      onSelectTool(tool);
    }
  };

  const isTerraTool =
    currentTool === 'land' ||
    currentTool === 'water_shallow' ||
    currentTool === 'water_deep' ||
    currentTool === 'river';

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none">
      {/* Primary Tools Dock */}
      <div className="flex items-center gap-1 p-1 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl pointer-events-auto">
        <button
          onClick={() => handleToolClick('select')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            currentTool === 'select'
              ? 'bg-amber-400 text-slate-950'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Inspetor: Navegar e clicar em países para ver detalhes"
        >
          <MousePointer className="w-3.5 h-3.5" />
          <span>Inspetor</span>
        </button>

        <div className="w-[1px] h-5 bg-slate-800 mx-0.5" />

        <button
          onClick={() => handleToolClick('scissors')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            currentTool === 'scissors'
              ? 'bg-amber-400 text-slate-950'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Tesoura: Desenhe livremente para cortar fronteiras e fundar novo país"
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>Tesoura</span>
        </button>

        <button
          onClick={() => handleToolClick('states')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            currentTool === 'states'
              ? 'bg-amber-400 text-slate-950'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Estados: Editar divisões estaduais, capitais e cidades dos países"
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span>Estados</span>
        </button>

        <button
          onClick={() => handleToolClick('pencil')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            currentTool === 'pencil'
              ? 'bg-amber-400 text-slate-950'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Pincel: Desenhe e defina territórios para qualquer país"
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Pincel</span>
        </button>

        <div className="w-[1px] h-5 bg-slate-800 mx-0.5" />

        <button
          onClick={() => handleToolClick('land')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            currentTool === 'land'
              ? 'bg-amber-400 text-slate-950'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Terra: Desenhar novas ilhas e continentes no oceano"
        >
          <Trees className="w-3.5 h-3.5" />
          <span>Terra</span>
        </button>

        <button
          onClick={() => handleToolClick('water_shallow')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            currentTool === 'water_shallow'
              ? 'bg-amber-400 text-slate-950'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Água Rasa: Esculpir litoral e praias"
        >
          <Droplet className="w-3.5 h-3.5" />
          <span>Rasa</span>
        </button>

        <button
          onClick={() => handleToolClick('river')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            currentTool === 'river'
              ? 'bg-amber-400 text-slate-950'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Rios: Cortar rios e canais fluviais"
        >
          <Waves className="w-3.5 h-3.5" />
          <span>Rio</span>
        </button>

        <button
          onClick={() => handleToolClick('water_deep')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            currentTool === 'water_deep'
              ? 'bg-amber-400 text-slate-950'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Água Profunda: Afundar terras e criar oceanos"
        >
          <Waves className="w-3.5 h-3.5" />
          <span>Oceano</span>
        </button>

        <div className="w-[1px] h-5 bg-slate-800 mx-0.5" />

        <button
          onClick={() => handleToolClick('empire')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 hover:bg-amber-950/40 rounded-lg transition-colors whitespace-nowrap"
        >
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          <span>Impérios</span>
        </button>

        <button
          onClick={() => handleToolClick('war')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-300 hover:text-red-200 hover:bg-red-950/40 rounded-lg transition-colors whitespace-nowrap"
        >
          <Swords className="w-3.5 h-3.5 text-red-400" />
          <span>Guerra</span>
        </button>

        <button
          onClick={() => handleToolClick('alliance')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:text-blue-200 hover:bg-blue-950/40 rounded-lg transition-colors whitespace-nowrap"
        >
          <Handshake className="w-3.5 h-3.5 text-blue-400" />
          <span>Aliança</span>
        </button>

        <button
          onClick={() => handleToolClick('peace')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200 hover:bg-emerald-950/40 rounded-lg transition-colors whitespace-nowrap"
        >
          <HeartHandshake className="w-3.5 h-3.5 text-emerald-400" />
          <span>Paz</span>
        </button>
      </div>

      {/* Size selector for Terra / Água / Rio Fino */}
      {isTerraTool && (
        <div className="flex items-center gap-3 px-3.5 py-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg text-xs text-slate-300 shadow-xl pointer-events-auto">
          {currentTool === 'river' ? (
            <span className="text-cyan-300 font-medium flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5" /> Rio Fino (Linha 1.5px) — Desenhe livremente pelo continente
            </span>
          ) : (
            <>
              <span className="text-slate-400">Raio:</span>
              <input
                type="range"
                min={2}
                max={45}
                value={brushRadius}
                onChange={(e) => onChangeBrushRadius(Number(e.target.value))}
                className="w-24 accent-amber-400 cursor-pointer"
              />
              <span className="font-mono-numbers text-white w-6">{brushRadius}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};
