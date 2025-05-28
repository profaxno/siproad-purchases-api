import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Company, User, PurchaseOrderProduct } from ".";

@Entity("exp_order")
export class PurchaseOrder {
  
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 50 })
  code: string;
  
  @Column('varchar', { length: 50, nullable: true })
  providerIdDoc: string;

  @Column('varchar', { length: 50, nullable: true })
  providerName: string;

  @Column('varchar', { length: 50, nullable: true })
  providerEmail: string;

  @Column('varchar', { length: 50, nullable: true })
  providerPhone: string;

  @Column('varchar', { length: 150, nullable: true })
  providerAddress: string;

  @Column('varchar', { length: 250, nullable: true })
  comment: string;

  @Column('double', { default: 0 })
  discount: number;

  @Column('double', { default: 0 })
  discountPct: number;

  @Column('tinyint', { default: 1, unsigned: true })
  status: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @Column('boolean', { default: true })
  active: boolean

  @ManyToOne(
    () => Company,
    (company) => company.product,
    { eager: true }
  )
  company: Company;

  @ManyToOne(
    () => User,
    (user) => user.order,
    { eager: true }
  )
  user: User;

  @OneToMany(
    () => PurchaseOrderProduct,
    (purchaseOrderProduct) => purchaseOrderProduct.order,
    { eager: true }
  )
  purchaseOrderProduct: PurchaseOrderProduct[];

}
