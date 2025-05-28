import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { PurchaseOrder, Product } from ".";

@Entity("exp_order_product")
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
  price: number;

  @Column('double', { default: 0 })
  discount: number;

  @Column('double', { default: 0 })
  discountPct: number;

  @Column('tinyint', { unsigned: true })
  status: number;

  @ManyToOne(
    () => PurchaseOrder,
    (order) => order.purchaseOrderProduct
  )
  order: PurchaseOrder;

  @ManyToOne(
    () => Product,
    (product) => product.purchaseOrderProduct,
    { eager: true }
  )
  product: Product;
}
