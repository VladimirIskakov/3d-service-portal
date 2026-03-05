import { createApp } from './app/createApp.js';
import { assertAppConfig, loadAppConfig } from './config/env.js';

const config = loadAppConfig();
assertAppConfig(config);

const app = await createApp(config);

const start = async () => {
  try {
    await app.listen({
      host: config.host,
      port: config.port,
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();

