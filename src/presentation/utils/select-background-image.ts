const ASSET_PATH = 'assets/';

enum Background {
  Default = 'background_default.png',
  Happy = 'background_happy.png',
  Sad = 'background_sad.png',
  Trump = 'background_trump.png',
}

function getBackgroundPath(fileName: string): string {
  return `${ASSET_PATH}${fileName}`;
}

function shouldUseTrumpBackground(): boolean {
  const TRUMP_CHANCE = 0.05;
  return Math.random() < TRUMP_CHANCE;
}

export function selectBackground(pct: number): string {
  if (pct === 0) {
    return getBackgroundPath(Background.Default);
  }

  const isGain = pct > 0;
  if (isGain && shouldUseTrumpBackground()) {
    return getBackgroundPath(Background.Trump);
  }

  if (pct < 0) {
    return getBackgroundPath(Background.Sad);
  }

  if (pct > 50) {
    return getBackgroundPath(Background.Happy);
  }

  return getBackgroundPath(Background.Default);
}
