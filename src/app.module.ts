import { Module } from '@nestjs/common';
import { UserHandle } from './list/entities/user-handle.entity';
import { Verification } from './list/entities/verification.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from 'src/share/config.module';
import { ConfigService } from 'src/share/config.service';
import { UserListed } from './list/entities/user-listed.entity';
import { ListModule } from './list/list.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('db.host'),
        port: configService.get('db.port'),
        username: configService.get('db.user'),
        password: configService.get('db.password'),
        database: configService.get('db.name'),
        entities: [Verification, UserHandle, UserListed],
      }),
    }),
    ListModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
