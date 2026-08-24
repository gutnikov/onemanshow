import { hc } from 'hono/client';
import type { AppRoutes } from '../../../api/routes';

/** Same-origin: the API and these assets are served by one process. */
export const api = hc<AppRoutes>('/');
