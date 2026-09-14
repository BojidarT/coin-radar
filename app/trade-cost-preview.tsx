'use client';
import {useState} from 'react';
import {exitScenario,finitePositive} from '@/lib/trade-controls.mjs';
const usd=(value:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value);
export default function TradeCostPreview({ceiling}:{ceiling:number}){
 const [amount,setAmount]=useState(''),[haircut,setHaircut]=useState(''),[fees,setFees]=useState('');
 const principal=amount===''?ceiling:Number(amount);
 const ready=finitePositive(principal)&&haircut!==''&&fees!=='';
 const scenario=(pct:number)=>ready?exitScenario(principal,pct,Number(haircut),Number(fees)):null;
 const flat=scenario(0);
 return <section className="panel" style={{marginTop:20}}>
  <div className="panel-head"><h2 style={{margin:0}}>Will costs eat the trade?</h2><span className="pill">What-if calculator</span></div>
  <div className="settings">
   <p className="muted" style={{fontSize:14}}>Small trades can lose money even when the price rises. Enter estimates from your wallet preview. This is a scenario, not a sell quote or a prediction.</p>
   <div className="research-fields">
    <label>Token principal · USD<input type="number" min="0.01" step="0.01" placeholder={String(ceiling)} value={amount} onChange={e=>setAmount(e.target.value)}/></label>
    <label>Assumed exit price impact / slippage · %<input type="number" min="0" max="99" step="0.1" placeholder="Enter an assumption" value={haircut} onChange={e=>setHaircut(e.target.value)}/></label>
    <label>Total extra entry + exit fees · USD<input type="number" min="0" step="0.01" placeholder="Enter an estimate" value={fees} onChange={e=>setFees(e.target.value)}/></label>
   </div>
   {principal>ceiling&&<p className="negative">This scenario exceeds your current per-token principal ceiling.</p>}
   {flat?<><div className="note caution"><strong>Break-even price rise: {flat.breakEvenPct.toFixed(2)}%</strong>Based only on your assumptions. Fees are deducted once from the result; principal excludes these extra fees.</div>
   <div className="table-wrap"><table style={{width:'100%',fontSize:14,marginTop:16}}><caption className="muted" style={{textAlign:'left',marginBottom:8}}>Hypothetical outcomes for {usd(principal)}</caption><thead><tr><th scope="col">Price move</th><th scope="col">Net gain / loss</th></tr></thead><tbody>{[-100,-20,0,20,50].map(pct=>{const result=scenario(pct);return <tr key={pct}><th scope="row" style={{padding:10}}>{pct>0?'+':''}{pct}%</th><td className={result&&result.pnl>=0?'positive':'negative'} style={{textAlign:'center'}}>{result?usd(result.pnl):'—'}</td></tr>;})}</tbody></table></div></>:<p className="muted">Enter a positive principal and valid cost assumptions to see outcomes.</p>}
   <p className="muted" style={{fontSize:13}}>Slippage tolerance is a maximum you permit, not a forecast of actual slippage. A route can disappear or fail entirely. This calculator does not verify token safety or change your allocation limit.</p>
  </div>
 </section>;
}
