export type RuleEvent = {kind:string;severity:'review'|'urgent';message:string};
export type AlertState = Record<string,{active:boolean;episode:number}>;
export function finiteNonnegative(value:unknown):value is number;
export function finitePositive(value:unknown):value is number;
export function recentSnapshot(timestamp:string|number|null|undefined,now?:number,maxAgeMs?:number):boolean;
export function capitalLimit(config:{bankroll:number;riskPct:number;maxAllocationPct:number;cashReserveUsd?:number},committed:number,sameToken?:number):{valid:boolean;ceiling:number;available:number};
export function exitScenario(amount:number,changePct:number,haircutPct:number,feesUsd:number):{gross:number;proceeds:number;pnl:number;breakEvenPct:number}|null;
export function evaluateExitRules(position:{entryPrice:number;peakPrice:number;entryLiquidity:number|null;takeProfitPct:number;stopPct:number;trailingPct:number;liquidityDropPct:number},price:number|null,liquidity:number|null):{peak:number;events:RuleEvent[]};
export function advanceAlerts(previous:AlertState|undefined,events:RuleEvent[]):{state:AlertState;triggered:(RuleEvent&{episode:number})[]};
