
import React, { useState, useEffect } from 'react';
import { GameEngine, ACTIONS, DIRECTIONS } from './logic/GameEngine';
import { generateTrack, SPRINT_MAP_1 } from './data/maps';
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



const DEFAULT_NAMES = ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5', 'Player 6', 'Player 7', 'Player 8'];
const PLAYER_COLORS = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#ff9800', '#9c27b0', '#00bcd4', '#795548'];

function App() {
  const [gameState, setGameState] = useState('MENU'); // MENU, LOBBY, RACING, FINISH
  const [multiplayerMode, setMultiplayerMode] = useState('LOCAL'); // LOCAL, ONLINE
  const [track, setTrack] = useState(SPRINT_MAP_1);
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

  useEffect(() => {
    localStorage.setItem('racePlayerNames', JSON.stringify(playerNames));
  }, [playerNames]);

  useEffect(() => {
    localStorage.setItem('raceOnlineName', onlineName);
  }, [onlineName]);

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
    const trackWidth = playerCount + 2;
    const newTrack = generateTrack(15, 25, trackWidth);
    setTrack(newTrack);

    // Find start line squares
    const startLine = [];
    const lastRow = newTrack.length - 1;
    newTrack[lastRow].forEach((cell, x) => {
      if (cell === 2) startLine.push(x);
    });

    // Generate indices for start positions (distribute centered)
    let startIndices = Array.from({ length: playerCount }, (_, i) => {
      // Center the players on the start line
      const offset = Math.floor((startLine.length - playerCount) / 2);
      return offset + i;
    });

    // Shuffle starting positions to avoid bias
    startIndices = startIndices.sort(() => Math.random() - 0.5);

    const colors = PLAYER_COLORS;
    const newPlayers = Array.from({ length: playerCount }, (_, i) => {
      const startX = startLine[startIndices[i]] ?? startLine[0];
      return {
        id: i + 1,
        name: playerNames[i] || `Player ${i + 1}`,
        color: colors[i] || `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        pos: { x: startX, y: lastRow },
        history: [],
        turns: 0,
        finished: false,
        isCrashed: false,
        speed: 0,
        dir: DIRECTIONS.UP
      };
    });

    const shuffledPlayers = newPlayers.sort(() => Math.random() - 0.5);

    setPlayers(shuffledPlayers);
    setCurrentPlayerIndex(0);
    setGameState('RACING');
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
      const newTrack = generateTrack(15, 25, trackWidth);

      const startLine = [];
      newTrack[newTrack.length - 1].forEach((cell, x) => {
        if (cell === 2) startLine.push(x);
      });

      // Use available start squares
      let startIndices = Array.from({ length: players.length }, (_, i) => i + 1);
      startIndices = startIndices.sort(() => Math.random() - 0.5);

      const updatedPlayers = players.map((p, i) => ({
        ...p,
        pos: { x: startLine[startIndices[i]] || startLine[0], y: newTrack.length - 1 }
      })).sort(() => Math.random() - 0.5);

      await updateDoc(doc(db, 'rooms', roomCode), {
        status: 'RACING',
        track: JSON.stringify(newTrack),
        players: updatedPlayers,
        currentPlayerIndex: 0,
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

        if (data.status === 'RACING' && gameState !== 'RACING') {
          setGameState('RACING');
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
    const player = players[currentPlayerIndex];
    if (player.finished) {
      nextTurn();
      return;
    }

    // Online turn check
    if (multiplayerMode === 'ONLINE' && player.id !== myId) {
      return;
    }

    const nextState = GameEngine.movePlayer(player, action);

    let finalPos = { ...nextState.pos };
    let finalSpeed = nextState.speed;
    let isCrashed = false;
    let finished = false;
    let actualPath = [];
    let prevStep = { ...player.pos };

    // Path includes the squares the car passes through
    for (const step of nextState.path) {
      const cell = track[step.y]?.[step.x];

      // Check for finish line first (Highest priority)
      if (cell === 3) {
        finished = true;
        finalPos = step;
        actualPath.push(step);
        break;
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
      history: [...player.history, player.pos],
      turns: player.turns + 1,
      path: actualPath
    };

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

      updateDoc(doc(db, 'rooms', roomCode), {
        players: newPlayers,
        currentPlayerIndex: nextIdx,
        status: newStatus,
        lastUpdated: Date.now()
      });
    } else {
      setPlayers(newPlayers);
      nextTurn(newPlayers);
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
    <div className="app-container">
      {gameState === 'MENU' && (
        <div className="menu-container">
          <div className="title-group">
            <span className="title-icon">🏎️</span>
            <h1 className="sketchy-title">THE RACE</h1>
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

          <div className="menu-card">
            <div className="stepper-section">
              <p>Number of Players:</p>
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
          <div className="game-sidebar">
            <div className="player-stats">
              <div className="turn-number">Turn #{currentPlayer.turns + 1}</div>
              <h3 style={{ color: currentPlayer.color }}>{currentPlayer.name}</h3>
              <div className="stat">Speed: <strong>{currentPlayer.speed} s/t</strong></div>
              {currentPlayer.isCrashed && <div className="crash-alert">CRASHED! Speed reset to 0</div>}
            </div>

            <div className="actions">
              <p className="label">Decision</p>
              <div className="dpad-container">
                <div className="dpad-row">
                  <button onClick={() => handleAction(ACTIONS.SPEED_UP)} disabled={multiplayerMode === 'ONLINE' && currentPlayer.id !== myId} className="dpad-btn up" title="Speed Up (+1)">▲</button>
                </div>
                <div className="dpad-row center">
                  <button onClick={() => handleAction(ACTIONS.TURN_LEFT)} disabled={multiplayerMode === 'ONLINE' && currentPlayer.id !== myId} className="dpad-btn left" title="Turn Left">◀</button>
                  <button onClick={() => handleAction(ACTIONS.SPEED_KEEP)} disabled={multiplayerMode === 'ONLINE' && currentPlayer.id !== myId} className="dpad-btn keep" title="Keep Speed">●</button>
                  <button onClick={() => handleAction(ACTIONS.TURN_RIGHT)} disabled={multiplayerMode === 'ONLINE' && currentPlayer.id !== myId} className="dpad-btn right" title="Turn Right">▶</button>
                </div>
                <div className="dpad-row">
                  <button onClick={() => handleAction(ACTIONS.SPEED_DOWN)} disabled={(currentPlayer.speed === 0) || (multiplayerMode === 'ONLINE' && currentPlayer.id !== myId)} className="dpad-btn down" title="Speed Down (-1)">▼</button>
                </div>
              </div>
              <div className="dpad-labels">
                <span>Top: Speed Up</span>
                <span>Middle: Keep Speed</span>
                <span>Bottom: Speed Down</span>
              </div>
            </div>

            <div className="player-list">
              {players.map(p => (
                <div key={p.id} className={`player-mini ${p.id === currentPlayer.id ? 'active' : ''}`} style={{ borderLeft: `5px solid ${p.color}` }}>
                  {p.name} {p.finished ? '(🏁)' : ''}
                  <div className="mini-speed">S: {p.speed}</div>
                </div>
              ))}
            </div>

            <button onClick={resetToMenu} className="sketchy-button exit-btn">EXIT TO MENU</button>
          </div>

          <div className="game-board">
            <CanvasRenderer
              track={track}
              players={players}
              cellSize={Math.min(30, Math.floor((window.innerHeight - 80) / track.length), Math.floor((window.innerWidth - 350) / track[0].length))}
            />
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

      <div className="footer-stamp">
        <span className="stamp-main">By iCTG</span>
        <span className="stamp-sub">Powered by Antigravity</span>
      </div>
    </div>
  );
}

export default App;
