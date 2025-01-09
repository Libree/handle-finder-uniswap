import { Logger } from '@nestjs/common';
import * as Joi from 'joi';
import { get as loGet, set as loSet } from 'lodash';
import { Constants } from './constants';

export interface EnvConfig {
  [key: string]: string | EnvConfig | undefined;
}

const DOTENV_SCHEMA = Joi.object({
  server: Joi.object({
    port: Joi.number().default(3120),
    executionMode: Joi.string().default('server'),
  }).default({
    port: 3500,
  }),
  db: Joi.object({
    host: Joi.string().default('localhost'),
    port: Joi.number().default(5432),
    user: Joi.string().required(),
    password: Joi.string().required(),
    name: Joi.string().required(),
    logging: Joi.boolean().default(false),
    logger: Joi.string().default('advanced-console'),
    synchronize: Joi.boolean().default(false),
    ssl: Joi.boolean().default(false),
  }),
  keyNode: Joi.object({
    url: Joi.string().required(),
    apiKey: Joi.string().required(),
  }),
});

type DotenvSchemaKeys =
  | 'server.port'
  | 'server.executionMode'
  | 'db.host'
  | 'db.port'
  | 'db.user'
  | 'db.password'
  | 'db.name'
  | 'db.logging'
  | 'db.logger'
  | 'db.synchronize'
  | 'db.ssl'
  | 'keyNode.url'
  | 'keyNode.apiKey';

export class ConfigService {
  private readonly envConfig: EnvConfig;
  private readonly logger = new Logger(ConfigService.name);

  constructor() {
    this.envConfig = this.validateInput(Constants);
  }

  get<T>(path: DotenvSchemaKeys): T | undefined {
    return loGet(this.envConfig, path) as unknown as T | undefined;
  }

  set(path: DotenvSchemaKeys, value: any) {
    loSet(this.envConfig, path, value);
  }

  private validateInput(envConfig: EnvConfig): EnvConfig {
    const { error, value: validatedEnvConfig } = DOTENV_SCHEMA.validate(
      envConfig,
      {
        allowUnknown: true,
        stripUnknown: true,
      },
    );
    if (error) {
      this.logger.error(
        'Missing configuration please provide followed variable!\n\n',
        'ConfigService',
      );
      this.logger.error(error.message, 'ConfigService');
      process.exit(2);
    }
    return validatedEnvConfig as EnvConfig;
  }
}
