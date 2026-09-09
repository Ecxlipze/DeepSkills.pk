import { hrHandler } from '../../../lib/hrActions.js';
export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };
export default hrHandler('notify-admin');
