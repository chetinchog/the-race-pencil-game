
import React, { useState, useEffect, useRef } from 'react';
import { GameEngine, ACTIONS, DIRECTIONS } from './logic/GameEngine';
import { generateCircuit } from './logic/CircuitGenerator';
import CanvasRenderer from './components/CanvasRenderer';
import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import './App.css';



const GAME_VERSION = 'v1.7.1';
const DEFAULT_NAMES = ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5', 'Player 6', 'Player 7', 'Player 8'];
const PLAYER_COLORS = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#ff9800', '#9c27b0', '#00bcd4', '#795548'];

const SketchyCar = ({ className, style }) => (
  <svg viewBox="0 0 100 50" className={className} style={{ width: '80px', height: '40px', ...style }} xmlns="http://www.w3.org/2000/svg">
    <path d="M10,35 L12,32 L80,30 L88,35 L82,43 L15,44 Z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M35,30 L42,18 L65,18 L72,30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M82,30 L82,20 L98,20 L98,30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="28" cy="42" r="7" fill="white" stroke="currentColor" strokeWidth="2" />
    <circle cx="78" cy="42" r="7" fill="white" stroke="currentColor" strokeWidth="2" />
    <path d="M28,42 L28,35 M78,42 L78,35" stroke="currentColor" strokeWidth="1" />
  </svg>
);

const SunIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"></circle>
    <line x1="12" y1="1" x2="12" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="23"></line>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
    <line x1="1" y1="12" x2="3" y2="12"></line>
    <line x1="21" y1="12" x2="23" y2="12"></line>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
);

const GPSIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="16"></line>
    <line x1="8" y1="12" x2="16" y2="12"></line>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

