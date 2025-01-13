import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Verification } from './entities/verification.entity';
import { UserHandle } from './entities/user-handle.entity';
import { MoreThan, MoreThanOrEqual, Repository } from 'typeorm';
import { LastProcessed } from './entities/last-proccesed.entity';
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
    @InjectRepository(LastProcessed)
    private readonly lastProcessedRepository: Repository<LastProcessed>,
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
    let timestamp: Date;

    this.logger.log('Fetching and saving users from Lens');

    const lastListed = await this.lastProcessedRepository.findOne({
      where: { loader: Protocol.Lens },
    });

    do {
      try {
        if (!lastListed?.timestamp) {
          const firstLensEntry = await this.userHandleRepository.find({
            order: {
              updatedAt: 'ASC',
            },
          });

          timestamp = firstLensEntry?.[0].updatedAt;
        }

        lensUsers = await this.userHandleRepository.find({
          where: {
            updatedAt: MoreThanOrEqual(lastListed?.timestamp || timestamp),
          },
          take: 100,
          order: { profileId: 'ASC' },
        });

        const result = await firstValueFrom(
          this.httpService.patch(
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
          ),
        );

        if (result.status === 200) {
          await this.lastProcessedRepository.save({
            loader: Protocol.Lens,
            timestamp: lensUsers[lensUsers.length - 1].updatedAt,
          });

          this.logger.log(
            `Saved ${lensUsers.length} users from Lens to list "${list}"`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error fetching and saving users from Lens: ${error.message}`,
        );
        await sleep(1000);
      }
    } while (lensUsers.length);
  }

  async fetchAndSaveUserFarcasterList(
    url: string,
    apiKey: string,
    list: string,
  ): Promise<void> {
    let farcasterUsers: Verification[] = [] as Verification[];
    let timestamp: Date;

    const lastListed = await this.lastProcessedRepository.findOne({
      where: { loader: Protocol.Farcaster },
    });

    do {
      try {
        if (!lastListed?.timestamp) {
          const firstFarcasterEntry = await this.verificationRepository.find({
            order: {
              createdAt: 'ASC',
            },
          });

          timestamp = firstFarcasterEntry?.[0].createdAt;
        }

        farcasterUsers = await this.verificationRepository.find({
          where: {
            createdAt: MoreThanOrEqual(lastListed?.timestamp || timestamp),
          },
          take: 100,
          order: { id: 'ASC' },
        });

        farcasterUsers = farcasterUsers.filter(
          (user) => user.address.length === 42,
        );

        const result = await firstValueFrom(
          this.httpService.post(
            `${url}/lists`,
            {
              items: farcasterUsers.map((user) => user.address),
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

        if (result.status === 200) {
          await this.lastProcessedRepository.save({
            timestamp: farcasterUsers[farcasterUsers.length - 1].createdAt,
            loader: Protocol.Farcaster,
          });

          this.logger.log(
            `Saved ${farcasterUsers.length} users from Farcaster to list "${list}"`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error fetching and saving users from Farcaster: ${error.message}`,
        );
        await sleep(1000);
      }
    } while (farcasterUsers.length);
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

    await Promise.all([
      this.fetchAndSaveUserLensList(url, apiKey, 'handle-finder'),
      this.fetchAndSaveUserFarcasterList(url, apiKey, 'handle-finder'),
    ]);

    this.isFetching = false;
  }
}
