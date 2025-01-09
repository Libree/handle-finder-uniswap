import { Entity, PrimaryColumn, Column, Generated } from 'typeorm';

@Entity()
export class UserHandle {
  @PrimaryColumn()
  handle: string;

  @PrimaryColumn()
  protocol: number;

  @Column()
  ownedBy: string;

  @Column()
  updatedAt: Date;

  @Column()
  profileId: string;

  @Column()
  @Generated('increment')
  id: number;
}
