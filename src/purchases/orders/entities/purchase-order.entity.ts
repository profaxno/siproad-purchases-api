import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { PurchaseType, PurchaseOrderProduct } from ".";
import { Company } from "src/purchases/companies/entities/company.entity";
import { User } from "src/purchases/users/entities/user.entity";

@Entity("pur_order")
export class PurchaseOrder {
  
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', unsigned: true })
  code: number;
  
  @Column('varchar', { length: 50, nullable: true })
  providerName: string;

  @Column('varchar', { length: 50, nullable: true })
  providerIdDoc: string;

  @Column('varchar', { length: 50, nullable: true })
  providerEmail: string;

  @Column('varchar', { length: 50, nullable: true })
  providerPhone: string;

  @Column('varchar', { length: 150, nullable: true })
  providerAddress: string;

  @Column('varchar', { length: 250, nullable: true })
  comment: string;

  @Column('double', { default: 0 })
  amount: number;

  @Column('varchar', { length: 100 })
  documentTypeId: string;

  @Column('varchar', { length: 50, nullable: true })
  documentNumber: string;

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
    (company) => company.purchaseOrder,
    { eager: true }
  )
  company: Company;

  @ManyToOne(
    () => User,
    (user) => user.purchaseOrder,
    { eager: true }
  )
  user: User;

  @OneToMany(
    () => PurchaseOrderProduct,
    (purchaseOrderProduct) => purchaseOrderProduct.purchaseOrder,
    { eager: true }
  )
  purchaseOrderProduct: PurchaseOrderProduct[];

  @ManyToOne(
    () => PurchaseType,
    (purchaseType) => purchaseType.purchaseOrder,
    { eager: true }
  )
  purchaseType: PurchaseType;

  // @ManyToOne(
  //   () => DocumentType,
  //   (documentType) => documentType.purchaseOrder,
  //   { eager: true }
  // )
  // documentType: DocumentType;

}
