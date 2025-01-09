import 'dotenv/config';

export const Constants = {
  server: {
    port: process.env.PORT,
    executionMode: process.env.EXECUTION_MODE,
  },
  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
    logging: process.env.DB_LOGGING,
    logger: process.env.DB_LOGGER,
    synchronize: process.env.DB_SYNCHRONIZE,
    ssl: process.env.DB_SSL,
  },
  handlerFinderBackend: {
    url: process.env.HANDLER_FINDER_BACKEND_URL,
  },
  keyNode: {
    url: process.env.KEY_NODE_URL,
    apiKey: process.env.KEY_NODE_API_KEY,
  },
};
