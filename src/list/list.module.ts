import { Module } from '@nestjs/common';
import { UserHandle } from './entities/user-handle.entity';
import { Verification } from './entities/verification.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from 'src/share/config.module';
import { ListService } from './list.service';
import { ScheduleModule } from '@nestjs/schedule';
import { LastProcessed } from './entities/last-proccesed.entity';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    TypeOrmModule.forFeature([Verification, UserHandle, LastProcessed]),
    ConfigModule,
    ScheduleModule,
    HttpModule,
  ],
  controllers: [],
  providers: [ListService],
  exports: [ListService],
})
export class ListModule {}
