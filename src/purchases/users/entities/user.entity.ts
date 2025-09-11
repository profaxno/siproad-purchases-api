import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Company } from "src/purchases/companies/entities/company.entity";
import { PurchaseOrder } from "src/purchases/orders/entities";


@Entity("pur_user")
export class User {
  
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 50 })
  name: string;

  @Column('varchar', { length: 50 })
  email: string;

  // @Column('varchar', { length: 255 })
  // password: string;

  @Column('tinyint', { unsigned: true })
  status: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @Column('boolean', { default: true })
  active: boolean;

  @ManyToOne(
    () => Company,
    (company) => company.user,
    { eager: true }
  )
  company: Company;

  @OneToMany(
    () => PurchaseOrder,
    (purchaseOrder) => purchaseOrder.user
  )
  purchaseOrder: PurchaseOrder;

}
