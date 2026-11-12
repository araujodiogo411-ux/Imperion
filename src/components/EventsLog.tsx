import React from 'react';
import { SimEvent } from '../types/game';
import {
  Scroll,
  X,
  Swords,
  HeartHandshake,
  Crown,
  Scissors,
  Cpu,
  AlertTriangle,
  Mail,
} from 'lucide-react';

interface EventsLogProps {
  isOpen: boolean;
  onClose: () => void;
  events: SimEvent[];
}

export const EventsLog: React.FC<EventsLogProps> = ({ isOpen, onClose, events }) => {
  if (!isOpen) return null;

  const getEventIcon = (type: SimEvent['type']) => {
    switch (type) {
      case 'war':
        return <Swords className="w-4 h-4 text-red-400" />;
      case 'peace':
        return <HeartHandshake className="w-4 h-4 text-emerald-400" />;
      case 'empire':
        return <Crown className="w-4 h-4 text-amber-400" />;
      case 'cut':
        return <Scissors className="w-4 h-4 text-amber-400" />;
      case 'tech':
        return <Cpu className="w-4 h-4 text-cyan-400" />;
      case 'crisis':
        return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case 'diplomacy':
        return <Mail className="w-4 h-4 text-blue-400" />;
      default:
        return <Scroll className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-xl w-full overflow-hidden text-slate-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 text-amber-400 flex items-center justify-center border border-slate-700">
              <Scroll className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-cinzel text-amber-300">
                Crônicas e Decretos Históricos
              </h3>
              <p className="text-xs text-slate-400">
                Telegramas diplomáticos, tratados, revoluções tecnológicas e crises mundiais
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

        {/* Events List */}
        <div className="p-6 overflow-y-auto space-y-2.5">
          {events.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              Nenhum evento registrado ainda. Inicie o fluxo temporal para que os países ajam!
            </div>
          ) : (
            events.map((evt) => (
              <div
                key={evt.id}
                className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 hover:border-slate-700 transition-colors text-xs flex items-start gap-3"
              >
                <div className="mt-0.5 shrink-0 p-1.5 rounded bg-slate-900 border border-slate-800">
                  {getEventIcon(evt.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-200 font-semibold">{evt.title}</strong>
                    <span className="text-[11px] text-slate-500 font-mono-numbers">{evt.date}</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">{evt.description}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex justify-between items-center bg-slate-950 text-xs text-slate-400">
          <span>Total de acontecimentos: {events.length}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-semibold text-slate-300 hover:text-white bg-slate-800 rounded hover:bg-slate-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
