import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { connect } from '../db/client';
import { createRoutes } from './routes';

const connection = connect();

// One deployable unit: the same process answers the API and serves the built
// frontend, so exactly one image carries the whole application.
const app = new Hono()
  .route('/', createRoutes(connection))
  .use('/*', serveStatic({ root: './web/dist' }))
  .get('*', serveStatic({ path: './web/dist/index.html' }));

const port = Number(process.env['PORT'] ?? 3000);
serve({ fetch: app.fetch, port });
console.log(`listening on ${port}`);
