import {getDb} from '@/server/db/client';
import {handle,page,readBody} from '@/server/http/responses';
import {saveScenario} from '@/server/services/simulationService';
export const dynamic='force-dynamic';
export function GET(request:Request){return handle(request,async()=>{const {limit,offset}=page(request);return getDb().simulationScenario.findMany({take:limit,skip:offset,orderBy:{createdAt:'desc'}});});}
export function POST(request:Request){return handle(request,async()=>saveScenario(getDb(),await readBody(request)),201);}
