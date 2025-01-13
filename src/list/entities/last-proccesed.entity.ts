import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('last_processed')
export class LastProcessed {
  @PrimaryColumn()
  loader: string;

  @Column({ type: 'timestamp' })
  timestamp: Date;
}
