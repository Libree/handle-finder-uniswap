import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Verification } from './entities/verification.entity';
import { UserHandle } from './entities/user-handle.entity';
import { MoreThan, Repository } from 'typeorm';
import { UserListed } from './entities/user-listed.entity';
import { Protocol } from 'src/common/types';
import { ConfigService } from 'src/share/config.service';
import { firstValueFrom } from 'rxjs';
import { sleep } from 'src/common/helpers';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ListService implements OnModuleInit {
  private readonly logger = new Logger(ListService.name);
  private isFetching = false;
  constructor(
    @InjectRepository(Verification)
    private readonly verificationRepository: Repository<Verification>,
    @InjectRepository(UserHandle)
    private readonly userHandleRepository: Repository<UserHandle>,
    @InjectRepository(UserListed)
    private readonly userListedRepository: Repository<UserListed>,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async onModuleInit() {
    this.logger.log('ListService initialized');

    this.updateLists();
  }

  async fetchAndSaveUserLensList(
    url: string,
    apiKey: string,
    list: string,
  ): Promise<void> {
    let lensUsers: UserHandle[] = [] as UserHandle[];

    this.logger.log('Fetching and saving users from Lens');

    const lastListed = await this.userListedRepository.findOne({
      where: { protocol: Protocol.Lens },
    });


    do {
      try {
        lensUsers = await this.userHandleRepository.find({
          where: { profileId: MoreThan(lastListed?.profileId || '0x0') },
          take: 100,
          order: { profileId: 'ASC' },
        });


        const result = await firstValueFrom(this.httpService.patch(
            `${url}/lists/${list}`,
            {
              addItems: lensUsers.map((user) => user.ownedBy),
            },
            {
              headers: {
                'x-api-Key': apiKey,
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
            },
          ));

        await this.userListedRepository.save({
          userId: lensUsers[lensUsers.length - 1].id,
          protocol: Protocol.Lens,
          updatedAt: new Date(),
        });
      } catch (error) {
        this.logger.error(
          `Error fetching and saving users from Lens: ${error.message}`,
        );
        await sleep(10000);
      }
    } while (lensUsers.length);
  }

  async fetchAndSaveUserFarcasterList(
    url: string,
    apiKey: string,
    list: string,
  ): Promise<void> {
    let farcasterUser: Verification[] = [] as Verification[];

    const lastListed = await this.userListedRepository.findOne({
      where: { protocol: Protocol.Farcaster },
    });

    do {
      try {
        farcasterUser = await this.verificationRepository.find({
          where: { fid: MoreThan(lastListed?.userId || 0) },
          take: 100,
          order: { id: 'ASC' },
        });

        await firstValueFrom(
          this.httpService.post(
            `${url}/lists`,
            {
              items: farcasterUser.map((user) => user.address),
              key: list,
            },
            {
              headers: {
                'x-api-Key': apiKey,
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
            },
          ),
        );

        await this.userListedRepository.save({
          userId: farcasterUser.length[farcasterUser.length - 1].id,
          protocol: Protocol.Lens,
          updatedAt: new Date(),
        });
      } catch (error) {
        this.logger.error(
          `Error fetching and saving users from Farcaster: ${error.message}`,
        );
        await sleep(10000);
      }
    } while (farcasterUser.length);
  }

  @Cron(CronExpression.EVERY_DAY_AT_NOON)
  async updateLists() {
    if (this.isFetching) {
      this.logger.log('Already fetching lists, skipping...');
      return;
    }

    this.isFetching = true;
    const apiKey = this.configService.get<string>('keyNode.apiKey');
    const url = this.configService.get<string>('keyNode.url');

    await this.fetchAndSaveUserLensList(url, apiKey, 'handle-finder');
    await this.fetchAndSaveUserFarcasterList(url, apiKey, 'handle-finder');
    this.isFetching = false;
  }
}
