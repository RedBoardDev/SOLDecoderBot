import { createCanvas, loadImage } from '@napi-rs/canvas';
import type { PositionResponse } from '../../schemas/position-response.schema';
import type { TakeProfitTrigger } from '../../schemas/takeprofit-message.schema';

/**
 * Builds a standard short text summary:
 * ⚪ Position closed: 0.00% change (±0.00 SOL)
 * 🟢 Position closed: +X.XX% profit (+Y.YY SOL)
 * 🔴 Position closed: −X.XX% loss (−Y.YY SOL)
 */
export function buildPositionMessage(response: PositionResponse): string {
  const { pnl } = response.data;
  const pct = pnl.percentNative;
  const sol = pnl.valueNative;
  const icon = pct > 0 ? '🟢' : pct < 0 ? '🔴' : '⚪';
  const pctLabel = pct === 0 ? '0.00% change' : `${pct > 0 ? '+' : ''}${pct.toFixed(2)}% profit`;
  const solLabel = `(${sol >= 0 ? '+' : ''}${sol.toFixed(2)} SOL)`;
  return `${icon} Position closed: ${pctLabel} ${solLabel}`;
}

/**
 * Builds a take-profit-triggered summary when a threshold message precedes a closed position.
 * E.g. "🎯 Take profit triggered: 100% profit (502.23 SOL)"
 */
export function buildTriggeredMessage(response: PositionResponse, trigger: TakeProfitTrigger): string {
  const { pnl } = response.data;
  const pct = pnl.percentNative;
  const sol = pnl.valueNative;
  const icon = '🎯';
  const label = pct >= 0 ? `${pct.toFixed(2)}% profit` : `${pct.toFixed(2)}% loss`;
  const solLabel = `(${sol >= 0 ? '' : ''}${sol.toFixed(2)} SOL)`;
  return `${icon} Take profit triggered: ${label} ${solLabel}`;
}

/**
 * Renders a simple PNG summarizing PnL and % change.
 */
