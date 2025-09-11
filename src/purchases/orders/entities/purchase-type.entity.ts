import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Company } from "src/purchases/companies/entities/company.entity";
import { PurchaseOrder } from "./purchase-order.entity";

@Entity("pur_purchase_type")
export class PurchaseType {
  
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 50 })
  name: string;

  @Column('boolean', { default: true })
  active: boolean

  @ManyToOne(
    () => Company,
    (company) => company.purchaseType,
    { eager: true }
  )
  company: Company;

  @OneToMany(
    () => PurchaseOrder,
    (purchaseOrder) => purchaseOrder.purchaseType
  )
  purchaseOrder: PurchaseOrder;

}
