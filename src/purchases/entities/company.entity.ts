import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Product, ProductCategory, User } from ".";

@Entity("sal_company")
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
    () => Product,
    (product) => product.company
  )
  product: Product;

  @OneToMany(
    () => ProductCategory,
    (productCategory) => productCategory.company
  )
  productCategory: ProductCategory;

  @OneToMany(
    () => User,
    (user) => user.company
  )
  user: User;
}
