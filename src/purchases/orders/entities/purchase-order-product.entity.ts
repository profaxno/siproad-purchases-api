import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Product } from "src/purchases/products/entities";
import { PurchaseOrder } from ".";

@Entity("pur_order_product")
export class PurchaseOrderProduct {
  
  @PrimaryGeneratedColumn()
  id: number;

  @Column('double')
  qty: number;

  @Column('varchar', { length: 100, nullable: true })
  comment: string;

  @Column('varchar', { length: 100 })
  name: string;

  @Column('varchar', { length: 50 })
  code: string;

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

  @ManyToOne(
    () => Product,
    (product) => product.purchaseOrderProduct,
    { eager: true }
  )
  product: Product;
}
