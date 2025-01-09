import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './share/config.service';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = app.get<ConfigService>(ConfigService).get<number>('server.port');
  const globalPrefix = 'handle-finder-uniswap';
  app.setGlobalPrefix(globalPrefix);
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors();

  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
