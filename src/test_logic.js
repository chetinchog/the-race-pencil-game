
import { GameEngine, ACTIONS, DIRECTIONS } from './logic/GameEngine.js';

// Mock track
const track = [
    [0, 0, 0, 0, 0],
    [0, 1, 1, 1, 0],
    [0, 1, 1, 1, 0],
    [0, 2, 2, 2, 0],
    [0, 0, 0, 0, 0]
];

const player = {
    pos: { x: 2, y: 3 }, // Start
    speed: 0,
    dir: DIRECTIONS.UP,
    history: []
};

console.log("--- Testing Game Logic ---");

// Test 1: Speed Up
console.log("Test 1: Speed Up (0 -> 1)");
let state = GameEngine.movePlayer(player, ACTIONS.SPEED_UP);
console.log(`Speed: ${state.speed}, Pos: (${state.pos.x}, ${state.pos.y})`);
if (state.speed === 1 && state.pos.y === 2) console.log("PASSED");
else console.log("FAILED");

// Test 2: Speed Up again (1 -> 2)
console.log("\nTest 2: Speed Up (1 -> 2)");
state = GameEngine.movePlayer(state, ACTIONS.SPEED_UP);
console.log(`Speed: ${state.speed}, Pos: (${state.pos.x}, ${state.pos.y})`);
if (state.speed === 2 && state.pos.y === 0) console.log("PASSED"); // Move 2 squares up from y=2 -> y=0
else console.log("FAILED");

// Test 3: Turning
console.log("\nTest 3: Turning Left at speed 2 (from UP)");
// Reset player to speed 2 at {2,2} facing UP
const pTurning = { ...player, pos: { x: 2, y: 3 }, speed: 2, dir: DIRECTIONS.UP };
state = GameEngine.movePlayer(pTurning, ACTIONS.TURN_LEFT);
// Rule: (speed-1) forward, 1 left. Forward is UP (0,-1), Left is LEFT (-1,0)
// (2-1) = 1 move UP -> {2,2}. 1 move LEFT -> {1,2}.
console.log(`Speed: ${state.speed}, Pos: (${state.pos.x}, ${state.pos.y}), Dir: (${state.dir.x}, ${state.dir.y})`);
if (state.pos.x === 1 && state.pos.y === 2 && state.dir.x === DIRECTIONS.LEFT.x) console.log("PASSED");
else console.log("FAILED");

// Test 4: Collision
console.log("\nTest 4: Collision detection");
// Move {1,2} to {0,2} (Wall)
const pCollision = { ...player, pos: { x: 1, y: 2 }, speed: 1, dir: DIRECTIONS.LEFT };
state = GameEngine.movePlayer(pCollision, ACTIONS.SPEED_KEEP);
const crashed = GameEngine.checkCollisions(state.path, track);
console.log(`Crashed: ${crashed}`);
if (crashed === true) console.log("PASSED");
else console.log("FAILED");
