import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Company } from "src/purchases/companies/entities/company.entity";
import { Product } from "./product.entity";

@Entity("pur_product_category")
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