function App() {
  const [gameState, setGameState] = useState('MENU'); // MENU, LOBBY, RACING, FINISH
  const [multiplayerMode, setMultiplayerMode] = useState('LOCAL'); // LOCAL, ONLINE
  const [track, setTrack] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('raceTheme') || 'light');

  // Delayed UI state for smooth turns

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('raceTheme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const [playerNames, setPlayerNames] = useState(() => {
    const saved = localStorage.getItem('racePlayerNames');
    return saved ? JSON.parse(saved) : DEFAULT_NAMES;
  });
  const [onlineName, setOnlineName] = useState(() => {
    return localStorage.getItem('raceOnlineName') || 'Speedy Racer';
  });
  const [players, setPlayers] = useState([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [winner, setWinner] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [myId] = useState(() => Math.random().toString(36).substr(2, 9));
  const [isHost, setIsHost] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [gamePlayerCount, setGamePlayerCount] = useState(2);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [gameLaps, setGameLaps] = useState(1);
  const [gameComplexity, setGameComplexity] = useState(1);
  const [countdown, setCountdown] = useState(null); // null, 3, 2, 1, 'GO'
  const [crashNotification, setCrashNotification] = useState(null);
  const lastCrashedIdRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('racePlayerNames', JSON.stringify(playerNames));
  }, [playerNames]);

  useEffect(() => {
    localStorage.setItem('raceOnlineName', onlineName);
  }, [onlineName]);

  // Delayed UI state for smooth turns
  const [displayedPlayerIndex, setDisplayedPlayerIndex] = useState(0);
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);

  useEffect(() => {
    // If it's the first load or invalid, set immediately
    if (displayedPlayerIndex === null) {
      setDisplayedPlayerIndex(currentPlayerIndex);
      setIsProcessingTurn(false);
      return;
    }

    // Delay the UI update to match camera pan (approx 1.5s)
    const timer = setTimeout(() => {
      setDisplayedPlayerIndex(currentPlayerIndex);
      setIsProcessingTurn(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [currentPlayerIndex]);

  // Derived state for UI rendering
  // If we are in the middle of a reset or init, fallback to current
  const uiPlayerIndex = (players && players[displayedPlayerIndex]) ? displayedPlayerIndex : currentPlayerIndex;
  const uiPlayer = players[uiPlayerIndex];

  const updatePlayerName = (index, name) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };


  const resetToMenu = () => {
    setRoomCode('');
    setIsHost(false);
    setGameState('MENU');
    setWinner(null);
    setLeaderboard([]);
  };

  const startRace = (playerCount) => {
    setLeaderboard([]);
    const width = 80;
    const height = 50;
    const calculatedTrackWidth = playerCount + 2;
    const newGrid = generateCircuit(width, height, calculatedTrackWidth, gameComplexity);
    setTrack(newGrid);

    // Find spawn squares (2)
    const spawnPoints = [];
    newGrid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell === 2) spawnPoints.push({ x, y });
      });
    });

    // Sort spawns by X to handle centering
    const sortedSpawns = [...spawnPoints].sort((a, b) => a.x - b.x);

    // Center the players: Pick middle indices
    const totalSpawns = sortedSpawns.length;
    const startIdx = Math.floor((totalSpawns - playerCount) / 2);

    // Assign spawns to players
    const finalSpawns = sortedSpawns.slice(startIdx, startIdx + playerCount);
    // If not enough spawns (shouldn't happen with correct trackWidth), fallback to all
    const activeSpawns = finalSpawns.length === playerCount ? finalSpawns : sortedSpawns.slice(0, playerCount);

    const newPlayers = Array.from({ length: playerCount }, (_, i) => ({
      id: i,
      name: playerNames[i] || `Player ${i + 1}`,
      pos: activeSpawns[i] || { x: 5, y: 5 }, // Fallback if activeSpawns is somehow empty
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      speed: 0,
      dir: { x: 0, y: -1 },
      history: [],
      isCrashed: false,
      finished: false,
      lapsCompleted: 0,
      turns: 0
    }));

    setPlayers(newPlayers);
    setCurrentPlayerIndex(0);
    setGameState('RACING');
    runCountdown();
  };

  const runCountdown = () => {
    setCountdown(5);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (typeof prev === 'number' && prev > 1) return prev - 1;
        if (prev === 1) return 'GO';
        if (prev === 'GO') {
          clearInterval(timer);
          // Stay for 1s (the interval duration we just waited), then clear.
          // Since we are AT the 1s mark (interval fired), we clear immediately to match "1 second".
          // If we want it to stay for 1 second TOTAL, and the interval is 1s...
          // The 'GO' triggered at T=0. This interval is T=1.
          // So it has been visible for 1s. We can clear it now.
          setCountdown(null);
          return 'GO';
        }
        return prev;
      });
    }, 1000);
  };

  // Online Logic
  const createRoom = async () => {
    setIsLoading(true);
    try {
      const code = Math.random().toString(36).substr(2, 6).toUpperCase();
      setRoomCode(code);
      setIsHost(true);

      const initialPlayer = {
        id: myId,
        name: onlineName,
        color: PLAYER_COLORS[0],
        pos: { x: 0, y: 0 },
        history: [],
        turns: 0,
        finished: false,
        isCrashed: false,
        speed: 0,
        dir: DIRECTIONS.UP
      };

      await setDoc(doc(db, 'rooms', code), {
        status: 'LOBBY',
        hostId: myId,
        players: [initialPlayer],
        maxPlayers: gamePlayerCount,
        currentPlayerIndex: 0,
        trackIdx: 0,
        lastUpdated: Date.now()
      });

      setGameState('LOBBY');
    } catch (error) {
      console.error("Error creating room:", error);
      alert("Failed to create room.");
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoom = async (code) => {
    if (!code) return;
    setIsLoading(true);
    try {
      const roomRef = doc(db, 'rooms', code.toUpperCase());
      const roomSnap = await getDoc(roomRef);

      if (roomSnap.exists()) {
        const data = roomSnap.data();
        if (data.status !== 'LOBBY') {
          alert('Game already in progress');
          return;
        }
        if (data.players.length >= (data.maxPlayers || 4)) {
          alert('Room full');
          return;
        }

        const newPlayer = {
          id: myId,
          name: onlineName,
          color: PLAYER_COLORS[data.players.length] || `#${Math.floor(Math.random() * 16777215).toString(16)}`,
          pos: { x: 0, y: 0 },
          history: [],
          turns: 0,
          finished: false,
          isCrashed: false,
          speed: 0,
          dir: DIRECTIONS.UP
        };

        await updateDoc(roomRef, {
          players: [...data.players, newPlayer],
          lastUpdated: Date.now()
        });

        setRoomCode(code.toUpperCase());
        setIsHost(false);
        setGameState('LOBBY');
      } else {
        alert('Room not found');
      }
    } catch (error) {
      console.error("Error joining room:", error);
      alert("Failed to join room.");
    } finally {
      setIsLoading(false);
    }
  };

  const startOnlineRace = async () => {
    setIsLoading(true);
    try {
      const trackWidth = players.length + 2;
      const newTrack = generateCircuit(30, 40, trackWidth, gameComplexity);

      const spawnPoints = [];
      newTrack.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell === 2) spawnPoints.push({ x, y });
        });
      });

      const shuffledSpawns = [...spawnPoints].sort(() => Math.random() - 0.5);

      const updatedPlayers = players.map((p, i) => ({
        ...p,
        pos: shuffledSpawns[i] || shuffledSpawns[0] || { x: 5, y: 5 },
        speed: 0,
        dir: { x: 0, y: -1 },
        history: [],
        isCrashed: false,
        finished: false,
        lapsCompleted: 0
      })).sort(() => Math.random() - 0.5);

      await updateDoc(doc(db, 'rooms', roomCode), {
        status: 'RACING',
        track: JSON.stringify(newTrack),
        players: updatedPlayers,
        currentPlayerIndex: 0,
        maxLaps: gameLaps,
        complexity: gameComplexity,
        lastUpdated: Date.now()
      });
    } catch (error) {
      console.error("Error starting race:", error);
      alert("Failed to start race.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!roomCode) return;

    const unsubscribe = onSnapshot(doc(db, 'rooms', roomCode), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setPlayers(data.players);
        setCurrentPlayerIndex(data.currentPlayerIndex);
        if (data.track) setTrack(JSON.parse(data.track));
        if (data.maxPlayers) setMaxPlayers(data.maxPlayers);
        if (data.maxLaps) setGameLaps(data.maxLaps);
        if (data.complexity) setGameComplexity(data.complexity);

        if (data.status === 'RACING' && gameState !== 'RACING') {
          setGameState('RACING');
          runCountdown();
        }
        if (data.status === 'FINISH' && gameState !== 'FINISH') {
          calculateWinner(data.players);
          setGameState('FINISH');
        }
      }
    });

    return () => unsubscribe();
  }, [roomCode, gameState]);

  const handleAction = (action) => {
    if (countdown !== null && countdown !== 'GO') return;
    if (isProcessingTurn) return; // Prevent double clicks

    const player = players[currentPlayerIndex];
    if (player.finished) {
      nextTurn();
      return;
    }

    // Online turn check
    if (multiplayerMode === 'ONLINE' && player.id !== myId) {
      return;
    }

    setIsProcessingTurn(true); // Lock controls

    const nextState = GameEngine.movePlayer(player, action);

    let finalPos = { ...nextState.pos };
    let finalSpeed = nextState.speed;
    let isCrashed = false;
    let finished = false;
    let actualPath = [];
    let prevStep = { ...player.pos };

    const targetLaps = multiplayerMode === 'ONLINE' ? gameLaps : gameLaps; // gameLaps is already updated by room data for online
    let currentLaps = player.lapsCompleted || 0;

    // Path includes the squares the car passes through
    for (const step of nextState.path) {
      const cell = track[step.y]?.[step.x];

      // Check for finish line first (Highest priority)
      if (cell === 3) {
        // Crossing the line!
        currentLaps++;
        if (currentLaps >= targetLaps) {
          finished = true;
          finalPos = step;
          actualPath.push(step);
          break;
        }
      }

      // Check for crash (Wall or outside map)
      if (cell === 0 || cell === undefined) {
        isCrashed = true;
        finalSpeed = 0;
        finalPos = prevStep; // Stay in the square BEFORE the wall
        break; // Stop movement before crash
      }

      actualPath.push(step);
      prevStep = step;
    }

    const updatedPlayer = {
      ...nextState,
      pos: finalPos,
      speed: finalSpeed,
      isCrashed: isCrashed,
      finished: finished,
      lapsCompleted: currentLaps,
      history: [...player.history, player.pos],
      turns: (player.turns || 0) + 1,
      path: actualPath
    };

    // Trigger Crash Notification directly on event
    if (isCrashed) {
      setTimeout(() => {
        setCrashNotification("¡CRASHED!");
        setTimeout(() => setCrashNotification(null), 2000);
      }, 500);
    }

    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = updatedPlayer;

    if (multiplayerMode === 'ONLINE') {
      const nextIdx = getNextTurnIndex(newPlayers);
      const anyoneFinished = newPlayers.some(p => p.finished);
      const allFinished = newPlayers.every(p => p.finished);

      let newStatus = 'RACING';
      if (allFinished || (anyoneFinished && nextIdx === 0)) {
        newStatus = 'FINISH';
      }

      // UPDATE 1: Always update the player's position first
      updateDoc(doc(db, 'rooms', roomCode), {
        players: newPlayers,
        status: newStatus, // If finished, this might end it
        lastUpdated: Date.now()
      });

      // UPDATE 2: Handle Turn Change (Delayed if Crashed)
      if (isCrashed) {
        // Wait for Banner (500ms anim + 2000ms banner = 2500ms)
        setTimeout(() => {
          updateDoc(doc(db, 'rooms', roomCode), {
            currentPlayerIndex: nextIdx,
            lastUpdated: Date.now()
          });
        }, 2500);
      } else if (!allFinished && newStatus !== 'FINISH') {
        // Immediate turn change if not crashed
        updateDoc(doc(db, 'rooms', roomCode), {
          currentPlayerIndex: nextIdx
        });
      }

    } else {
      setPlayers(newPlayers);

      if (isCrashed) {
        // Wait for Banner (500ms anim + 2000ms banner = 2500ms)
        setTimeout(() => {
          nextTurn(newPlayers);
        }, 2500);
      } else {
        nextTurn(newPlayers);
      }
    }
  };

  const getNextTurnIndex = (currentPlayers) => {
    return (currentPlayerIndex + 1) % currentPlayers.length;
  };

  const nextTurn = (currentPlayers = players) => {
    let nextIndex = getNextTurnIndex(currentPlayers);

    // Check if everyone finished
    const allFinished = currentPlayers.every(p => p.finished);
    if (allFinished) {
      calculateWinner(currentPlayers);
      setGameState('FINISH');
      return;
    }

    // Finish current round if anyone finished
    const anyoneFinished = currentPlayers.some(p => p.finished);
    if (anyoneFinished && nextIndex === 0) {
      calculateWinner(currentPlayers);
      setGameState('FINISH');
      return;
    }

    setCurrentPlayerIndex(nextIndex);
  };

  const [leaderboard, setLeaderboard] = useState([]);

  // ... (inside App component)

  // Detect Crashes for Notification: Removed in favor of direct trigger in movePlayer

  const calculateWinner = (currentPlayers) => {
    const finishedPlayers = currentPlayers.filter(p => p.finished);
    if (finishedPlayers.length === 0) return;

    // Sort by turns ascending, then speed descending
    finishedPlayers.sort((a, b) => {
      if (a.turns !== b.turns) return a.turns - b.turns;
      return b.speed - a.speed;
    });

    setLeaderboard(finishedPlayers);
    setWinner(finishedPlayers[0]);
  };

  const currentPlayer = players[currentPlayerIndex];

  return (
    <div className={`app-container state-${gameState.toLowerCase()}`}>
      <button className="theme-toggle" onClick={toggleTheme} title="Toggle Theme">
        {theme === 'light' ? <MoonIcon /> : <SunIcon />}
      </button>
      <div className="version-tag">{GAME_VERSION}</div>
      {gameState === 'MENU' && (
        <div className="menu-container">
          <div className="title-group">
            <SketchyCar className="title-car-left" />
            <h1 className="sketchy-title">THE RACE</h1>
            <SketchyCar className="title-car-right" />
            <span className="pencil-subtitle">Pencil game</span>
          </div>

          <div className="mode-toggle">
            <button
              className={`sketchy-button ${multiplayerMode === 'LOCAL' ? 'active' : ''}`}
              onClick={() => {
                setMultiplayerMode('LOCAL');
                setIsLoading(false);
              }}
            >
              Local Play
            </button>
            <button
              className={`sketchy-button ${multiplayerMode === 'ONLINE' ? 'active' : ''}`}
              onClick={() => {
                setMultiplayerMode('ONLINE');
                setIsLoading(false);
              }}
            >
              Online Play
            </button>
          </div>

          <div className="menu-card settings-grid">
            <div className="stepper-section">
              <p>Players:</p>
              <div className="numeric-stepper">
                <button
                  className="stepper-btn"
                  onClick={() => setGamePlayerCount(Math.max(2, gamePlayerCount - 1))}
                  disabled={gamePlayerCount <= 2}
                >▼</button>
                <div className="stepper-value">{gamePlayerCount}</div>
                <button
                  className="stepper-btn"
                  onClick={() => setGamePlayerCount(Math.min(8, gamePlayerCount + 1))}
                  disabled={gamePlayerCount >= 8}
                >▲</button>
              </div>
            </div>

            <div className="stepper-section">
              <p>Laps:</p>
              <div className="numeric-stepper">
                <button
                  className="stepper-btn"
                  onClick={() => setGameLaps(Math.max(1, gameLaps - 1))}
                  disabled={gameLaps <= 1}
                >▼</button>
                <div className="stepper-value">{gameLaps}</div>
                <button
                  className="stepper-btn"
                  onClick={() => setGameLaps(Math.min(10, gameLaps + 1))}
                  disabled={gameLaps >= 10}
                >▲</button>
              </div>
            </div>

            <div className="stepper-section">
              <p>Complexity:</p>
              <div className="numeric-stepper">
                <button
                  className="stepper-btn"
                  onClick={() => setGameComplexity(Math.max(1, gameComplexity - 1))}
                  disabled={gameComplexity <= 1}
                >▼</button>
                <div className="stepper-value">{gameComplexity}</div>
                <button
                  className="stepper-btn"
                  onClick={() => setGameComplexity(Math.min(5, gameComplexity + 1))}
                  disabled={gameComplexity >= 5}
                >▲</button>
              </div>
            </div>
          </div>

          <div className="menu-card">
            {multiplayerMode === 'LOCAL' ? (
              <div className="local-menu-flex">
                <div className="names-setup">
                  <h3 className="sketchy-subtitle">Register Drivers</h3>
                  <div className="names-grid">
                    {Array.from({ length: gamePlayerCount }).map((_, i) => (
                      <div key={i} className="name-input-group">
                        <span style={{ color: PLAYER_COLORS[i] || '#666' }}>●</span>
                        <input
                          type="text"
                          value={playerNames[i] || `Player ${i + 1}`}
                          onChange={(e) => updatePlayerName(i, e.target.value)}
                          placeholder={`Player ${i + 1}`}
                          className="sketchy-input"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => startRace(gamePlayerCount)}
                  className="sketchy-button big-action"
                  disabled={isLoading}
                >
                  {isLoading ? <span className="spinner"></span> : `START RACE`}
                </button>
              </div>
            ) : (
              <div className="online-actions">
                <div className="names-setup">
                  <h3 className="sketchy-subtitle">Your Driver Name</h3>
                  <div className="name-input-group big">
                    <input
                      type="text"
                      value={onlineName}
                      onChange={(e) => setOnlineName(e.target.value)}
                      placeholder="Enter your name"
                      className="sketchy-input"
                    />
                  </div>
                </div>

                <div className="online-buttons-stack">
                  <button
                    onClick={() => {
                      if (!onlineName.trim()) {
                        alert("Name is required to play online");
                        return;
                      }
                      createRoom();
                    }}
                    className="sketchy-button big-action"
                    disabled={isLoading}
                  >
                    {isLoading ? <span className="spinner"></span> : `CREATE ROOM`}
                  </button>

                  <div className="join-group">
                    <input
                      type="text"
                      placeholder="ROOM CODE"
                      className="sketchy-input code-input"
                      id="joinCode"
                      disabled={isLoading}
                    />
                    <button
                      onClick={() => {
                        if (!onlineName.trim()) {
                          alert("Name is required to play online");
                          return;
                        }
                        const code = document.getElementById('joinCode').value;
                        if (!code) {
                          alert("Enter room code");
                          return;
                        }
                        joinRoom(code);
                      }}
                      className="sketchy-button"
                      disabled={isLoading}
                    >
                      {isLoading ? <span className="spinner"></span> : "JOIN"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {gameState === 'LOBBY' && (
        <div className="menu-container">
          <h1 className="sketchy-title">ROOM: {roomCode}</h1>
          <p className="hint">Share this code with your friends!</p>

          <div className="lobby-players">
            <h3 className="sketchy-subtitle">Connected Players ({players.length}/{maxPlayers})</h3>
            <div className="player-list-lobby">
              {players.map((p, i) => (
                <div key={p.id} className="player-mini" style={{ borderLeft: `5px solid ${p.color}` }}>
                  {p.name} {p.id === myId ? '(You)' : ''}
                </div>
              ))}
            </div>

            <div className="lobby-settings-hint" style={{ marginTop: '1rem', opacity: 0.7, fontSize: '0.9rem' }}>
              <strong>Race Info:</strong> {gameLaps} Laps | Complexity: {gameComplexity}/5
            </div>
          </div>

          <div className="menu-card">
            {isHost ? (
              <button
                onClick={startOnlineRace}
                disabled={players.length < 2 || isLoading}
                className="sketchy-button big-action"
              >
                {isLoading ? <span className="spinner"></span> : "START RACE"}
              </button>
            ) : (
              <p className="waiting-msg">Waiting for host to start...</p>
            )}
            <button onClick={resetToMenu} className="sketchy-button exit-btn">LEAVE ROOM</button>
          </div>
        </div>
      )}

      {gameState === 'RACING' && (
        <div className="game-screen">
          <div className="camera-controls">
            <button className="zoom-btn" id="zoomIn" title="Zoom In">+</button>
            <button className="zoom-btn" id="zoomOut" title="Zoom Out">-</button>
            <button className="gps-btn" id="resetCamera" title="Center on Player"><GPSIcon /></button>
          </div>

          <div className="game-board-container" id="game-board-container">
            <CanvasRenderer
              track={track}
              players={players}
              activePlayerIndex={currentPlayerIndex}
              multiplayerMode={multiplayerMode}
              myId={myId}
              countdown={countdown}
              theme={theme}
            />
            {countdown !== null && (
              <div className="countdown-overlay">
                <div className="countdown-number">{countdown}</div>
              </div>
            )}
            {crashNotification && (
              <div className="crash-overlay">
                <div className="crash-banner">{crashNotification}</div>
              </div>
            )}
          </div>

          <div className="bottom-bar">
            <div className="player-stats">
              <div className="turn-number">Turn #{uiPlayer ? uiPlayer.turns + 1 : 1} | Lap {uiPlayer ? uiPlayer.lapsCompleted + 1 : 1} of {gameLaps}</div>
              <h3 style={{ color: uiPlayer ? uiPlayer.color : 'inherit' }}>{uiPlayer ? uiPlayer.name : '...'}</h3>
              <div className="stat">Speed: <strong>{uiPlayer ? uiPlayer.speed : 0} s/t</strong></div>
            </div>

            <div className="actions">
              <div className="dpad-container">
                <div className="dpad-row">
                  <button onClick={() => handleAction(ACTIONS.SPEED_UP)} disabled={isProcessingTurn || (countdown !== null && countdown !== 'GO') || (multiplayerMode === 'ONLINE' && uiPlayer && uiPlayer.id !== myId)} className="dpad-btn up" title="Speed Up (+1)">▲</button>
                </div>
                <div className="dpad-row center">
                  <button onClick={() => handleAction(ACTIONS.TURN_LEFT)} disabled={isProcessingTurn || (countdown !== null && countdown !== 'GO') || (multiplayerMode === 'ONLINE' && uiPlayer && uiPlayer.id !== myId)} className="dpad-btn left" title="Turn Left">◀</button>
                  <button onClick={() => handleAction(ACTIONS.SPEED_KEEP)} disabled={isProcessingTurn || (countdown !== null && countdown !== 'GO') || (multiplayerMode === 'ONLINE' && uiPlayer && uiPlayer.id !== myId)} className="dpad-btn keep" title="Keep">●</button>
                  <button onClick={() => handleAction(ACTIONS.TURN_RIGHT)} disabled={isProcessingTurn || (countdown !== null && countdown !== 'GO') || (multiplayerMode === 'ONLINE' && uiPlayer && uiPlayer.id !== myId)} className="dpad-btn right" title="Turn Right">▶</button>
                </div>
                <div className="dpad-row">
                  <button onClick={() => handleAction(ACTIONS.SPEED_DOWN)} disabled={isProcessingTurn || (countdown !== null && countdown !== 'GO') || (uiPlayer.speed === 0) || (multiplayerMode === 'ONLINE' && uiPlayer && uiPlayer.id !== myId)} className="dpad-btn down" title="Speed Down (-1)">▼</button>
                </div>
              </div>
            </div>

            <div className="player-list">
              {players.map(p => (
                <div key={p.id} className={`player-mini ${uiPlayer && p.id === uiPlayer.id ? 'active' : ''}`} style={{ borderBottom: uiPlayer && p.id === uiPlayer.id ? `3px solid ${p.color}` : 'none' }}>
                  <div style={{ color: p.color, fontWeight: 'bold' }}>{p.name} {p.finished ? '🏁' : ''}</div>
                  <div className="mini-speed">S: {p.speed}</div>
                </div>
              ))}
            </div>

            <button onClick={resetToMenu} className="sketchy-button exit-btn">EXIT</button>
          </div>
        </div>
      )}

      {gameState === 'FINISH' && (
        <div className="finish-container">
          <h2 className="sketchy-title">RACE FINISHED!</h2>
          <div className="leaderboard">
            {leaderboard.map((p, i) => (
              <div key={p.id} className={`leaderboard-card ${i === 0 ? 'winner' : 'runner-up'}`}>
                <h3>
                  {i === 0 ? '🏆 1st Place' : (i === 1 ? '🥈 2nd Place' : (i === 2 ? '🥉 3rd Place' : `${i + 1}th Place`))}
                </h3>
                <div className="result-name" style={{ color: p.color }}>{p.name}</div>
                <div className="result-stats">
                  <span>Turns: <strong>{p.turns}</strong></span>
                  <span>Finish Speed: <strong>{p.speed} s/t</strong></span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={resetToMenu} className="sketchy-button" style={{ marginTop: '2rem' }}>PLAY AGAIN</button>
        </div>
      )}

      {/* Fixed UI Elements */}
      <div className="footer-stamp">
        <span className="stamp-main">By iCTG</span>
        <span className="stamp-sub">Powered by Gemini</span>
      </div>
    </div>
  );
}

export default App;
