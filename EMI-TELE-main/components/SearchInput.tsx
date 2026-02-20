'use client';

import { useState, useEffect, useRef } from 'react';

interface SearchInputProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  debounceMs?: number;
  autoFocus?: boolean;
}

export default function SearchInput({ onSearch, placeholder = 'Search by name (3+ chars), IMEI (15 digits), or Aadhaar (12 digits)...', debounceMs = 350, autoFocus }: SearchInputProps) {
  const [value, setValue] = useState('');
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setValue(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearch(v.trim());
    }, debounceMs);
  }

  function handleClear() {
    setValue('');
    if (timerRef.current) clearTimeout(timerRef.current);
    onSearch('');
  }

  return (
    <div className="relative group">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-gold-400 transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full bg-obsidian-900 border border-white/[0.08] rounded-2xl pl-11 pr-12 py-4 text-sm text-slate-200 placeholder-slate-600 
                   focus:outline-none focus:border-gold-500/50 focus:ring-2 focus:ring-gold-500/10 transition-all duration-200
                   group-hover:border-white/[0.12]"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
      {/* Subtle hint */}
      {!value && (
        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
          <span className="text-[10px] text-slate-700 hidden sm:block">Live search</span>
        </div>
      )}
    </div>
  );
}
