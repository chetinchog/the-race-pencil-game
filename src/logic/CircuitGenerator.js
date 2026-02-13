
/**
 * Procedural Circuit Generator - RECTANGULAR TRACK
 * Creates a simple rectangular race track with vertical start/finish straight
 */

export const generateCircuit = (width, height, trackWidth, complexity = 3) => {
    const grid = Array.from({ length: height }, () => Array(width).fill(0));

    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);

    // Rectangle dimensions for the outer and inner boundaries
    // The street width should be exactly trackWidth
    const outerWidth = Math.floor(width * 0.7);
    const outerHeight = Math.floor(height * 0.6);
    const innerWidth = outerWidth - trackWidth * 2; // Each side contributes trackWidth
    const innerHeight = outerHeight - trackWidth * 2;

    // Draw the track as the space between outer and inner rectangles
    const outerLeft = centerX - Math.floor(outerWidth / 2);
    const outerRight = centerX + Math.floor(outerWidth / 2);
    const outerTop = centerY - Math.floor(outerHeight / 2);
    const outerBottom = centerY + Math.floor(outerHeight / 2);

    const innerLeft = centerX - Math.floor(innerWidth / 2);
    const innerRight = centerX + Math.floor(innerWidth / 2);
    const innerTop = centerY - Math.floor(innerHeight / 2);
    const innerBottom = centerY + Math.floor(innerHeight / 2);

    // Verify and adjust to ensure exactly trackWidth distance
    // Right vertical street indices: [outerRight - trackWidth + 1, outerRight]
    // So the hole must end at outerRight - trackWidth
    const adjustedInnerRight = outerRight - trackWidth;
    const adjustedInnerLeft = outerLeft + trackWidth;
    const adjustedInnerTop = outerTop + trackWidth;
    const adjustedInnerBottom = outerBottom - trackWidth;

    // Fill the track (everything between outer and adjusted inner)
    for (let y = outerTop; y <= outerBottom; y++) {
        for (let x = outerLeft; x <= outerRight; x++) {
            // Check if we're inside the outer boundary but outside the inner boundary
            // We want strict inequality for inner box to create the hole
            const isInsideHole = (x >= adjustedInnerLeft && x <= adjustedInnerRight && y >= adjustedInnerTop && y <= adjustedInnerBottom);

            if (!isInsideHole) {
                if (y >= 0 && y < height && x >= 0 && x < width) {
                    grid[y][x] = 1; // Track
                }
            }
        }
    }

    // Now place the START/FINISH lines on the RIGHT vertical straight
    // They should be horizontal lines, centered in the RIGHT vertical section

    // The right vertical section X range is: [adjustedInnerRight + 1, outerRight] 
    // strictly speaking, the hole ends at adjustedInnerRight.

    // The right street indices are: [outerRight - trackWidth + 1, outerRight]
    const streetRightX = outerRight;
    // Calculate left edge based on width
    const streetLeftX = outerRight - trackWidth + 1;

    // Calculate line bounds to guarantee EXACTLY trackWidth pixels
    // It should match the street width exactly
    const lineStartX = streetLeftX;
    const lineEndX = streetRightX;

    // START LINE (GREEN) - 2 (Top) - Cars move UP away from Finish line below it?
    // Wait, if cars move UP (y decreases), and Finish line is BELOW Start line (y increases).
    // Cars move AWAY from finish line. YES.
    const startY = centerY - 1;

    // Green line: 1 cell tall × trackWidth wide (for spawns)
    for (let x = lineStartX; x <= lineEndX; x++) {
        if (startY >= 0 && startY < height && x >= 0 && x < width) {
            grid[startY][x] = 2; // Green start line (spawn zone)
        }
    }

    // FINISH LINE (RED) - 3 (Bottom) - "Behind" Start line
    const finishY = startY + 1;

    // Red line: 1 cell tall × trackWidth wide
    for (let x = lineStartX; x <= lineEndX; x++) {
        if (finishY >= 0 && finishY < height && x >= 0 && x < width) {
            grid[finishY][x] = 3; // Red finish line
        }
    }

    return grid;
};
