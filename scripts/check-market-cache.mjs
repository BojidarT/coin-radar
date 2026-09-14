import assert from 'node:assert/strict';
import {fetchSnapshot,normalize} from '../lib/market.ts';
const originalFetch=globalThis.fetch;
let calls=0;
try {
 globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>({price:1})};};
 const first=await fetchSnapshot('https://cache-test.invalid/pool',60000);
 const second=await fetchSnapshot('https://cache-test.invalid/pool',60000);
 assert.equal(calls,1,'Repeated read uses one cached response');
 assert.equal(second.retrievedAt,first.retrievedAt,'Cache hits must retain retrieval time');
 assert.equal(second.value,first.value,'Cache hits use the same provider snapshot');
 await fetchSnapshot('https://cache-test.invalid/uncached',0);
 await fetchSnapshot('https://cache-test.invalid/uncached',0);
 assert.equal(calls,3,'Zero TTL refetches');
 globalThis.fetch=async()=>({ok:false,status:429});
 await assert.rejects(()=>fetchSnapshot('https://cache-test.invalid/failure'),/429/);
 globalThis.fetch=async()=>({ok:true,json:async()=>({recovered:true})});
 assert.equal((await fetchSnapshot('https://cache-test.invalid/failure')).value.recovered,true,'Failed response must not be cached');
 const pool={chainId:'solana',baseToken:{address:'mint',symbol:'TEST'},pairAddress:'pair',priceUsd:'1',liquidity:{usd:100000},volume:{h24:200000},txns:{h1:{buys:30,sells:10}},priceChange:{h1:10,h24:5},pairCreatedAt:Date.now()-172800000};
 assert.equal(normalize(pool).verdict,'Research candidate');
 for(const priceUsd of [null,undefined,false,true,'',0,-1,'Infinity']){
  const coin=normalize({...pool,priceUsd});
  assert.equal(coin.price,null,'Invalid prices must not turn into real quotes');
  assert.equal(coin.verdict,'High caution','Missing price prevents candidate status');
 }
 for(const value of [null,undefined,{},'bad'])assert.equal(normalize(value),null);
 assert.equal(normalize({...pool,liquidity:{usd:-1}}).liquidity,null);
 assert.equal(normalize({...pool,pairCreatedAt:Date.now()+100000}).ageHours,null);
 assert.equal(normalize({...pool,info:{websites:'bad',socials:{}}}).links.length,0);
 console.log('PASS: snapshot cache, provider failure and market normalization checks');
} finally { globalThis.fetch=originalFetch; }
