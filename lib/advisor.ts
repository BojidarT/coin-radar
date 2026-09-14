import type {Coin} from './market';
import {capitalLimit,evaluateExitRules,finitePositive,type AlertState} from './trade-controls.mjs';
export type RiskConfig={bankroll:number;riskPct:number;maxAllocationPct:number;takeProfitPct:number;stopPct:number;trailingPct:number;liquidityDropPct:number;xDailyRequests:number;cashReserveUsd?:number};
export const defaultConfig:RiskConfig={bankroll:0,riskPct:1,maxAllocationPct:5,takeProfitPct:50,stopPct:20,trailingPct:15,liquidityDropPct:30,xDailyRequests:0,cashReserveUsd:0};
export type Position={id:string;address:string;pair:string;symbol:string;entryPrice:number;amount:number;quantity:number;peakPrice:number;entryLiquidity:number|null;takeProfitPct:number;stopPct:number;trailingPct:number;liquidityDropPct:number;openedAt:string;closedAt:string|null;lastPrice:number|null;lastCheckedAt:string|null;lastSnapshotAt?:string|null;alertState?:AlertState};
export type PositionEvent={kind:string;severity:'review'|'urgent';message:string};
export function sizePosition(config:RiskConfig,committed:number,coin:Coin|null,reviewed:boolean,sameToken=0){
 const limit=capitalLimit(config,committed,sameToken),ceiling=limit.ceiling;
 if(!limit.valid)return {amount:0,ceiling:0,reason:'Set valid budget and exposure values first.',status:'Setup required'};
 if(!coin)return {amount:0,ceiling,reason:'Refresh evidence for the selected coin and pool.',status:'Evidence required'};
 if(!finitePositive(coin.price)||!finitePositive(coin.liquidity)||coin.verdict!=='Research candidate')return {amount:0,ceiling,reason:'This coin does not pass the market research screen with usable price and liquidity.',status:'Wait / avoid new entry'};
 if(!reviewed)return {amount:0,ceiling,reason:'Complete the manual contract and exit checks. Allocation remains zero.',status:'Review required'};
 return {amount:ceiling,ceiling,reason:'Your remaining principal ceiling across all recorded positions in this token, after your cash reserve. It is not an optimal investment estimate or a buy recommendation.',status:ceiling>0?'Within your chosen limit':'Token cap or available budget exhausted'};
}
export function evaluatePosition(p:Position,price:number|null,liquidity:number|null):{peak:number;events:PositionEvent[]}{
 return evaluateExitRules(p,price,liquidity);
}
export function socialSummary(posts:{text:string;author_id?:string;created_at?:string;public_metrics?:{like_count?:number;retweet_count?:number}}[]){
 const normalize=(text:string)=>text.toLowerCase().replace(/https?:\/\/\S+/g,'').replace(/\s+/g,' ').trim();
 const bodies=new Set(posts.map(p=>normalize(p.text)));const authors=new Set(posts.map(p=>p.author_id).filter(Boolean));
 return {sampleSize:posts.length,uniqueAuthors:authors.size,duplicateText:posts.length-bodies.size,engagement:posts.reduce((n,p)=>n+(p.public_metrics?.like_count||0)+(p.public_metrics?.retweet_count||0),0),warning:'Bounded sample, not total mentions or proof of organic demand. Repeated text and engagement can be manipulated.'};
}
