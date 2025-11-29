import React, { useState } from 'react';

interface SetupViewProps {
  onSave: (key: string) => void;
}

export const SetupView: React.FC<SetupViewProps> = ({ onSave }) => {
  const [keyInput, setKeyInput] = useState('');

  return (
    <div className="flex items-center w-full px-3 gap-2 animate-fadeIn">
      <input
        autoFocus
        type="password"
        placeholder="Enter Groq API Key (gsk_...)"
        className="flex-1 bg-transparent border-none outline-none text-white text-xs placeholder-gray-500 font-mono"
        value={keyInput}
        onChange={(e) => setKeyInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSave(keyInput);
          }
        }}
      />
      <button
        onClick={() => onSave(keyInput)}
        className="text-[10px] bg-white text-black font-bold px-2 py-1 rounded hover:bg-gray-200 transition-colors"
      >
        SAVE
      </button>
    </div>
  );
};
