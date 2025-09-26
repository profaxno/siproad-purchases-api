import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "src/purchases/users/entities/user.entity";
import { PurchaseOrder, PurchaseType } from "src/purchases/orders/entities";

@Entity("pur_company")
export class Company {
  
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 50, unique: true })
  name: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
  
  @Column('boolean', { default: true })
  active: boolean

  @OneToMany(
    () => User,
    (user) => user.company
  )
  user: User;

  // @OneToMany(
  //   () => Product,
  //   (product) => product.company
  // )
  // product: Product;

  // @OneToMany(
  //   () => ProductCategory,
  //   (productCategory) => productCategory.company
  // )
  // productCategory: ProductCategory;

  @OneToMany(
    () => PurchaseOrder,
    (purchaseOrder) => purchaseOrder.company
  )
  purchaseOrder: PurchaseOrder;

  @OneToMany(
    () => PurchaseType,
    (purchaseType) => purchaseType.company
  )
  purchaseType: PurchaseType;
  
  // @OneToMany(
  //   () => DocumentType,
  //   (documentType) => documentType.company
  // )
  // documentType: DocumentType;
}
