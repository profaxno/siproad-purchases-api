import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Company } from "src/purchases/companies/entities/company.entity";
import { PurchaseOrder } from "../../orders/entities/purchase-order.entity";

@Entity("pur_document_type")
export class DocumentType {
  
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 50 })
  name: string;

  @Column('boolean', { default: true })
  active: boolean

  @ManyToOne(
    () => Company,
    (company) => company.product,
    { eager: true }
  )
  company: Company;

  @OneToMany(
    () => PurchaseOrder,
    (purchaseOrder) => purchaseOrder.purchaseType
  )
  purchaseOrder: PurchaseOrder;

}
