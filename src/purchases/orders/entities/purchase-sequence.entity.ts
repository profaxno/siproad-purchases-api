import { Column, Entity, PrimaryColumn } from "typeorm";


@Entity("pur_purchase_sequence")
export class PurchaseSequence {

  @PrimaryColumn('uuid')
  companyId: string;

  @Column({ type: 'int', unsigned: true })
  lastCode: number;

}