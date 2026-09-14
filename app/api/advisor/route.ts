import {getChatGPTUser} from '@/app/chatgpt-auth';
import {getConfig,getPositions} from '@/lib/research-db';
import {sizePosition} from '@/lib/advisor';
import {fetchSnapshot,normalize,type Coin} from '@/lib/market';
export async function GET(request:Request){
 const user=await getChatGPTUser();
 if(!user)return Response.json({error:'Sign in required.'},{status:401});
 const params=new URL(request.url).searchParams,address=params.get('address')||'',pair=params.get('pair');
 const valid=(v:string)=>/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v);
 if(!valid(address)||(pair!==null&&!valid(pair)))return Response.json({error:'Invalid contract or pool address.'},{status:400});
 try{
  const [config,positions,snapshot]=await Promise.all([
   getConfig(user.userId),getPositions(user.userId),
   fetchSnapshot(pair?'https://api.dexscreener.com/latest/dex/pairs/solana/'+pair:'https://api.dexscreener.com/tokens/v1/solana/'+address,10000)
  ]);
  const pools=pair?snapshot.value?.pairs:snapshot.value;
  if(!Array.isArray(pools))throw Error('Invalid market response');
  const coins:Coin[]=pools.map((p:any)=>normalize(p)).filter((c:Coin|null)=>c?.address===address&&(!pair||c?.pair===pair));
  const coin=coins.sort((a,b)=>(b.liquidity||0)-(a.liquidity||0))[0]||null;
  return Response.json({coin,allocation:sizePosition(config,positions.reduce((n,p)=>n+p.amount,0),coin,false,positions.filter(p=>p.address===address).reduce((n,p)=>n+p.amount,0)),
   safety:'unverified',socialInfluence:'excluded',asOf:snapshot.retrievedAt,providerTimestampKnown:false,
   message:'Retrieval time is when this server received the provider response; the underlying quote age is unknown.'},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Evidence unavailable. No allocation suggested.'},{status:503});}
}
