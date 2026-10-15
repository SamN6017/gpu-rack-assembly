import {getDb} from '@/server/db/client';
import {handle,page,readBody} from '@/server/http/responses';
import {manufacturingEventSchema} from '@/integrations/events';
import {contentHash} from '@/server/services/contentHash';
import {serializable,DomainError} from '@/server/services/transaction';
export const dynamic='force-dynamic';
export function GET(request:Request){return handle(request,async()=>{const {limit,offset}=page(request);return getDb().manufacturingInboxEvent.findMany({take:limit,skip:offset,orderBy:[{sourceTimestamp:'desc'},{eventId:'asc'}]});});}
export function POST(request:Request){return handle(request,async()=>{const event=manufacturingEventSchema.parse(await readBody(request));if(event.datasetKind!=='ACTUAL'||/DEMO|SIMULATION/i.test(event.sourceSystem))throw new DomainError('SOURCE_KIND','Synthetic events cannot enter the actual-data inbox',400);const payloadHash=contentHash({...event,ingestionTimestamp:''});return serializable(getDb(),async tx=>{const prior=await tx.manufacturingInboxEvent.findUnique({where:{sourceSystem_eventId:{sourceSystem:event.sourceSystem,eventId:event.eventId}}});if(prior){if(prior.payloadHash!==payloadHash)throw new DomainError('EVENT_CONFLICT','Event ID reused with changed content');return prior;}return tx.manufacturingInboxEvent.create({data:{sourceSystem:event.sourceSystem,eventId:event.eventId,sourceTimestamp:new Date(event.sourceTimestamp),payloadHash,normalizedJson:{...event,ingestionTimestamp:new Date().toISOString()}}});});},201);}