export async function buildPositionImage(response: PositionResponse): Promise<Buffer> {
  const { pnl, ageHour, token0Info, token1Info, valueNative } = response.data;

  const pairLeft = token0Info.token_symbol;
  const pairRight = token1Info.token_symbol;

  const pnlSOL = pnl.valueNative;
  const pnlUSD = pnl.valueNative * 100; // TODO: placeholder conversion

  const tvlSOL = valueNative;
  const tvlUSD = valueNative * 100; // TODO: placeholder conversion

  const elapsedHours = Number.parseFloat(ageHour);
  const h = Math.floor(elapsedHours);
  const m = Math.round((elapsedHours - h) * 60);
  const elapsedNum1 = `${h}`;
  const elapsedUnit1 = 'h';
  const elapsedNum2 = `${m.toString().padStart(2, '0')}`;
  const elapsedUnit2 = 'mn';

  const pnlSolFmt = formatValue(pnlSOL);
  const pnlUsdFmt = formatValue(pnlUSD);

  const profitSolText = pnlSOL !== 0 ? ` (${pnlSolFmt.sign}${Math.abs(pnlSOL).toFixed(2)} SOL)` : '';
  const profitUsdText = `${pnlUsdFmt.sign}$${Math.abs(pnlUSD).toFixed(2)}`;

  const pct = pnl.percentNative;
  const pnlPctFmt = formatValue(pct);

  // --- Canvas setup ---
  const width = 1536;
  const height = 1024;
  const margin = 50;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Draw background
  const bg = await loadImage('assets/background3.png');
  ctx.drawImage(bg, 0, 0, width, height);

  const x = width - margin;
  const lineGap = 100;
  const topY = margin + lineGap;

  ctx.textBaseline = 'middle';

  // Helper for glow
  function setGlow(color: string, blur: number) {
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
  }

  // --- 1) Pair with colored slash ---
  // Measure parts
  ctx.font = 'bold 72px Sans';
  const wLeft = ctx.measureText(pairLeft).width;
  const wSlash = ctx.measureText('/').width;
  const wRight = ctx.measureText(pairRight).width;
  const fullWPair = wLeft + wSlash + wRight;
  const startXPair = x - fullWPair;

  // Left part (near-white)
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f8f8f8';
  setGlow('#ffd700', 10);
  ctx.fillText(pairLeft, startXPair, topY);

  // Slash (yellow)
  ctx.fillStyle = '#ffd700';
  setGlow('#f8f8f8', 20);
  ctx.fillText('/', startXPair + wLeft, topY);

  // Right part (near-white)
  ctx.fillStyle = '#f8f8f8';
  setGlow('#ffd700', 20);
  ctx.fillText(pairRight, startXPair + wLeft + wSlash, topY);

  // --- 2) Profit line (pastel green + near-white) ---
  ctx.font = 'bold 72px Sans';
  // USD part
  const wUsd = ctx.measureText(profitUsdText).width;
  ctx.textAlign = 'left';
  ctx.fillStyle = pnlUsdFmt.color;
  setGlow(pnlUsdFmt.color, 30);
  ctx.fillText(profitUsdText, x - (wUsd + ctx.measureText(profitSolText).width), topY + lineGap);
  // SOL part
  ctx.fillStyle = '#f8f8f8';
  setGlow('#ffd700', 10);
  ctx.fillText(profitSolText, x - ctx.measureText(profitSolText).width, topY + lineGap);

  // --- 3) Elapsed time (mixed colors) ---
  ctx.font = 'bold 48px Sans';
  const wNum1 = ctx.measureText(elapsedNum1).width;
  const wUnit1 = ctx.measureText(elapsedUnit1).width;
  const wNum2 = ctx.measureText(elapsedNum2).width;
  const wUnit2 = ctx.measureText(elapsedUnit2).width;
  const fullWTime = wNum1 + wUnit1 + wNum2 + wUnit2;
  const startXTime = x - fullWTime;

  // Num1 (near-white)
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f8f8f8';
  setGlow('#ffff00', 10);
  ctx.fillText(elapsedNum1, startXTime, topY + lineGap * 2);

  // Unit1 (yellow)
  setGlow('#ffd700', 20);
  ctx.fillStyle = '#ffd700';
  ctx.fillText(elapsedUnit1, startXTime + wNum1, topY + lineGap * 2);

  // Num2 (near-white)
  ctx.fillStyle = '#f8f8f8';
  setGlow('#ffd700', 10);
  ctx.fillText(elapsedNum2, startXTime + wNum1 + wUnit1, topY + lineGap * 2);

  // Unit2 (yellow)
  ctx.fillStyle = '#ffd700';
  setGlow('#ffd700', 20);
  ctx.fillText(elapsedUnit2, startXTime + wNum1 + wUnit1 + wNum2, topY + lineGap * 2);

  // --- Bottom metrics (uniform size 48px) ---
  const bottomY = height - margin - lineGap;
  ctx.font = 'bold 48px Sans';

  // PNL label
  const pnlLabel = 'PNL: ';
  const pnlValueText = `${pnlPctFmt.sign}${Math.abs(pct).toFixed(2)}%`;
  const pnlFullText = pnlLabel + pnlValueText;
  const wPnlFull = ctx.measureText(pnlFullText).width;
  const wPnlLabel = ctx.measureText(pnlLabel).width;

  // PNL label
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd700';
  setGlow('#ffd700', 10);
  ctx.fillText(pnlLabel, x - wPnlFull, bottomY + lineGap * 0.2);

  // PNL value
  ctx.fillStyle = pnlPctFmt.color;
  setGlow(pnlPctFmt.color, 20);
  ctx.fillText(pnlValueText, x - wPnlFull + wPnlLabel, bottomY + lineGap * 0.2);

  // TVL (yellow label + near-white value)
  // Measure full and label
  const tvlText = `${tvlSOL.toFixed(2)} SOL ($${tvlUSD.toFixed(0)})`;
  const wTvlText = ctx.measureText(tvlText).width;
  const wLabel = ctx.measureText('TVL: ').width;
  const startXTvl = x - (wLabel + wTvlText);

  // Label
  ctx.textAlign = 'left';
  setGlow('#ffd700', 20);
  ctx.fillStyle = '#ffd700';
  ctx.fillText('TVL: ', startXTvl, bottomY + lineGap);

  // Value
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f8f8f8';
  setGlow('#ffd700', 10);
  ctx.fillText(tvlText, startXTvl + wLabel, bottomY + lineGap);

  return canvas.encode('png');
}

function formatValue(value: number) {
  if (value > 0) return { sign: '+', color: '#66ff66' };
  if (value < 0) return { sign: '-', color: '#ff6666' };
  return { sign: '', color: '#ffd700' };
}
