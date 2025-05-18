import type { PositionResponse } from '../../../schemas/position-response.schema';
import type { TakeProfitTrigger } from '../../../schemas/takeprofit-message.schema';

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
