import { hrHandler } from '../../../../lib/hrActions.js';
export const config = { api: { bodyParser: { sizeLimit: '32kb' } } };
export default hrHandler('send-jd');
