
export const DIRECTIONS = {
    UP: { x: 0, y: -1 },
    RIGHT: { x: 1, y: 0 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 }
};

export const ACTIONS = {
    SPEED_UP: 'SPEED_UP',
    SPEED_DOWN: 'SPEED_DOWN',
    SPEED_KEEP: 'SPEED_KEEP',
    TURN_LEFT: 'TURN_LEFT',
    TURN_RIGHT: 'TURN_RIGHT'
};

export class GameEngine {
    static getNextDirection(currentDir, turn) {
        const keys = Object.keys(DIRECTIONS);
        const currentIndex = keys.findIndex(k => DIRECTIONS[k].x === currentDir.x && DIRECTIONS[k].y === currentDir.y);

        if (turn === ACTIONS.TURN_RIGHT) {
            return DIRECTIONS[keys[(currentIndex + 1) % 4]];
        } else if (turn === ACTIONS.TURN_LEFT) {
            return DIRECTIONS[keys[(currentIndex + 3) % 4]];
        }
        return currentDir;
    }

    static movePlayer(player, action) {
        let { pos, speed, dir, isCrashed } = player;
        let nextSpeed = speed;
        let nextDir = { ...dir };
        let path = [];

        if (action === ACTIONS.SPEED_UP) {
            nextSpeed += 1;
        } else if (action === ACTIONS.SPEED_DOWN) {
            nextSpeed = Math.max(0, speed - 1);
        } else if (action === ACTIONS.SPEED_KEEP) {
            // no change
        } else if (action === ACTIONS.TURN_LEFT || action === ACTIONS.TURN_RIGHT) {
            nextDir = this.getNextDirection(dir, action);
        }

        // Calculate movement path for collision detection
        // Rule: Turn moves (speed-1) in old dir, then 1 in new dir
        // If speed-up/down/keep: moves (nextSpeed) in old dir (which is current dir)

        let currentX = pos.x;
        let currentY = pos.y;

        if (action === ACTIONS.TURN_LEFT || action === ACTIONS.TURN_RIGHT) {
            if (speed > 0) {
                // Speed-1 moves in old dir
                for (let i = 0; i < speed - 1; i++) {
                    currentX += dir.x;
                    currentY += dir.y;
                    path.push({ x: currentX, y: currentY });
                }
                // 1 move in new dir
                currentX += nextDir.x;
                currentY += nextDir.y;
                path.push({ x: currentX, y: currentY });
            }
        } else {
            // Speed moves in dir
            for (let i = 0; i < nextSpeed; i++) {
                currentX += nextDir.x;
                currentY += nextDir.y;
                path.push({ x: currentX, y: currentY });
            }
        }

        return {
            ...player,
            pos: { x: currentX, y: currentY },
            speed: nextSpeed,
            dir: nextDir,
            path: path // To check for collisions along the way
        };
    }

    static checkCollisions(path, track) {
        for (const step of path) {
            const cell = track[step.y]?.[step.x];
            if (cell === undefined || cell === 0) {
                return true; // Crashed
            }
        }
        return false;
    }
}
