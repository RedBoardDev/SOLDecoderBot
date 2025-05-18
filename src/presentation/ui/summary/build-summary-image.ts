import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import { selectBackgroundSummary } from '../position/select-background-image';
import { formatValue, type ValueFormat } from '../../utils/image-format-utils';

GlobalFonts.registerFromPath('assets/fonts/VarelaRound-Regular.ttf', 'Varela Round');

export interface SummaryData {
  periodLabel: string;
  winRatePct: number;
  totalVolumeSol: number;
  totalVolumeUsd: number;
  totalPnlSol: number;
  totalPnlUsd: number;
}

export async function buildSummaryImage(data: SummaryData): Promise<Buffer> {
  const { periodLabel, winRatePct, totalVolumeSol, totalVolumeUsd, totalPnlSol, totalPnlUsd } = data;

  const width = 1536;
  const height = 1024;
  const margin = 50;
  const lineGap = 100;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 1) Background
  const bg = await loadImage(selectBackgroundSummary());
  ctx.drawImage(bg, 0, 0, width, height);

  // glow helper
  function setGlow(color: string, blur: number) {
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
  }

  // RIGHT COLUMN X
  const x = width - margin;
  const y = margin;

  // --- 2) TOTAL PnL BLOCK (top-right) ---
  // récupère signe & couleur partagés
  const usdFmt: ValueFormat = formatValue(totalPnlUsd);
  const solFmt: ValueFormat = formatValue(totalPnlSol);

  // polices
  const usdFontPx = Math.round(96 * 1.1);
  const solFontPx = Math.round(48 * 1.1);
  const labelFontPx = Math.round(48 * 1.1);

  // hauteurs lignes
  const usdLineH = Math.round(usdFontPx * 1.2);
  const solLineH = Math.round(solFontPx * 1.2);

  // a) USD amount
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.font = `bold ${usdFontPx}px "Varela Round"`;
  setGlow(usdFmt.color, 40);
  ctx.fillStyle = usdFmt.color;
  ctx.fillText(`${usdFmt.sign}$${Math.abs(totalPnlUsd).toFixed(2)}`, x, y);

  // b) SOL amount
  const ySol = y + usdLineH;
  ctx.font = `bold ${solFontPx}px "Varela Round"`;
  setGlow('#f8f8f8', 10);
  ctx.fillStyle = '#f8f8f8';
  ctx.fillText(`(${solFmt.sign}${Math.abs(totalPnlSol).toFixed(2)} SOL)`, x, ySol);

  // c) Label “Total PnL”
  const yLabel = ySol + solLineH;
  ctx.font = `bold ${labelFontPx}px "Varela Round"`;
  setGlow('#ffd700', 10);
  ctx.fillStyle = '#ffd700';
  ctx.fillText('Total PnL', x, yLabel);

  // --- 3) WIN RATE & VOLUME (bottom-right) ---
  const bottomY = height - margin - lineGap;

  // Win Rate
  const winFmt: ValueFormat = formatValue(winRatePct);
  ctx.font = 'bold 48px "Varela Round"';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const winLabel = 'Win Rate: ';
  const winValue = `${winFmt.sign}${Math.abs(winRatePct).toFixed(2)}%`;
  const winFull = winLabel + winValue;
  const wWinFull = ctx.measureText(winFull).width;
  const wWinLbl = ctx.measureText(winLabel).width;
  const winX = x - wWinFull;

  setGlow('#ffd700', 10);
  ctx.fillStyle = '#ffd700';
  ctx.fillText(winLabel, winX, bottomY + lineGap * 0.2);

  setGlow(winFmt.color, 20);
  ctx.fillStyle = winFmt.color;
  ctx.fillText(winValue, winX + wWinLbl, bottomY + lineGap * 0.2);

  // Volume
  ctx.font = 'bold 48px "Varela Round"';
  const volLabel = 'Volume: ';
  const volValue = `${totalVolumeSol.toFixed(2)} SOL ($${totalVolumeUsd.toFixed(2)})`;
  const volFull = volLabel + volValue;
  const wVolFull = ctx.measureText(volFull).width;
  const wVolLbl = ctx.measureText(volLabel).width;
  const volX = x - wVolFull;
  const volY = bottomY + lineGap;

  setGlow('#ffd700', 10);
  ctx.fillStyle = '#ffd700';
  ctx.fillText(volLabel, volX, volY);

  setGlow('#f8f8f8', 10);
  ctx.fillStyle = '#f8f8f8';
  ctx.fillText(volValue, volX + wVolLbl, volY);

  // --- 4) PERIOD (bottom-left) ---
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.font = '32px "Varela Round"';
  setGlow('#000000', 10);
  ctx.fillStyle = '#f8f8f8';
  ctx.fillText(periodLabel, margin, height - margin);

  return canvas.encode('png');
}
