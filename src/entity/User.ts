import {Column, Entity, OneToMany, PrimaryColumn} from "typeorm";
import {LdpRule} from "./LdpRule";

@Entity()
export class User {
    @PrimaryColumn()
    id: number;

    @Column()
    chatId: number;

    @Column()
    oms: string;

    @Column()
    birthDate: string;

    @OneToMany(() => LdpRule, (rule) => rule.user, {eager: true})
    rules: LdpRule[];
}