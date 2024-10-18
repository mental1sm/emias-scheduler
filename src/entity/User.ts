import {Column, Entity, OneToMany, PrimaryColumn} from "typeorm";
import {EmiasRule} from "./EmiasRule";

@Entity()
export class User {
    @PrimaryColumn({type: 'integer'})
    id: number;

    @Column({type: 'integer'})
    chatId: number;

    @Column({type: 'text'})
    oms: string;

    @Column({type: 'text'})
    birthDate: string;

    @OneToMany(() => EmiasRule, (rule) => rule.user, {eager: true})
    rules: EmiasRule[];
}