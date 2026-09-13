import React, { useState, useRef, useEffect } from 'react';
import { Moon, Contrast, Check, ChevronDown, Palette } from 'lucide-react';
import { useTheme, ThemeMode } from '../../theme/ThemeContext';

interface ThemeToggleProps {
  variant?: 'compact' | 'segmented' | 'dropdown';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'compact', className = '' }) => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const themes: { id: ThemeMode; label: string; description: string; icon: typeof Moon }[] = [
    {
      id: 'deep-black',
      label: 'Deep Black',
      description: 'Preto puro (#0a0a0a) e alto contraste',
      icon: Moon,
    },
    {
      id: 'dark-gray',
      label: 'Dark Gray',
      description: 'Cinza escuro (#18181b) para menor fadiga visual',
      icon: Contrast,
    },
  ];

  const currentThemeObj = themes.find((t) => t.id === theme) || themes[0];
  const CurrentIcon = currentThemeObj.icon;

  if (variant === 'segmented') {
    return (
      <div
        id="theme-segmented-toggle"
        className={`w-full grid grid-cols-2 gap-1 p-0.5 rounded-[6px] bg-[var(--bg-card)] border border-[var(--border-subtle)] ${className}`}
      >
        {themes.map((t) => {
          const Icon = t.icon;
          const isActive = theme === t.id;
          return (
            <button
              key={t.id}
              id={`theme-btn-${t.id}`}
              type="button"
              onClick={() => setTheme(t.id)}
              className={`flex items-center justify-center gap-1.5 h-6.5 px-2 rounded-[4px] text-[11px] font-medium whitespace-nowrap transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[var(--bg-active-pill)] text-zinc-100 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[var(--bg-hover)]'
              }`}
              title={t.description}
            >
              <Icon className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{t.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Dropdown / Compact Mode with Pop-up
  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef} id="theme-toggle-container">
      <button
        type="button"
        id="theme-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        title={`Tema atual: ${currentThemeObj.label}. Clique para alternar.`}
        className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-zinc-100 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] px-2.5 py-1 rounded-[6px] transition-colors focus:outline-none"
      >
        <CurrentIcon className="w-3.5 h-3.5 text-zinc-400" />
        <span className="hidden sm:inline font-medium">{currentThemeObj.label}</span>
        <ChevronDown className="w-3 h-3 text-zinc-500 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {isOpen && (
        <div
          id="theme-toggle-dropdown"
          className="absolute right-0 mt-1.5 w-60 rounded-[6px] bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-xl z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
            <Palette className="w-3 h-3 text-zinc-400" />
            <span>Preferência de Contraste</span>
          </div>

          {themes.map((t) => {
            const Icon = t.icon;
            const isSelected = theme === t.id;
            return (
              <button
                key={t.id}
                id={`theme-option-${t.id}`}
                onClick={() => {
                  setTheme(t.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-start gap-2.5 p-2 rounded-[5px] text-left transition-colors ${
                  isSelected
                    ? 'bg-[var(--bg-active-pill)] text-zinc-100'
                    : 'text-zinc-300 hover:bg-[var(--bg-hover)] hover:text-zinc-100'
                }`}
              >
                <div
                  className={`mt-0.5 p-1 rounded-[4px] ${
                    isSelected ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-900 text-zinc-400'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{t.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-tight mt-0.5">{t.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
