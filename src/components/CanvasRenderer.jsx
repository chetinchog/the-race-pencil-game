
import React, { useRef, useEffect, useState } from 'react';

const CanvasRenderer = ({ track, players, activePlayerIndex, multiplayerMode, myId, countdown }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    // Internal state for high-performance rendering
    const stateRef = useRef({
        camera: { x: 0, y: 0, zoom: 1, targetZoom: 1 },
        playerPositions: {}, // Smooth positions for animation
        lastTime: 0,
        isInitialLoad: true,
        isFollowing: true
    });

    const [cellSize, setCellSize] = useState(40);

    // Helper for sketchy lines
    const drawSketchyLine = (ctx, x1, y1, x2, y2, color = '#333', width = 2, dashed = false) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        if (dashed) ctx.setLineDash([5, 5]);

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
        ctx.setLineDash([]);
    };

    // Helper for sketchy circles
    const drawSketchyCircle = (ctx, x, y, radius, color) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        // Doubled for sketchy effect
        ctx.beginPath();
        ctx.arc(x + (Math.random() - 0.5) * 2, y + (Math.random() - 0.5) * 2, radius, 0, Math.PI * 2);
        ctx.stroke();
    };

    const getFitToViewTargets = () => {
        if (!containerRef.current || !track) return null;
        const container = containerRef.current;
        const trackW = track[0].length * 40;
        const trackH = track.length * 40;
        const zoom = Math.min(
            (container.clientWidth - 100) / trackW,
            (container.clientHeight - 100) / trackH
        );
        return {
            zoom,
            x: (container.clientWidth - trackW * zoom) / 2,
            y: (container.clientHeight - trackH * zoom) / 2
        };
    };

    const fitToView = () => {
        const targets = getFitToViewTargets();
        if (targets) {
            stateRef.current.camera.targetZoom = targets.zoom;
            stateRef.current.camera.zoom = targets.zoom;
            stateRef.current.camera.x = targets.x;
            stateRef.current.camera.y = targets.y;
        }
    };

    useEffect(() => {
        const handleZoomIn = () => {
            stateRef.current.camera.targetZoom *= 1.2;
            stateRef.current.isFollowing = false;
        };
        const handleZoomOut = () => {
            stateRef.current.camera.targetZoom /= 1.2;
            stateRef.current.isFollowing = false;
        };
        const handleReset = () => {
            stateRef.current.isFollowing = true;
        };

        const zi = document.getElementById('zoomIn');
        const zo = document.getElementById('zoomOut');
        const rc = document.getElementById('resetCamera');

        zi?.addEventListener('click', handleZoomIn);
        zo?.addEventListener('click', handleZoomOut);
        rc?.addEventListener('click', handleReset);

        return () => {
            zi?.removeEventListener('click', handleZoomIn);
            zo?.removeEventListener('click', handleZoomOut);
            rc?.removeEventListener('click', handleReset);
        };
    }, []);

    useEffect(() => {
        const render = (time) => {
            const dt = (time - stateRef.current.lastTime) / 1000;
            stateRef.current.lastTime = time;

            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (!canvas || !container) return;

            const ctx = canvas.getContext('2d');
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;

            const cam = stateRef.current.camera;
            const activePlayer = players[activePlayerIndex];
            const isCountingDown = typeof countdown === 'number';
            const isGo = countdown === 'GO';

            // 1. Update Camera Position (Lerping)
            if (isCountingDown) {
                // Force fit-to-view targets during numeric countdown
                const targets = getFitToViewTargets();
                if (targets) {
                    cam.targetZoom = targets.zoom;
                    cam.x += (targets.x - cam.x) * 4 * dt;
                    cam.y += (targets.y - cam.y) * 4 * dt;
                    cam.zoom += (targets.zoom - cam.zoom) * 4 * dt;
                }
                stateRef.current.wasCountingDown = true;
            } else if ((activePlayer && stateRef.current.isFollowing) || isGo) {
                // If we just finished counting down, trigger the fly-in zoom level ONCE
                if (stateRef.current.wasCountingDown) {
                    cam.targetZoom = 1.35; // A bit closer
                    stateRef.current.wasCountingDown = false;
                }

                const targetCellSize = 40;

                const pos = stateRef.current.playerPositions[activePlayer?.id] || activePlayer?.pos || { x: 0, y: 0 };
                const px = pos.x * targetCellSize + targetCellSize / 2;
                const py = pos.y * targetCellSize + targetCellSize / 2;

                if (stateRef.current.smoothTarget === undefined) {
                    stateRef.current.smoothTarget = {
                        screenX: 0.5, screenY: 0.5,
                        lookX: 0, lookY: 0
                    };
                }
                const st = stateRef.current.smoothTarget;

                const dir = activePlayer?.dir || { x: 0, y: -1 };
                const speed = activePlayer?.speed || 0;

                // 40% rule: 0.5 +/- 0.1 = 0.6 (60% from front, 40% from back)
                const targetScreenX = (0.5 - dir.x * 0.10);
                const targetScreenY = (0.5 - dir.y * 0.10);

                // Slightly more lookahead to compensate for closer back edge
                const targetLookX = dir.x * speed * targetCellSize * 0.9;
                const targetLookY = dir.y * speed * targetCellSize * 0.9;

                st.screenX += (targetScreenX - st.screenX) * 2 * dt;
                st.screenY += (targetScreenY - st.screenY) * 2 * dt;
                st.lookX += (targetLookX - st.lookX) * 2 * dt;
                st.lookY += (targetLookY - st.lookY) * 2 * dt;

                const targetX = canvas.width * st.screenX - (px + st.lookX) * cam.zoom;
                const targetY = canvas.height * st.screenY - (py + st.lookY) * cam.zoom;

                // Fly-in speed
                const followSpeed = isGo ? 3.0 : 3.5;
                cam.x += (targetX - cam.x) * followSpeed * dt;
                cam.y += (targetY - cam.y) * followSpeed * dt;
                cam.zoom += (cam.targetZoom - cam.zoom) * 2.5 * dt;
            } else {
                // Manual mode: still lerp towards targetZoom if zoom button was pressed
                cam.zoom += (cam.targetZoom - cam.zoom) * 5 * dt;
            }

            ctx.save();
            ctx.translate(cam.x, cam.y);
            ctx.scale(cam.zoom, cam.zoom);

            const gridCell = 40;

            // 2. Draw Grid
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 1;
            const trackW = track[0].length * gridCell;
            const trackH = track.length * gridCell;

            for (let x = 0; x <= trackW; x += gridCell) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, trackH); ctx.stroke();
            }
            for (let y = 0; y <= trackH; y += gridCell) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(trackW, y); ctx.stroke();
            }

            // 3. Draw Track Tiles
            track.forEach((row, y) => {
                row.forEach((cell, x) => {
                    if (cell === 0) return;
                    const px = x * gridCell;
                    const py = y * gridCell;
                    if (cell === 1) {
                        ctx.fillStyle = 'rgba(200, 200, 200, 0.05)';
                        ctx.fillRect(px, py, gridCell, gridCell);
                    } else if (cell === 2) {
                        ctx.fillStyle = 'rgba(100, 255, 100, 0.1)';
                        ctx.fillRect(px, py, gridCell, gridCell);
                    } else if (cell === 3) {
                        ctx.fillStyle = 'rgba(255, 100, 100, 0.1)';
                        ctx.fillRect(px, py, gridCell, gridCell);
                    }
                });
            });

            // 4. Draw Borders
            track.forEach((row, y) => {
                row.forEach((cell, x) => {
                    if (cell === 0) return;
                    const px = x * gridCell; const py = y * gridCell;
                    if (x === 0 || track[y][x - 1] === 0) drawSketchyLine(ctx, px, py, px, py + gridCell, '#333', 2);
                    if (x === row.length - 1 || track[y][x + 1] === 0) drawSketchyLine(ctx, px + gridCell, py, px + gridCell, py + gridCell, '#333', 2);
                    if (y === 0 || track[y - 1][x] === 0) drawSketchyLine(ctx, px, py, px + gridCell, py, '#333', 2);
                    if (y === track.length - 1 || track[y + 1][x] === 0) drawSketchyLine(ctx, px, py + gridCell, px + gridCell, py + gridCell, '#333', 2);
                });
            });

            // 5. Draw Players & History
            players.forEach(player => {
                // Smooth position lerping for car
                if (!stateRef.current.playerPositions[player.id]) {
                    stateRef.current.playerPositions[player.id] = { x: player.pos.x, y: player.pos.y };
                }
                const pos = stateRef.current.playerPositions[player.id];
                pos.x += (player.pos.x - pos.x) * 10 * dt;
                pos.y += (player.pos.y - pos.y) * 10 * dt;

                const cpx = pos.x * gridCell + gridCell / 2;
                const cpy = pos.y * gridCell + gridCell / 2;

                // Trace history with circles at stops
                if (player.history && player.history.length > 0) {
                    ctx.beginPath();
                    ctx.setLineDash([5, 5]);
                    ctx.strokeStyle = player.color + '66';
                    ctx.lineWidth = 1.5;
                    ctx.moveTo(player.history[0].x * gridCell + gridCell / 2, player.history[0].y * gridCell + gridCell / 2);
                    player.history.forEach(h => {
                        const hx = h.x * gridCell + gridCell / 2;
                        const hy = h.y * gridCell + gridCell / 2;
                        ctx.lineTo(hx, hy);
                    });
                    ctx.lineTo(cpx, cpy);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    // Draw circles at turn stops
                    player.history.forEach(h => {
                        drawSketchyCircle(ctx, h.x * gridCell + gridCell / 2, h.y * gridCell + gridCell / 2, 3, player.color);
                    });
                }

                // Draw Car
                ctx.save();
                ctx.translate(cpx, cpy);
                const angle = Math.atan2(player.dir.y, player.dir.x);
                ctx.rotate(angle);
                ctx.strokeStyle = player.color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(10, 0); ctx.lineTo(-8, -8); ctx.lineTo(-4, 0); ctx.lineTo(-8, 8);
                ctx.closePath();
                ctx.stroke();
                // Add some "ink" details
                ctx.fillStyle = player.color + '33';
                ctx.fill();
                ctx.restore();
            });

            ctx.restore();

            stateRef.current.requestRef = requestAnimationFrame(render);
        };

        if (stateRef.current.isInitialLoad) {
            fitToView();
            stateRef.current.isInitialLoad = false;
        }

        stateRef.current.requestRef = requestAnimationFrame(render);
        return () => cancelAnimationFrame(stateRef.current.requestRef);
    }, [track, players, activePlayerIndex]);

    return (
        <div ref={containerRef} className="canvas-container-outer" style={{
            width: '100%',
            height: '100%',
            position: 'relative',
        }}>
            <canvas ref={canvasRef} style={{ display: 'block' }} />
            <div className="paper-texture"></div>
        </div>
    );
};

export default CanvasRenderer;
