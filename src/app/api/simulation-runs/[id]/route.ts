import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {handle,readBody} from '@/server/http/responses';
import {controlRun} from '@/server/services/simulationService';
export const dynamic='force-dynamic';
export function GET(request:Request,c:{params:Promise<{id:string}>}){return handle(request,async()=>getDb().simulationRun.findUniqueOrThrow({where:{id:z.string().uuid().parse((await c.params).id)},include:{scenario:{select:{name:true,datasetKind:true}}}}));}
export function POST(request:Request,c:{params:Promise<{id:string}>}){return handle(request,async()=>{const {action}=z.object({action:z.enum(['pause','resume','cancel'])}).strict().parse(await readBody(request));return controlRun(getDb(),z.string().uuid().parse((await c.params).id),action);});}
