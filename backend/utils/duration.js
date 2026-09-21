const multipliers = {
  ms: 1 / 1000,
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

export const durationToSeconds = (value, fallbackSeconds) => {
  const match = String(value ?? "")
    .trim()
    .match(/^(\d+)\s*(ms|s|m|h|d)?$/i);
  if (!match) return fallbackSeconds;
  const amount = Number(match[1]);
  const unit = (match[2] || "s").toLowerCase();
  return Math.max(1, Math.floor(amount * multipliers[unit]));
};
