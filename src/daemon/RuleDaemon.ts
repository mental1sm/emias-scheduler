import { Repository } from "typeorm";
import { EmiasRule } from "../entity/EmiasRule";
import { EmiasClient } from "../client/EmiasClient";
import { AppointmentDto } from "./types/AppointmentDto";
import {AbstractMatchingRuleDaemon} from "./AbstractMatchingRuleDaemon";
import {Logger} from "./Logger";

export class RuleDaemon extends AbstractMatchingRuleDaemon {
    public finished: boolean = false;
    public succeed: boolean = false;
    public lastExecution: Date | null = null;
    public executionIntervalMs: number = 10000;

    constructor(private ruleRepository: Repository<EmiasRule>, rule: EmiasRule) {
        super(rule, EmiasClient.instance())
        this.executionIntervalMs = rule.pollInterval;
    }

    /**
     * Основной процесс выполнения правила
     */
    async execute(): Promise<void> {
        this.finished = false;
        this.roomMatches = [];
        this.user = await this.rule.user;

        await this.findRoomMatches();

        if (this.roomMatches.length > 0) {
            Logger.log("Комнаты найдены. Запускается поиск свободных слотов.");
            console.log(this.roomMatches);
            await this.processRoomMatches();
        } else {
            Logger.log("Не найдено комнат!");
        }

        this.finished = true;
    }

    /**
     * Обработка найденных соответствий комнат
     */
    private async processRoomMatches(): Promise<void> {
        for (const match of this.roomMatches) {
            if (this.succeed) break;
            const appointmentsDto = await this.findTimeMatches(match);
            await this.processAppointments(appointmentsDto);
        }
    }

    /**
     * Обработка найденных назначений (запись на прием)
     */
    private async processAppointments(appointmentsDto: AppointmentDto[]): Promise<void> {
        for (const appointmentDto of appointmentsDto) {
            if (this.succeed) break;
            await this.createAppointment(appointmentDto);
        }
    }

    /**
     * Создание записи на прием
     */
    private async createAppointment(appointmentDto: AppointmentDto): Promise<void> {
        try {
            const appointmentResponse = await this.emiasClient.createAppointment(this.user, appointmentDto, this.rule);
            if (appointmentResponse.status === 200) {
                this.succeed = true;
                Logger.log("Запись прошла успешно.");
                await this.removeRule();
            }
        } catch (error) {
            Logger.error('Ошибка при записи!');
        }
        // console.log(appointmentDto);
        // this.succeed = true;
        // await this.removeRule();
        // console.log("Запись прошла успешно.");
    }

    /**
     * Удаление правила из базы данных после успешной записи
     */
    private async removeRule(): Promise<void> {
        await this.ruleRepository.remove(this.rule);
    }

    public getRuleId(): number {
        return this.rule.id;
    }

    public getRule() {
        return this.rule;
    }
}
