import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest';
import {db,setupDatabase,clearDatabase} from './databaseHarness';
import {saveScenario,enqueueRun} from '@/server/services/simulationService';
import {processNextRun} from '@/server/workers/simulationWorker';
import {demoConfig} from '@/domain/manufacturing/scenarioPresets';
beforeAll(setupDatabase);beforeEach(clearDatabase);afterAll(()=>db.$disconnect());
it('queues and completes a persisted run without changing operational inventory',async()=>{const config=demoConfig();config.durationMonths=1;config.dailyDemand=2;const scenario=await saveScenario(db,config);const run=await enqueueRun(db,scenario.id);expect(run.status).toBe('QUEUED');await processNextRun(db);const completed=await db.simulationRun.findUniqueOrThrow({where:{id:run.id}});expect(completed.status).toBe('COMPLETED');expect(await db.simulationEvent.count({where:{runId:run.id}})).toBeGreaterThan(100);expect(await db.inventoryEvent.count()).toBe(0);expect(await db.inventoryBalance.count()).toBe(0);expect(await processNextRun(db)).toBe(false);});
