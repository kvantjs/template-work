import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (SelectOption | string)[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dropdownClassName?: string;
  searchable?: boolean;
  size?: 'sm' | 'md' | 'xs';
  icon?: React.ComponentType<{ className?: string }>;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Selecione uma opção...',
  disabled = false,
  className = '',
  dropdownClassName = '',
  searchable = false,
  size = 'md',
  icon: TriggerIcon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize options
  const normalizedOptions: SelectOption[] = options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return opt;
  });

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen, searchable]);

  const filteredOptions = searchable && searchTerm
    ? normalizedOptions.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opt.description && opt.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : normalizedOptions;

  const sizeClasses = {
    xs: 'px-2 py-1 text-[11px] min-h-[28px]',
    sm: 'px-2.5 py-1.5 text-xs min-h-[32px]',
    md: 'px-3 py-2 text-xs min-h-[36px]',
  };

  const SelectedIcon = selectedOption?.icon || TriggerIcon;

  return (
    <div className={`relative inline-block w-full text-left select-none ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 rounded-[6px] bg-[var(--bg-input)] border transition-all duration-150 text-left outline-none ${
          isOpen
            ? 'border-zinc-500 ring-1 ring-zinc-700/50 shadow-lg shadow-black/40'
            : 'border-[var(--border-subtle)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${sizeClasses[size]}`}
      >
        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
          {SelectedIcon && (
            <SelectedIcon className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
          )}
          <span className={`truncate font-medium ${selectedOption ? 'text-zinc-200' : 'text-zinc-500'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-[4px] bg-[var(--bg-active-pill)] text-zinc-400 border border-[var(--border-subtle)] flex-shrink-0">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180 text-zinc-200' : ''
          }`}
        />
      </button>

      {/* Pop-up Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 top-full mt-1.5 z-50 w-full min-w-[200px] rounded-[8px] bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl shadow-black/90 p-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 ${dropdownClassName}`}
        >
          {/* Search Box (if searchable) */}
          {searchable && (
            <div className="p-1.5 border-b border-[var(--border-subtle)] mb-1">
              <div className="flex items-center gap-2 px-2 py-1 rounded-[5px] bg-[var(--bg-input)] border border-[var(--border-subtle)]">
                <Search className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Pesquisar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent text-xs text-zinc-200 placeholder-zinc-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-zinc-500 font-medium">
                Nenhum resultado encontrado
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                const OptIcon = opt.icon;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[5px] text-xs transition-colors duration-100 text-left group ${
                      isSelected
                        ? 'bg-[var(--bg-active-pill)] text-zinc-100 font-medium'
                        : 'text-zinc-400 hover:bg-[var(--bg-hover)] hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                      {OptIcon && (
                        <OptIcon
                          className={`w-3.5 h-3.5 flex-shrink-0 ${
                            isSelected ? 'text-zinc-200' : 'text-zinc-500 group-hover:text-zinc-400'
                          }`}
                        />
                      )}
                      <div className="flex flex-col truncate">
                        <span className="truncate">{opt.label}</span>
                        {opt.description && (
                          <span className="text-[10px] text-zinc-500 truncate">
                            {opt.description}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      {opt.badge && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-[4px] bg-[#1a1a1a] text-zinc-400 border border-[#2a2a2a]">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-zinc-200 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
