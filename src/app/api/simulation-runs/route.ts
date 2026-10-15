import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {handle,page,readBody} from '@/server/http/responses';
import {enqueueRun} from '@/server/services/simulationService';
export const dynamic='force-dynamic';
export function GET(request:Request){return handle(request,async()=>{const {limit,offset}=page(request);return getDb().simulationRun.findMany({take:limit,skip:offset,orderBy:{createdAt:'desc'},select:{id:true,status:true,createdAt:true,simulatedStart:true,simulatedEnd:true,inputHash:true,engineVersion:true,scenario:{select:{name:true,datasetKind:true}}}});});}
export function POST(request:Request){return handle(request,async()=>{const {scenarioId}=z.object({scenarioId:z.string().uuid()}).strict().parse(await readBody(request));return enqueueRun(getDb(),scenarioId);},202);}
