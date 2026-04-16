import { useEffect, useRef } from 'react';
import { createGame } from './game';
import './App.css';

function App() {
  const gameRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<ReturnType<typeof createGame> | null>(null);

  useEffect(() => {
    if (gameRef.current && !gameInstanceRef.current) {
      gameInstanceRef.current = createGame(gameRef.current);
    }

    return () => {
      if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy(true);
        gameInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="app-container">
      <div ref={gameRef} className="game-container" />
    </div>
  );
}

export default App;
