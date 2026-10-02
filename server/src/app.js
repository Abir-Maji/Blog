const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const env = require('./config/env');
const passport = require('./config/passport');
const v1Routes = require('./routes/v1');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const CLIENT_DIST = path.join(__dirname, '..', '..', 'client', 'dist');

function createApp() {
  const app = express();

  // Needed for correct client IPs (rate limiting) behind a reverse proxy.
  if (env.isProd) app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));
  app.use(passport.initialize());

  app.use('/api/v1', v1Routes);
  app.use('/api', notFound);

  // In production the API also serves the built React app, so the client, the
  // API and Socket.io share one origin (no CORS, first-party cookies).
  if (env.isProd && fs.existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST));
    // Client-side routes such as /posts/my-slug all load the single page.
    app.use((req, res, next) => {
      if (req.method !== 'GET') return next();
      res.sendFile(path.join(CLIENT_DIST, 'index.html'));
    });
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
