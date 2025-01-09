import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Verification {
  @PrimaryGeneratedColumn('increment')
  id?: number;

  @Column()
  fid: number;

  @Column()
  type: string; // 'ETH' or 'SOL'

  @Column()
  address: string;

  @CreateDateColumn()
  createdAt: Date;
}
