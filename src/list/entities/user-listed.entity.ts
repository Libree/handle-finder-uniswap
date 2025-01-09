import { Protocol } from 'src/common/types';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class UserListed {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({
    enum: [Protocol.Lens, Protocol.Farcaster],
  })
  protocol: Protocol;

  @Column({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'updated_at' })
  updatedAt: Date;
}
