import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { PurchaseOrder } from ".";

@Entity("pur_order_product")
export class PurchaseOrderProduct {
  
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unsigned: true })
  purchaseOrderCode: number;

  @Column('varchar', { length: 100 })
  productId: string;

  @Column('varchar', { length: 100 })
  name: string;

  @Column('varchar', { length: 50 })
  code: string;

  @Column('double')
  qty: number;

  @Column('varchar', { length: 100, nullable: true })
  comment: string;

  @Column('double')
  cost: number;

  @Column('double')
  amount: number;

  @Column('tinyint', { unsigned: true })
  status: number;

  @ManyToOne(
    () => PurchaseOrder,
    (purchaseOrder) => purchaseOrder.purchaseOrderProduct
  )
  purchaseOrder: PurchaseOrder;

}
