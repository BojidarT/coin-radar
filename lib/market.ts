export type Coin = { address:string; name:string; symbol:string; price:number|null; change5m:number|null; change1h:number|null; change24h:number|null; liquidity:number|null; volume:number|null; marketCap:number|null; buys:number|null; sells:number|null; ageHours:number|null; pair:string; boosted:boolean; score:number; verdict:string; reasons:string[]; risks:string[]; links:{label:string;url:string}[] };
export const numeric=(v:unknown):number|null=>typeof v==='number'&&Number.isFinite(v)?v:null;
const nonnegative=(v:unknown)=>{const n=numeric(v);return n!==null&&n>=0?n:null;};
export function safeUrl(value:unknown):string|null {try {const u=new URL(String(value));return u.protocol==='https:'?u.href:null;}catch{return null;}}
export function assess(c:Pick<Coin,'liquidity'|'volume'|'change1h'|'change24h'|'buys'|'sells'|'ageHours'>){
 const reasons:string[]=[],risks:string[]=[]; let score=0;
 if(c.liquidity==null) risks.push('Liquidity is unavailable.'); else if(c.liquidity<25000) risks.push('Thin liquidity below $25k: exits may move the price sharply.'); else {score+=c.liquidity>=100000?25:15;reasons.push('At least $25k of reported pool liquidity.');}
 if(c.volume!=null&&c.volume>=100000){score+=20;reasons.push('At least $100k in reported 24h volume.');}
 if(c.change1h!=null&&c.change1h>0){score+=Math.min(20,c.change1h);reasons.push('Positive price momentum over the last hour.');}
 if(c.buys!=null&&c.sells!=null&&c.buys+c.sells>=20&&c.buys>c.sells){score+=20;reasons.push('More buy transactions than sells in the last hour; these are not unique traders.');}
 if(c.ageHours==null)risks.push('Pool age is unavailable.');else if(c.ageHours<24)risks.push('Pool is less than 24 hours old.');else {score+=15;}
 if(c.change1h!=null&&c.change1h>50)risks.push('More than 50% growth in one hour: elevated reversal risk.');
 if(c.change24h!=null&&c.change24h<-30)risks.push('Price has fallen more than 30% in 24 hours.');
 if(c.liquidity&&c.volume!=null&&c.volume/c.liquidity>30)risks.push('Very high volume relative to liquidity; activity may be distorted.');
 return {score:Math.round(score),verdict:risks.length?'High caution':score>=65?'Research candidate':'Watch',reasons,risks};
}
const cache=new Map<string,{expires:number;value:any;retrievedAt:string}>();
export async function fetchSnapshot(url:string,ttl=60000,headers?:Record<string,string>):Promise<{value:any;retrievedAt:string}>{
 const old=cache.get(url);if(old&&old.expires>Date.now())return {value:old.value,retrievedAt:old.retrievedAt};
 const r=await fetch(url,{cache:'no-store',headers:{Accept:'application/json',...headers},signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw new Error(`Provider returned ${r.status}`);
 const value=await r.json(),retrievedAt=new Date().toISOString();
 if(cache.size>100)cache.clear();cache.set(url,{value,retrievedAt,expires:Date.now()+ttl});
 return {value,retrievedAt};
}
export async function fetchJson(url:string,ttl=60000,headers?:Record<string,string>):Promise<any>{
 return (await fetchSnapshot(url,ttl,headers)).value;
}
export function normalize(p:any,boosted=false):Coin|null{
 if(!p||typeof p!=='object')return null;
 const address=p.baseToken?.address;if(p.chainId!=='solana'||typeof address!=='string'||typeof p.pairAddress!=='string'||!address||!p.pairAddress)return null;
 const rawPrice=typeof p.priceUsd==='string'||typeof p.priceUsd==='number'?Number(p.priceUsd):NaN;
 const c={address,name:String(p.baseToken.name||'Unknown'),symbol:String(p.baseToken.symbol||'?'),price:Number.isFinite(rawPrice)&&rawPrice>0?rawPrice:null,change5m:numeric(p.priceChange?.m5),change1h:numeric(p.priceChange?.h1),change24h:numeric(p.priceChange?.h24),liquidity:nonnegative(p.liquidity?.usd),volume:nonnegative(p.volume?.h24),marketCap:nonnegative(p.marketCap),buys:nonnegative(p.txns?.h1?.buys),sells:nonnegative(p.txns?.h1?.sells),ageHours:typeof p.pairCreatedAt==='number'&&Number.isFinite(p.pairCreatedAt)&&p.pairCreatedAt>0&&p.pairCreatedAt<=Date.now()?(Date.now()-p.pairCreatedAt)/3600000:null,pair:String(p.pairAddress),boosted:boosted||Number(p.boosts?.active)>0,links:[...(Array.isArray(p.info?.websites)?p.info.websites:[]).map((x:any)=>({label:'Project website · unverified',url:safeUrl(x?.url)})),...(Array.isArray(p.info?.socials)?p.info.socials:[]).map((x:any)=>({label:`${x?.type||'Social'} · project supplied`,url:safeUrl(x?.url)}))].filter((x:any)=>x.url)};
 const assessment=assess(c);
 if(c.price===null){assessment.risks.push('Price is unavailable.');assessment.verdict='High caution';}
 return {...c,...assessment};
}
