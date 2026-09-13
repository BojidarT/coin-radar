import type {Coin} from './market';
export type RiskConfig={bankroll:number;riskPct:number;maxAllocationPct:number;takeProfitPct:number;stopPct:number;trailingPct:number;liquidityDropPct:number;xDailyRequests:number};
export const defaultConfig:RiskConfig={bankroll:0,riskPct:1,maxAllocationPct:5,takeProfitPct:50,stopPct:20,trailingPct:15,liquidityDropPct:30,xDailyRequests:0};
export type Position={id:string;address:string;pair:string;symbol:string;entryPrice:number;amount:number;quantity:number;peakPrice:number;entryLiquidity:number|null;takeProfitPct:number;stopPct:number;trailingPct:number;liquidityDropPct:number;openedAt:string;closedAt:string|null;lastPrice:number|null;lastCheckedAt:string|null};
export type PositionEvent={kind:string;severity:'review'|'urgent';message:string};
export function sizePosition(config:RiskConfig,committed:number,coin:Coin|null,reviewed:boolean){
 const bankroll=config.bankroll;
 if(!Number.isFinite(bankroll)||bankroll<=0)return {amount:0,ceiling:0,reason:'Set a trading budget first.',status:'Setup required'};
 const available=Math.max(0,bankroll-committed);
 const ceiling=Math.floor(Math.max(0,Math.min(bankroll*config.riskPct/100,bankroll*config.maxAllocationPct/100,available))*100)/100;
 if(!coin)return {amount:0,ceiling,reason:'Select a coin to evaluate.',status:'No selection'};
 if(coin.verdict!=='Research candidate')return {amount:0,ceiling,reason:'This coin does not pass the market research screen.',status:'Wait / avoid new entry'};
 if(!reviewed)return {amount:0,ceiling,reason:'Token safety has not been reviewed. The allocation stays at zero.',status:'Review required'};
 return {amount:ceiling,ceiling,reason:'Conditional research allocation after your manual safety review. This is the maximum principal you chose to put at risk, not an optimal investment estimate.',status:ceiling>0?'Within your risk limit':'No unallocated budget'};
}
export function evaluatePosition(p:Position,price:number|null,liquidity:number|null):{peak:number;events:PositionEvent[]}{
 if(price===null||!Number.isFinite(price)||price<=0)return {peak:p.peakPrice,events:[{kind:'data_unavailable',severity:'urgent',message:'Price unavailable. Exit conditions cannot be checked; inspect this position in Phantom.'}]};
 const peak=Math.max(p.peakPrice,p.entryPrice,price),change=(price/p.entryPrice-1)*100,drawdown=(1-price/peak)*100;
 const events:PositionEvent[]=[];
 if(price<=p.entryPrice*(1-p.stopPct/100))events.push({kind:'loss_threshold',severity:'urgent',message:`Loss threshold crossed: ${change.toFixed(1)}% from entry. Review an exit now; the quote is not an executable sell price.`});
 if(price>=p.entryPrice*(1+p.takeProfitPct/100))events.push({kind:'profit_target',severity:'review',message:`Profit target reached: +${change.toFixed(1)}% from entry. Review taking profit in Phantom.`});
 if(peak>p.entryPrice&&price<=peak*(1-p.trailingPct/100))events.push({kind:'trailing_pullback',severity:'urgent',message:`Price pulled back ${drawdown.toFixed(1)}% from the highest price observed since tracking began. Review an exit.`});
 if(liquidity===null)events.push({kind:'liquidity_unavailable',severity:'review',message:'Pool liquidity is unavailable. Exit depth could not be assessed.'});
 else if(p.entryLiquidity&&liquidity<=p.entryLiquidity*(1-p.liquidityDropPct/100))events.push({kind:'liquidity_drop',severity:'urgent',message:`Pool liquidity is ${(100*(1-liquidity/p.entryLiquidity)).toFixed(1)}% below the opening snapshot. Exiting may be harder.`});
 return {peak,events};
}
export function socialSummary(posts:{text:string;author_id?:string;created_at?:string;public_metrics?:{like_count?:number;retweet_count?:number}}[]){
 const normalize=(text:string)=>text.toLowerCase().replace(/https?:\/\/\S+/g,'').replace(/\s+/g,' ').trim();
 const bodies=new Set(posts.map(p=>normalize(p.text)));const authors=new Set(posts.map(p=>p.author_id).filter(Boolean));
 return {sampleSize:posts.length,uniqueAuthors:authors.size,duplicateText:posts.length-bodies.size,engagement:posts.reduce((n,p)=>n+(p.public_metrics?.like_count||0)+(p.public_metrics?.retweet_count||0),0),warning:'Bounded sample, not total mentions or proof of organic demand. Repeated text and engagement can be manipulated.'};
}
