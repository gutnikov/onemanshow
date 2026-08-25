import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { connect } from '../db/client';
import { startObservability, reportError } from './observability';
import { createRoutes } from './routes';

startObservability();

const connection = connect();

// One deployable unit: the same process answers the API and serves the built
// frontend, so exactly one image carries the whole application.
const app = new Hono()
  .route('/', createRoutes(connection))
  .use('/*', serveStatic({ root: './web/dist' }))
  .get('*', serveStatic({ path: './web/dist/index.html' }));

app.onError((error, c) => {
  reportError(error);
  console.error(error);
  return c.json({ error: 'internal' }, 500);
});

const port = Number(process.env['PORT'] ?? 3000);
serve({ fetch: app.fetch, port });
console.log(`listening on ${port}`);
