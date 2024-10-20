import {Column, Entity, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {User} from "./User";
import {RuleType} from "../types/BotSteps";

@Entity()
export class EmiasRule {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({type: 'integer', nullable: true})
    referralId?: number;

    @Column({type: 'text', nullable: true})
    targetName: string;

    @Column({type: 'text'})
    criteria: string;

    @Column({type: 'text'})
    timeRange: string;

    @Column({type: 'text'})
    initTime: string;

    @Column({type: 'text'})
    stopTime: string;

    @Column({type: 'integer'})
    pollInterval: number;

    @Column({type: 'text'})
    type: RuleType

    @Column({type: 'integer', nullable: true})
    specialityId?: number;

    @Column({type: 'text'})
    wantedStartDate: string;

    @Column({type: 'text', nullable: true})
    status: string;

    @Column({type: 'integer'})
    deletionFlag: boolean;

    @ManyToOne(() => User, (user) => user.rules, {lazy: true})
    user: User;
}