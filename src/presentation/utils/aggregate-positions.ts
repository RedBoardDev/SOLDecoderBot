import type { PositionResponse } from '../../schemas/position-response.schema';

export function aggregatePositions(positions: PositionResponse[]): PositionResponse {
  if (positions.length === 0) {
    throw new Error('Cannot aggregate zero positions');
  }
  if (positions.length === 1) {
    return positions[0];
  }

  const { status, data: first } = positions[0];

  let totalUsdChange = 0; // Σ pnl.value
  let totalSolChange = 0; // Σ pnl.valueNative
  let totalUsdCurrent = 0; // Σ data.value
  let totalSolCurrent = 0; // Σ data.valueNative
  let maxAgeHours = 0; // max(data.ageHour)
  let sumPctNative = 0; // Σ data.pnl.percentNative

  for (const { data } of positions) {
    totalUsdChange += data.pnl.value;
    totalSolChange += data.pnl.valueNative;
    totalUsdCurrent += data.value;
    totalSolCurrent += data.valueNative;

    const age = Number.parseFloat(data.ageHour);
    if (age > maxAgeHours) {
      maxAgeHours = age;
    }

    sumPctNative += data.pnl.percentNative;
  }

  const avgPercentNative = sumPctNative / positions.length;

  return {
    status,
    data: {
      tokenId: first.tokenId,
      pairName: first.pairName,
      pnl: {
        value: totalUsdChange,
        valueNative: totalSolChange,
        percentNative: avgPercentNative,
      },
      ageHour: maxAgeHours.toString(),
      position: first.position,
      value: totalUsdCurrent,
      valueNative: totalSolCurrent,
      token0Info: first.token0Info,
      token1Info: first.token1Info,
    },
  };
}
