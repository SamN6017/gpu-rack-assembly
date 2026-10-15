import {it,expect} from 'vitest';
import {demoConfig} from '@/domain/manufacturing/scenarioPresets';
import {ManufacturingEngine} from '@/simulation/core/engine';
import {runAnalytics} from '@/analytics/runAnalytics';
import {reportSections,csvReport,safeCell} from '@/reports/reportModel';
import {excelReport,pdfReport} from '@/reports/exports';
import ExcelJS from 'exceljs';
it('reconciles monthly production, stock, reports and spreadsheet escaping',async()=>{const result=new ManufacturingEngine(demoConfig()).runToCompletion();const analytics=runAnalytics(result);expect(Object.values(analytics.monthly).reduce((a,b)=>a+b,0)).toBe(analytics.completed);for(const m of analytics.materials)expect(m.opening-m.consumed).toBeCloseTo(m.closing);expect(safeCell('=HYPERLINK("bad")')).toMatch(/^'/);const sections=reportSections({name:'Test',runId:'test',start:result.config.startDate,end:new Date(result.end).toISOString(),engineVersion:result.engineVersion,inputHash:'hash',config:result.config,analytics});expect(csvReport(sections)).toContain('SIMULATED RESULTS');const xlsx=await excelReport(sections);const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(xlsx as unknown as Parameters<typeof workbook.xlsx.load>[0]);expect(workbook.worksheets).toHaveLength(sections.length);const pdf=await pdfReport(sections);expect(Buffer.from(pdf).subarray(0,5).toString()).toBe('%PDF-');});
