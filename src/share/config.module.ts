import { Module } from '@nestjs/common';
import { ConfigService } from './config.service';

@Module({
  controllers: [],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
