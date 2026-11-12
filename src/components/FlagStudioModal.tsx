import React, { useState } from 'react';
import { FlagData, FlagCustomProps } from '../types/game';
import { FlagView } from './FlagView';
import { Upload, Palette, Check, X } from 'lucide-react';
import { sound } from '../utils/audio';

interface FlagStudioModalProps {
  initialFlag?: FlagData;
  countryName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (flag: FlagData) => void;
}

const PRESET_COLORS = [
  '#dc2626', // red
  '#16a34a', // green
  '#2563eb', // blue
  '#eab308', // gold/yellow
  '#ffffff', // white
  '#0f172a', // black/navy
  '#7c3aed', // purple
  '#ea580c', // orange
  '#06b6d4', // cyan
  '#be123c', // crimson
];

export const FlagStudioModal: React.FC<FlagStudioModalProps> = ({
  initialFlag,
  countryName,
  isOpen,
  onClose,
  onSave,
}) => {
  const [mode, setMode] = useState<'custom' | 'upload'>(
    initialFlag?.type === 'upload' ? 'upload' : 'custom'
  );

  const [layout, setLayout] = useState<FlagCustomProps['layout']>(
    initialFlag?.customProps?.layout || 'horizontal'
  );
  const [colors, setColors] = useState<string[]>(
    initialFlag?.customProps?.colors || ['#dc2626', '#ffffff', '#2563eb']
  );
  const [emblem, setEmblem] = useState<FlagCustomProps['emblem']>(
    initialFlag?.customProps?.emblem || 'star'
  );
  const [emblemColor, setEmblemColor] = useState<string>(
    initialFlag?.customProps?.emblemColor || '#f59e0b'
  );
  const [uploadedUrl, setUploadedUrl] = useState<string>(
    initialFlag?.type === 'upload' ? initialFlag.value : ''
  );

  if (!isOpen) return null;

  const currentFlagData: FlagData =
    mode === 'upload' && uploadedUrl
      ? { type: 'upload', value: uploadedUrl }
      : {
          type: 'custom',
          value: 'CUSTOM',
          customProps: {
            layout,
            colors,
            emblem,
            emblemColor,
          },
        };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setUploadedUrl(url);
        setMode('upload');
        sound.playClick();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleColorChange = (index: number, newColor: string) => {
    const updated = [...colors];
    updated[index] = newColor;
    setColors(updated);
    sound.playClick();
  };

  const handleSave = () => {
    sound.playClick();
    onSave(currentFlagData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold font-cinzel text-amber-400">
              Estúdio Heráldico & Bandeira
            </h3>
            <p className="text-xs text-slate-400">
              {countryName ? `Definir estandarte para: ${countryName}` : 'Personalize o pavilhão nacional'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Flag Preview */}
          <div className="flex flex-col items-center justify-center bg-slate-950 p-6 rounded-lg border border-slate-800">
            <span className="text-xs text-slate-400 mb-2">Pré-visualização do Pavilhão</span>
            <FlagView flag={currentFlagData} width={180} height={120} className="shadow-lg border-2 border-white/20" />
          </div>

          {/* Mode Switch */}
          <div className="flex gap-2 p-1 bg-slate-800 rounded-lg">
            <button
              onClick={() => {
                setMode('custom');
                sound.playClick();
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md flex items-center justify-center gap-2 transition-colors ${
                mode === 'custom' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Palette className="w-4 h-4" /> Desenhar com Formas
            </button>
            <button
              onClick={() => {
                setMode('upload');
                sound.playClick();
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md flex items-center justify-center gap-2 transition-colors ${
                mode === 'upload' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4" /> Importar do Computador
            </button>
          </div>

          {/* Custom Mode Controls */}
          {mode === 'custom' && (
            <div className="space-y-4">
              {/* Layout Picker */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Padrão Geométrico
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'horizontal', label: 'Faixas Horizontais' },
                      { id: 'vertical', label: 'Faixas Verticais' },
                      { id: 'cross', label: 'Cruz Nórdica' },
                      { id: 'canton', label: 'Cantão Superior' },
                      { id: 'saltire', label: 'Cruz Diagonal' },
                      { id: 'solid', label: 'Campo Sólido' },
                    ] as const
                  ).map((pat) => (
                    <button
                      key={pat.id}
                      onClick={() => {
                        setLayout(pat.id);
                        sound.playClick();
                      }}
                      className={`px-2 py-1.5 text-xs rounded border text-left transition-colors ${
                        layout === pat.id
                          ? 'border-amber-400 bg-amber-500/10 text-amber-300'
                          : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {pat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors Pickers */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 block">
                  Cores das Faixas e Fundo
                </label>
                {colors.slice(0, layout === 'solid' ? 1 : 3).map((col, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-14">Cor {idx + 1}:</span>
                    <div className="flex gap-1.5 flex-wrap flex-1">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => handleColorChange(idx, c)}
                          style={{ backgroundColor: c }}
                          className={`w-6 h-6 rounded-full border transition-transform ${
                            col === c ? 'scale-125 border-amber-400 shadow-xs' : 'border-slate-600 hover:scale-110'
                          }`}
                        />
                      ))}
                      <input
                        type="color"
                        value={col}
                        onChange={(e) => handleColorChange(idx, e.target.value)}
                        className="w-6 h-6 rounded border border-slate-600 bg-transparent cursor-pointer p-0"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Emblems */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Brasão / Emblema Central
                </label>
                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  {(
                    [
                      { id: 'none', label: 'Nenhum' },
                      { id: 'star', label: 'Estrela' },
                      { id: 'sun', label: 'Sol' },
                      { id: 'eagle', label: 'Águia' },
                      { id: 'shield', label: 'Escudo' },
                      { id: 'crescent', label: 'Crescente' },
                      { id: 'crown', label: 'Coroa' },
                      { id: 'sword', label: 'Espada' },
                      { id: 'lion', label: 'Leão' },
                      { id: 'circle', label: 'Círculo' },
                    ] as const
                  ).map((emb) => (
                    <button
                      key={emb.id}
                      onClick={() => {
                        setEmblem(emb.id);
                        sound.playClick();
                      }}
                      className={`px-1.5 py-1 text-xs rounded border text-center transition-colors ${
                        emblem === emb.id
                          ? 'border-amber-400 bg-amber-500/10 text-amber-300 font-semibold'
                          : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {emb.label}
                    </button>
                  ))}
                </div>

                {emblem !== 'none' && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-400">Cor do Brasão:</span>
                    {['#f59e0b', '#ffffff', '#dc2626', '#16a34a', '#000000'].map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setEmblemColor(c);
                          sound.playClick();
                        }}
                        style={{ backgroundColor: c }}
                        className={`w-5 h-5 rounded-full border ${
                          emblemColor === c ? 'border-amber-400 scale-125' : 'border-slate-600'
                        }`}
                      />
                    ))}
                    <input
                      type="color"
                      value={emblemColor}
                      onChange={(e) => setEmblemColor(e.target.value)}
                      className="w-5 h-5 rounded border border-slate-600 bg-transparent cursor-pointer p-0"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Upload Mode Controls */}
          {mode === 'upload' && (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-slate-700 hover:border-amber-400 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-800/40">
                <Upload className="w-10 h-10 text-amber-400 mb-2" />
                <span className="text-sm font-semibold text-slate-200">
                  Clique para carregar uma imagem do seu computador
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  Suporta PNG, JPG, WEBP ou SVG do seu armazenamento local
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {uploadedUrl && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  Imagem carregada com sucesso do dispositivo local!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/80">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" /> Aplicar Bandeira
          </button>
        </div>
      </div>
    </div>
  );
};
