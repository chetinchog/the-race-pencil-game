
// 0: Wall, 1: Track, 2: Start, 3: Finish
export const SPRINT_MAP_1 = [
    [0, 0, 0, 0, 3, 3, 3, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 1, 0, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
    [0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    [2, 2, 2, 2, 2, 0, 0, 0, 0, 0],
];

// Let's make a slightly larger and more interesting sprint track
export const generateTrack = (width, height, trackWidth = 5) => {
    const grid = Array.from({ length: height }, () => Array(width).fill(0));

    let cx = Math.floor(width / 2);
    const halfWidth = Math.floor(trackWidth / 2);
    const isEven = trackWidth % 2 === 0;

    for (let y = height - 1; y >= 0; y--) {
        // Draw track centered at cx
        for (let dx = -halfWidth; dx <= (isEven ? halfWidth - 1 : halfWidth); dx++) {
            const tx = cx + dx;
            if (tx >= 0 && tx < width) {
                grid[y][tx] = 1;

                if (y === height - 1) grid[y][tx] = 2; // Start
                if (y === 0) grid[y][tx] = 3; // Finish
            }
        }

        // Add some curve
        if (y < height - 2 && y > 2) {
            if (Math.random() > 0.7) {
                const shift = (Math.random() > 0.5 ? 1 : -1);
                // Check if shift keeps track inside grid
                if (cx + shift - halfWidth >= 0 && cx + shift + (isEven ? halfWidth - 1 : halfWidth) < width) {
                    cx += shift;
                }
            }
        }
    }
    return grid;
};
