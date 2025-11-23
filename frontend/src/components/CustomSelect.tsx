import React, { useState, useRef, useEffect } from 'react';

interface CustomSelectProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ value, options, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-white/30 transition-colors font-mono flex items-center justify-between hover:bg-white/10"
        type="button"
      >
        <span className="truncate mr-2">{value || placeholder}</span>
        <svg 
          className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute bottom-full left-0 w-full mb-1 bg-[#1a1a1a] border border-white/10 rounded-md shadow-xl overflow-hidden z-50 max-h-48 overflow-y-auto">
            {options.map((option) => (
                <button
                key={option}
                onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                }}
                className={`w-full text-left px-2 py-1.5 text-xs font-mono transition-colors block truncate ${
                    option === value 
                    ? 'bg-white/20 text-white font-medium' 
                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
                type="button"
                title={option}
                >
                {option}
                </button>
            ))}
        </div>
      )}
    </div>
  );
};
