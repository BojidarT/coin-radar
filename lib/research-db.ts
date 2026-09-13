import {env} from 'cloudflare:workers';
import {defaultConfig,type RiskConfig,type Position} from './advisor';
export function db(){if(!env.DB)throw Error('Research storage is unavailable.');return env.DB;}
export async function getConfig(userId:string):Promise<RiskConfig>{const row=await db().prepare('SELECT config FROM research_accounts WHERE user_id = ?').bind(userId).first<{config:string}>();return row?{...defaultConfig,...JSON.parse(row.config)}:{...defaultConfig};}
export async function getPositions(userId:string):Promise<Position[]>{const rows=await db().prepare('SELECT data FROM research_positions WHERE user_id = ? AND closed_at IS NULL').bind(userId).all<{data:string}>();return rows.results.map(r=>JSON.parse(r.data));}
export async function acquireLock(id:string){const owner=crypto.randomUUID(),now=Date.now();const row=await db().prepare('INSERT INTO research_locks (id, owner, expires) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET owner = excluded.owner, expires = excluded.expires WHERE research_locks.expires < ? RETURNING owner').bind(id,owner,now+60000,now).first<{owner:string}>();return row?.owner===owner?owner:null;}
export async function releaseLock(id:string,owner:string){await db().prepare('DELETE FROM research_locks WHERE id = ? AND owner = ?').bind(id,owner).run();}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');return !!origin&&origin===new URL(request.url).origin;}
