/**
 * Cube detector client — thin wrapper around CV.worker.js
 *
 * The heavy lifting (OpenCV.js, contour detection, etc.) runs in a
 * Web Worker for security isolation and UI thread freedom.
 *
 * This module provides:
 * - drawOverlay() for rendering results on the main-thread canvas
 * - Constants (PROC_W, PROC_H)
 */

export const PROC_W = 224;
export const PROC_H = 224;

// ── Draw overlay on main-thread canvas ──────────────────────
export function drawOverlay(ctx, result, displayW, displayH) {
  ctx.clearRect(0, 0, displayW, displayH);
  const size = Math.min(displayW, displayH);
  const left = (displayW - size) / 2;
  const top = (displayH - size) / 2;

  // Draw darkened overlay for letterboxing
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  if (displayW > displayH) {
    ctx.fillRect(0, 0, left, displayH);
    ctx.fillRect(left + size, 0, left, displayH);
  } else {
    ctx.fillRect(0, 0, displayW, top);
    ctx.fillRect(0, top + size, displayW, top);
  }

  // Draw active area border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(left, top, size, size);
  ctx.setLineDash([]);

  if (!result) return;

  const sx = size / result.w;
  const sy = size / result.h;

  ctx.save();
  ctx.translate(left, top);

  // ROI rectangle (yellow dashed)
  if (result.roi) {
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(
      result.roi.minX * sx, result.roi.minY * sy,
      (result.roi.maxX - result.roi.minX) * sx,
      (result.roi.maxY - result.roi.minY) * sy
    );
    ctx.setLineDash([]);
  }

  // All detected sticker rects (light cyan outlines)
  if (result.stickers && result.stickers.length) {
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    for (const s of result.stickers) {
      ctx.strokeRect(s.rect.x * sx, s.rect.y * sy, s.rect.w * sx, s.rect.h * sy);
    }
  }

  // Best cluster sticker rects (bright cyan fill)
  if (result.bestCluster && result.bestCluster.length) {
    ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    for (const s of result.bestCluster) {
      ctx.fillRect(s.rect.x * sx, s.rect.y * sy, s.rect.w * sx, s.rect.h * sy);
      ctx.strokeRect(s.rect.x * sx, s.rect.y * sy, s.rect.w * sx, s.rect.h * sy);
    }
    // Sticker centers
    ctx.fillStyle = '#00ff88';
    for (const s of result.bestCluster) {
      ctx.beginPath();
      ctx.arc(s.cx * sx, s.cy * sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Quad (green)
  if (result.quad) {
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(result.quad[0].x * sx, result.quad[0].y * sy);
    for (let i = 1; i < 4; i++) {
      ctx.lineTo(result.quad[i].x * sx, result.quad[i].y * sy);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 3×3 grid
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.4)';
    ctx.lineWidth = 1;
    const q = result.quad;
    for (let i = 1; i < 3; i++) {
      const t = i / 3;
      ctx.beginPath();
      ctx.moveTo((q[0].x + (q[3].x - q[0].x) * t) * sx, (q[0].y + (q[3].y - q[0].y) * t) * sy);
      ctx.lineTo((q[1].x + (q[2].x - q[1].x) * t) * sx, (q[1].y + (q[2].y - q[1].y) * t) * sy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo((q[0].x + (q[1].x - q[0].x) * t) * sx, (q[0].y + (q[1].y - q[0].y) * t) * sy);
      ctx.lineTo((q[3].x + (q[2].x - q[3].x) * t) * sx, (q[3].y + (q[2].y - q[3].y) * t) * sy);
      ctx.stroke();
    }
  }

  ctx.restore();

  // Debug text (drawn outside the translated context so it stays top-left of the screen)
  ctx.fillStyle = 'rgba(0, 255, 136, 0.9)';
  ctx.font = '11px monospace';
  const trk = result.isTracking ? ' TRK' : '';
  ctx.fillText(`Conf:${result.confidence}% S:${result.stickerCount} C:${result.colorClusters}${trk}`, 8, 16);
  if (result.pose) {
    ctx.fillText(`Y:${result.pose.yaw.toFixed(1)}° P:${result.pose.pitch.toFixed(1)}° R:${result.pose.roll.toFixed(1)}°`, 8, 30);
    if (result.pose.raw && result.pose.raw.length >= 7) {
      ctx.fillStyle = 'rgba(0, 255, 255, 0.9)';
      ctx.font = 'bold 11px monospace';
      const r = result.pose.raw;
      const detRaw = r[6].toFixed(2);
      ctx.fillText(`RAW P:${r[0].toFixed(2)} Y:${r[1].toFixed(2)} R:${r[2].toFixed(2)} X:${r[3].toFixed(2)} Y:${r[4].toFixed(2)} S:${r[5].toFixed(2)} DET:${detRaw}`, 8, 46);
    }
  }
}
