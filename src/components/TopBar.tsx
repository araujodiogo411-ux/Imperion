import React, { useState, useMemo } from 'react';
import { Country } from '../types/game';
import { FlagView } from './FlagView';
import {
  Play,
  Pause,
  FastForward,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Search,
  X,
  Bot,
} from 'lucide-react';
import { sound } from '../utils/audio';

interface TopBarProps {
  year: number;
  day: number;
  simSpeed: number;
  isPaused: boolean;
  showDayNight: boolean;
  soundEnabled: boolean;
  aiAutonomy: boolean;
  activeWarsCount: number;
  empiresCount: number;
  countriesCount: number;
  countries: Country[];
  onSelectCountryFromSearch: (country: Country) => void;
  onTogglePause: () => void;
  onSetSpeed: (speed: number) => void;
  onStepDay: () => void;
  onToggleDayNight: () => void;
  onToggleSound: () => void;
  onToggleAiAutonomy: () => void;
  onOpenEventsLog: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  year,
  day,
  simSpeed,
  isPaused,
  showDayNight,
  soundEnabled,
  aiAutonomy,
  activeWarsCount,
  empiresCount,
  countriesCount,
  countries,
  onSelectCountryFromSearch,
  onTogglePause,
  onSetSpeed,
  onStepDay,
  onToggleDayNight,
  onToggleSound,
  onToggleAiAutonomy,
  onOpenEventsLog,
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filteredCountries = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? countries.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.capital.toLowerCase().includes(q) ||
            c.continent.toLowerCase().includes(q)
        )
      : countries;
    return list.slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [countries, query]);

  return (
    <header className="relative h-14 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between gap-6 z-30 shrink-0">
      {/* Zone 1: Single Brand Wordmark */}
      <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
        <span className="font-cinzel text-base font-black tracking-wider text-amber-400">
          IMPERIUM 2D
        </span>
      </div>

      {/* Zone 2: Navigation Links & Simulation Metrics */}
      <nav className="hidden lg:flex items-center gap-6 text-xs text-slate-400 whitespace-nowrap shrink-0">
        <span className="text-slate-300">
          Países: <strong className="text-white font-mono-numbers">{countriesCount}</strong>
        </span>
        <span aria-hidden="true" className="text-slate-600">·</span>
        <span className="text-slate-300">
          Impérios: <strong className="text-amber-400 font-mono-numbers">{empiresCount}</strong>
        </span>
        <span aria-hidden="true" className="text-slate-600">·</span>
        <span className="text-slate-300">
          Guerras Ativas:{' '}
          <strong className={activeWarsCount > 0 ? 'text-red-400 font-mono-numbers font-bold' : 'text-slate-400 font-mono-numbers'}>
            {activeWarsCount}
          </strong>
        </span>
        <span aria-hidden="true" className="text-slate-600">·</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 rounded border border-slate-800 text-white font-mono-numbers">
          <span>Ano {year}</span>
          <span className="text-slate-500">/</span>
          <span>Dia {day}</span>
        </div>
      </nav>

      {/* Zone 3: Primary Action & Time Controls */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Global Country Search Button */}
        <div className="relative">
          <button
            onClick={() => {
              sound.playClick();
              setSearchOpen((v) => !v);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
              searchOpen
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:text-white hover:border-slate-700'
            }`}
            title="Pesquisar qualquer país do mundo"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pesquisar País</span>
          </button>

          {searchOpen && (
            <div className="absolute right-0 top-11 w-80 bg-slate-900/98 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl p-3 space-y-2 z-50">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-amber-300">Pesquisar Nação ({countries.length})</span>
                <button onClick={() => setSearchOpen(false)} className="hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nome, capital ou continente..."
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                {filteredCountries.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      sound.playClick();
                      onSelectCountryFromSearch(c);
                      setSearchOpen(false);
                      setQuery('');
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-left hover:bg-slate-800 text-slate-200 transition-colors"
                  >
                    <FlagView flag={c.flag} width={22} height={15} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{c.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {c.capital} · {c.ideology}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Time Speed Controls */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => {
              sound.playClick();
              onTogglePause();
            }}
            className={`p-1.5 rounded transition-colors ${
              isPaused ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
            title={isPaused ? 'Continuar Simulação' : 'Pausar Simulação'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          {[1, 2, 5].map((spd) => (
            <button
              key={spd}
              onClick={() => {
                sound.playClick();
                onSetSpeed(spd);
              }}
              className={`px-2 py-1 text-[11px] font-mono-numbers font-semibold rounded transition-colors ${
                !isPaused && simSpeed === spd
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {spd}x
            </button>
          ))}

          <button
            onClick={() => {
              sound.playClick();
              onStepDay();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded transition-colors"
            title="Avançar 1 Dia"
          >
            <FastForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Day/Night Toggle */}
        <button
          onClick={() => {
            sound.playClick();
            onToggleDayNight();
          }}
          className={`p-2 rounded-lg border text-xs transition-colors ${
            showDayNight
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/40'
              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
          }`}
          title="Alternar Ciclo Solar Dia/Noite"
        >
          {showDayNight ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Autonomous AI Toggle */}
        <button
          onClick={() => {
            sound.playClick();
            onToggleAiAutonomy();
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
            aiAutonomy
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
          }`}
          title="Ativar/Desativar decisões autônomas dos países (leis, decretos, ideologias e guerras)"
        >
          <Bot className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">{aiAutonomy ? 'IA: ON' : 'IA: OFF'}</span>
        </button>

        {/* Audio Toggle */}
        <button
          onClick={() => {
            onToggleSound();
          }}
          className={`p-2 rounded-lg border text-xs transition-colors ${
            soundEnabled
              ? 'bg-slate-950 text-slate-300 border-slate-800 hover:text-white'
              : 'bg-red-950/40 text-red-400 border-red-900/60'
          }`}
          title="Efeitos Sonoros"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Crônicas / Eventos */}
        <button
          onClick={() => {
            sound.playClick();
            onOpenEventsLog();
          }}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
        >
          Crônicas do Mundo
        </button>
      </div>
    </header>
  );
};
