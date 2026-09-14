import {getChatGPTUser} from '@/app/chatgpt-auth';
import {db,acquireLock,releaseLock,sameOrigin} from '@/lib/research-db';
import {evaluatePosition,type Position} from '@/lib/advisor';
import {advanceAlerts,finitePositive} from '@/lib/trade-controls.mjs';
import {fetchSnapshot,numeric} from '@/lib/market';

export async function POST(request:Request){
 const user=await getChatGPTUser();
 if(!user)return Response.json({error:'Sign in required.'},{status:401});
 if(!sameOrigin(request))return Response.json({error:'Same-origin request required.'},{status:403});
 let lock:string|null=null;const lockId='monitor:'+user.userId;
 try{
  lock=await acquireLock(lockId);
  if(!lock)return Response.json({status:'busy',newEvents:[]},{headers:{'Cache-Control':'no-store'}});
  const rows=await db().prepare('SELECT data, revision FROM research_positions WHERE user_id = ? AND closed_at IS NULL')
   .bind(user.userId).all<{data:string;revision:number}>();
  const records=rows.results.map(row=>({position:JSON.parse(row.data) as Position,revision:row.revision}));
  if(!records.length)return Response.json({status:'idle',newEvents:[],activeEvents:[],asOf:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});
  let pools:any[]=[],retrievedAt:string|null=null,providerAvailable=true;
  try{
   const snapshot=await fetchSnapshot('https://api.dexscreener.com/latest/dex/pairs/solana/'+[...new Set(records.map(r=>r.position.pair))].join(','),10000);
   if(!Array.isArray(snapshot.value?.pairs))throw Error('Malformed provider response');
   pools=snapshot.value.pairs;retrievedAt=snapshot.retrievedAt;
  }catch{providerAvailable=false;}
  const now=new Date().toISOString(),newEvents:any[]=[],activeEvents:any[]=[];
  let unavailable=0,conflicts=0;
  for(const {position:p,revision} of records){
   const pool=pools.find(q=>q?.chainId==='solana'&&q.pairAddress===p.pair&&q.baseToken?.address===p.address);
   const rawPrice=typeof pool?.priceUsd==='string'||typeof pool?.priceUsd==='number'?Number(pool.priceUsd):null;
   const price=finitePositive(rawPrice)?rawPrice:null,liquidity=numeric(pool?.liquidity?.usd);
   if(price===null||liquidity===null||liquidity<0)unavailable++;
   const result=evaluatePosition(p,price,liquidity),next=advanceAlerts(p.alertState,result.events);
   const updated={...p,peakPrice:result.peak,lastPrice:price,lastCheckedAt:now,lastSnapshotAt:price!==null?retrievedAt:null,alertState:next.state};
   const triggered=next.triggered.map(e=>({...e,id:p.id+':'+e.kind+':episode:'+e.episode,positionId:p.id,address:p.address,symbol:p.symbol,time:now,price}));
   // Both the alert records and state transition commit together, conditional on the
   // position's revision. Closing or editing concurrently prevents stale writes.
   const statements=triggered.map(event=>db().prepare(
    'INSERT OR IGNORE INTO research_events (id, user_id, position_id, kind, data, created_at) SELECT ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM research_positions WHERE id = ? AND user_id = ? AND closed_at IS NULL AND revision = ?)'
   ).bind(event.id,user.userId,p.id,event.kind,JSON.stringify(event),now,p.id,user.userId,revision));
   statements.push(db().prepare('UPDATE research_positions SET data = ?, revision = revision + 1 WHERE id = ? AND user_id = ? AND closed_at IS NULL AND revision = ?')
    .bind(JSON.stringify(updated),p.id,user.userId,revision));
   const results=await db().batch(statements);
   if(!results[results.length-1].meta.changes){conflicts++;continue;}
   for(let i=0;i<triggered.length;i++)if(results[i].meta.changes)newEvents.push(triggered[i]);
   for(const e of result.events)activeEvents.push({...e,id:p.id+':active:'+e.kind,positionId:p.id,address:p.address,symbol:p.symbol,time:now,price});
  }
  return Response.json({status:!providerAvailable?'provider_unavailable':unavailable||conflicts?'partial':'checked',
   asOf:now,retrievedAt,newEvents,activeEvents,unavailable,conflicts,monitoring:'browser_open_only',providerTimestampKnown:false,
   message:'Checks use retrieved provider snapshots, not executable quotes. Underlying quote age and notification delivery are not guaranteed.'},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Position monitoring failed. Check positions directly in Phantom.'},{status:503});}
 finally{if(lock)await releaseLock(lockId,lock).catch(()=>{});}
}
