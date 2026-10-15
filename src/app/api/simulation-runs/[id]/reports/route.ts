import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {authorize,json} from '@/server/http/responses';
import {DomainError} from '@/server/services/transaction';
import {simulationConfigSchema} from '@/simulation/core/types';
import {RunAnalytics} from '@/analytics/runAnalytics';
import {reportSections,csvReport} from '@/reports/reportModel';
import {excelReport,pdfReport} from '@/reports/exports';
export const runtime='nodejs';
export async function GET(request:Request,c:{params:Promise<{id:string}>}){try{authorize(request);const id=z.string().uuid().parse((await c.params).id);const format=z.enum(['csv','xlsx','pdf']).parse(new URL(request.url).searchParams.get('format'));const run=await getDb().simulationRun.findUniqueOrThrow({where:{id},include:{scenario:{select:{name:true}}}});if(run.status!=='COMPLETED')throw new DomainError('RUN_INCOMPLETE','Reports require a completed run');const config=simulationConfigSchema.parse(run.inputSnapshotJson);const summary=run.summaryJson as unknown as {analytics:RunAnalytics};const sections=reportSections({name:run.scenario.name,runId:id,start:run.simulatedStart.toISOString(),end:run.simulatedEnd.toISOString(),engineVersion:run.engineVersion,inputHash:run.inputHash,config,analytics:summary.analytics});const bytes=format==='csv'?new TextEncoder().encode(csvReport(sections)):format==='xlsx'?await excelReport(sections):await pdfReport(sections);return new Response(bytes as BodyInit,{headers:{'content-type':format==='csv'?'text/csv; charset=utf-8':format==='xlsx'?'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'application/pdf','content-disposition':`attachment; filename="simulation-${id}.${format}"`,'cache-control':'no-store'}});}catch(e){if(e instanceof DomainError)return json({error:e.code,message:e.message},e.status);if(e instanceof z.ZodError)return json({error:'VALIDATION'},400);return json({error:'REPORT_FAILED'},500);}}
