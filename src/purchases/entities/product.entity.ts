import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Company, ProductCategory, PurchaseOrderProduct } from ".";

@Entity("exp_product")
export class Product {
  
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 100 })
  name: string;

  @Column('varchar', { length: 50 })
  code: string;

  @Column('varchar', { length: 100, nullable: true })
  description: string;

  @Column('varchar', { length: 5 })
  unit: string;

  @Column('double')
  cost: number;

  @Column('double')
  price: number;

  @Column('tinyint', { default: 1, unsigned: true })
  type: number;

  @Column('boolean', { default: false })
  enable4Sale: boolean

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
    () => ProductCategory,
    (productCategory) => productCategory.product,
    { eager: true }
  )
  productCategory: ProductCategory;

  @OneToMany(
    () => PurchaseOrderProduct,
    (purchaseOrderProduct) => purchaseOrderProduct.product
  )
  purchaseOrderProduct: PurchaseOrderProduct[];
}