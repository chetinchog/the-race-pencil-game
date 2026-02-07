
import React, { useRef, useEffect } from 'react';

const CanvasRenderer = ({ track, players, cellSize = 40 }) => {
    const canvasRef = useRef(null);

    const drawSketchyLine = (ctx, x1, y1, x2, y2, color = '#333', width = 2) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.max(2, Math.floor(dist / 10));

        ctx.moveTo(x1 + (Math.random() - 0.5) * 2, y1 + (Math.random() - 0.5) * 2);

        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const x = x1 + dx * t + (Math.random() - 0.5) * 2;
            const y = y1 + dy * t + (Math.random() - 0.5) * 2;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = track[0].length * cellSize;
        const height = track.length * cellSize;

        canvas.width = width;
        canvas.height = height;

        // Draw Grid (graph paper style)
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;

        for (let x = 0; x <= width; x += cellSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y <= height; y += cellSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Draw Track
        track.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell === 0) return; // Wall

                const px = x * cellSize;
                const py = y * cellSize;

                if (cell === 1) { // Path
                    // Subtle fill for track
                    ctx.fillStyle = 'rgba(200, 200, 200, 0.1)';
                    ctx.fillRect(px, py, cellSize, cellSize);
                } else if (cell === 2) { // Start
                    ctx.fillStyle = 'rgba(100, 200, 100, 0.2)';
                    ctx.fillRect(px, py, cellSize, cellSize);
                    drawSketchyLine(ctx, px, py + cellSize, px + cellSize, py + cellSize, '#2e7d32', 3);
                } else if (cell === 3) { // Finish
                    ctx.fillStyle = 'rgba(200, 100, 100, 0.2)';
                    ctx.fillRect(px, py, cellSize, cellSize);
                    // Checkerboard pattern start
                    ctx.fillStyle = 'rgba(0,0,0,0.1)';
                    ctx.fillRect(px, py, cellSize / 2, cellSize / 2);
                    ctx.fillRect(px + cellSize / 2, py + cellSize / 2, cellSize / 2, cellSize / 2);
                }
            });
        });

        // Draw Track Borders
        track.forEach((row, y) => {
            row.forEach((cell, x) => {
                const px = x * cellSize;
                const py = y * cellSize;

                // Check neighbors to draw borders
                if (cell !== 0) {
                    if (x === 0 || track[y][x - 1] === 0) drawSketchyLine(ctx, px, py, px, py + cellSize);
                    if (x === row.length - 1 || track[y][x + 1] === 0) drawSketchyLine(ctx, px + cellSize, py, px + cellSize, py + cellSize);
                    if (y === 0 || track[y - 1][x] === 0) drawSketchyLine(ctx, px, py, px + cellSize, py);
                    if (y === track.length - 1 || track[y + 1][x] === 0) drawSketchyLine(ctx, px, py + cellSize, px + cellSize, py + cellSize);
                }
            });
        });

        // Draw Players
        players.forEach(player => {
            const px = player.pos.x * cellSize + cellSize / 2;
            const py = player.pos.y * cellSize + cellSize / 2;

            // Draw Car as a sketchy triangle or "X"
            ctx.save();
            ctx.translate(px, py);
            const angle = Math.atan2(player.dir.y, player.dir.x);
            ctx.rotate(angle);

            ctx.strokeStyle = player.color;
            ctx.lineWidth = 3;

            // Sketchy car shape
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.lineTo(-8, -8);
            ctx.lineTo(-4, 0);
            ctx.lineTo(-8, 8);
            ctx.closePath();
            ctx.stroke();

            ctx.restore();

            // Draw previous trail
            if (player.history && player.history.length > 0) {
                ctx.beginPath();
                ctx.setLineDash([5, 5]);
                ctx.strokeStyle = player.color + '88';
                ctx.lineWidth = 1;
                ctx.moveTo(player.history[0].x * cellSize + cellSize / 2, player.history[0].y * cellSize + cellSize / 2);
                player.history.forEach(h => {
                    ctx.lineTo(h.x * cellSize + cellSize / 2, h.y * cellSize + cellSize / 2);
                });
                ctx.lineTo(px, py);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        });

    }, [track, players, cellSize]);

    return (
        <div className="canvas-container" style={{
            padding: '20px',
            background: '#fff',
            boxShadow: '0 0 10px rgba(0,0,0,0.1)',
            display: 'inline-block',
            position: 'relative',
            transform: 'rotate(-0.5deg)' // Slight skew for paper effect
        }}>
            <div className="paper-texture"></div>
            <canvas ref={canvasRef} />
        </div>
    );
};

export default CanvasRenderer;
