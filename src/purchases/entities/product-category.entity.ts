import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Company, Product } from ".";

@Entity("sal_product_category")
export class ProductCategory {
  
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
    () => Product,
    (product) => product.productCategory
  )
  product: Product;

}
