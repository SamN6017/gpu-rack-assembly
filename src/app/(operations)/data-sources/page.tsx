import {ImportWizard} from '@/components/import/ImportWizard';
import {AssumptionReview} from '@/components/import/AssumptionReview';
export default function DataSources(){return <><div className="eyebrow">SOURCE MANAGEMENT</div><h1>Data sources</h1><p>Bring source data into the workspace with a reviewable audit trail.</p><div className="warning">The supplied demonstration package is synthetic. Actual-data and screenshot-transcription templates contain no records.</div><ImportWizard/><AssumptionReview/></>;}
