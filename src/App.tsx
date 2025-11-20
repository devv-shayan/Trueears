import React from 'react';
import { RecorderOverlay } from './components/RecorderOverlay';

const App: React.FC = () => {
  return (
    <div className="bg-transparent min-h-screen w-full">
      {/* The Overlay Component is the only thing we render */}
      <RecorderOverlay />
    </div>
  );
};

export default App;