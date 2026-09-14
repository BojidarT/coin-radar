// Pure controls shared by the dashboard and API. All money values are USD.
// These limits are user-selected principal ceilings, never return forecasts.
export const finiteNonnegative = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
export const finitePositive = value => finiteNonnegative(value) && value > 0;
export function recentSnapshot(timestamp, now = Date.now(), maxAgeMs = 90000) {
  const at = typeof timestamp === 'string' ? Date.parse(timestamp) : timestamp;
  return finitePositive(at) && Number.isFinite(now) && at <= now && now - at <= maxAgeMs;
}
export function capitalLimit(config, committed, sameToken = 0) {
  const reserve = config.cashReserveUsd ?? 0;
  if (!finitePositive(config.bankroll) || !finiteNonnegative(committed) ||
      !finiteNonnegative(sameToken) || sameToken > committed || !finiteNonnegative(reserve) ||
      !finitePositive(config.riskPct) || config.riskPct > 100 ||
      !finitePositive(config.maxAllocationPct) || config.maxAllocationPct > 100)
    return {valid:false, ceiling:0, available:0};
  const available = Math.max(0, config.bankroll - committed - reserve);
  const perToken = Math.min(config.bankroll * config.riskPct / 100, config.bankroll * config.maxAllocationPct / 100);
  const ceiling = Math.floor(Math.max(0, Math.min(perToken - sameToken, available)) * 100) / 100;
  return {valid:true, ceiling, available};
}
export function exitScenario(amount, changePct, haircutPct, feesUsd) {
  if (!finitePositive(amount) || !Number.isFinite(changePct) || changePct < -100 ||
      !finiteNonnegative(haircutPct) || haircutPct >= 100 || !finiteNonnegative(feesUsd)) return null;
  const gross = amount * (1 + changePct / 100);
  const proceeds = gross * (1 - haircutPct / 100) - feesUsd;
  const breakEvenPct = ((amount + feesUsd) / (amount * (1 - haircutPct / 100)) - 1) * 100;
  if (![gross, proceeds, breakEvenPct].every(Number.isFinite)) return null;
  return {gross, proceeds, pnl:proceeds - amount, breakEvenPct};
}
export function evaluateExitRules(p, price, liquidity) {
  const events = [];
  const add = (kind, severity, message) => events.push({kind, severity, message});
  const validPercent = n => finitePositive(n) && n < 100;
  if (!finitePositive(p.entryPrice) || !finitePositive(p.peakPrice) ||
      !finitePositive(p.takeProfitPct) || !validPercent(p.stopPct) ||
      !validPercent(p.trailingPct) || !validPercent(p.liquidityDropPct)) {
    return {peak:finitePositive(p.peakPrice) ? p.peakPrice : 0,
      events:[{kind:'invalid_position', severity:'urgent', message:'Stored position or thresholds are invalid. Review the recorded trade; exit checks cannot be trusted.'}]};
  }
  let peak = p.peakPrice;
  if (!finitePositive(price)) {
    add('data_unavailable','urgent','Price unavailable. Price exit rules cannot be checked. Inspect this position in Phantom.');
  } else {
    peak = Math.max(p.peakPrice, p.entryPrice, price);
    const change = (price / p.entryPrice - 1) * 100;
    if (price <= p.entryPrice * (1 - p.stopPct / 100))
      add('loss_threshold','urgent',`Loss threshold crossed: ${change.toFixed(1)}% from entry. Review an exit now; this snapshot is not an executable sell quote.`);
    if (price >= p.entryPrice * (1 + p.takeProfitPct / 100))
      add('profit_target','review',`Profit target reached: +${change.toFixed(1)}% from entry. Review taking profit in Phantom.`);
    if (peak > p.entryPrice && price <= peak * (1 - p.trailingPct / 100))
      add('trailing_pullback','urgent',`Pullback of ${((1-price/peak)*100).toFixed(1)}% from the highest observed price. Review an exit.`);
  }
  if (!finiteNonnegative(liquidity)) {
    add('liquidity_unavailable','urgent','Pool liquidity is unavailable. Exit depth cannot be assessed.');
  } else if (liquidity === 0) {
    add('liquidity_drop','urgent','Reported pool liquidity is zero. A sell may be impossible; check your wallet directly.');
  } else if (finitePositive(p.entryLiquidity) && liquidity <= p.entryLiquidity * (1 - p.liquidityDropPct / 100)) {
    add('liquidity_drop','urgent',`Pool liquidity is ${(100*(1-liquidity/p.entryLiquidity)).toFixed(1)}% below the recording snapshot. Exiting may be harder.`);
  }
  return {peak, events};
}
// Unknown data must not count as recovery of a price/liquidity rule.
export function advanceAlerts(previous = {}, events) {
  const kinds = ['loss_threshold','profit_target','trailing_pullback','liquidity_drop','data_unavailable','liquidity_unavailable','invalid_position'];
  const current = new Set(events.map(e => e.kind));
  const state = {};
  const triggered = [];
  for (const kind of kinds) {
    const old = previous[kind];
    const episode = Number.isSafeInteger(old?.episode) && old.episode > 0 ? old.episode : 0;
    const active = old?.active === true;
    const unknown = current.has('invalid_position') && kind !== 'invalid_position' ||
      current.has('data_unavailable') && ['loss_threshold','profit_target','trailing_pullback'].includes(kind) ||
      current.has('liquidity_unavailable') && kind === 'liquidity_drop';
    if (unknown) { state[kind] = {active, episode}; continue; }
    const nextActive = current.has(kind);
    const nextEpisode = episode + (nextActive && !active ? 1 : 0);
    state[kind] = {active:nextActive, episode:nextEpisode};
    if (nextActive && !active) triggered.push({...events.find(e => e.kind === kind), episode:nextEpisode});
  }
  return {state, triggered};
}
