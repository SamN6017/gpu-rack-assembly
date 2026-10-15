import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {handle} from '@/server/http/responses';
export const dynamic='force-dynamic';
export function GET(request:Request,c:{params:Promise<{id:string}>}){return handle(request,async()=>{const query=z.object({after:z.coerce.number().int().min(0).default(0),limit:z.coerce.number().int().min(1).max(1000).default(100)}).strict().parse(Object.fromEntries(new URL(request.url).searchParams));return getDb().simulationEvent.findMany({where:{runId:z.string().uuid().parse((await c.params).id),sequenceNumber:{gt:query.after}},take:query.limit,orderBy:{sequenceNumber:'asc'}});});}
