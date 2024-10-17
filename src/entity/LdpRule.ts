import {Column, Entity, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {User} from "./User";

@Entity()
export class LdpRule {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    referralId: number;

    @Column()
    referralName: string;

    @Column()
    locationCriteria: string;

    @Column()
    timeRange: string;

    @Column()
    initTime: string;

    @ManyToOne(() => User, (user) => user.rules)
    user: User;
}