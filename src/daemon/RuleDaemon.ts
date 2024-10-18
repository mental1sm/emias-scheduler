import { Repository } from "typeorm";
import { EmiasRule } from "../entity/EmiasRule";
import { EmiasClient } from "../client/EmiasClient";
import { RuleMatch } from "../types/RuleMatch";
import { AppointmentDto } from "./types/AppointmentDto";
import { User } from "../entity/User";
import { isTimeInInterval } from "./util/time";
import {ComplexResource, MainDoctor} from "./types/AvaliableResource";

export class RuleDaemon {
    public finished: boolean = false;
    public succeed: boolean = false;
    public lastExecution: Date | null = null;
    public executionIntervalMs: number = 10000;
    private emiasClient: EmiasClient = EmiasClient.instance();
    private user: User;
    private roomMatches: RuleMatch[] = [];

    constructor(
        private ruleRepository: Repository<EmiasRule>,
        private rule: EmiasRule
    ) {
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
            console.log("Комнаты найдены. Запускается поиск свободных слотов.");
            console.log(this.roomMatches);
            await this.processRoomMatches();
        } else {
            console.log("Не найдено комнат!");
        }

        this.finished = true;
    }

    /**
     * Поиск соответствий для комнат
     */
    private async findRoomMatches(): Promise<void> {
        try {
            const response = await this.emiasClient.getDoctorsInfo(this.user, this.rule);
            response.data.result.forEach(result => {
                result.complexResource.forEach(resource => {
                    if (this.isRoomMatch(resource) || this.isDoctorMatch(result.mainDoctor) && resource.room) {
                        const match = this.createRoomMatch(result.id, resource.id);
                        console.log(match)
                        if (result.receptionType.length > 0) {
                            const reception = result.receptionType[0];
                            match.receptionTypeId = reception.code;
                        }
                        this.roomMatches.push(match);
                    }
                });
            });
        } catch (error) {
            console.log('Ошибка при исследовании локаций!', error);
        }
    }

    /**
     * Проверка, подходит ли комната под критерии правила
     */
    private isRoomMatch(resource: ComplexResource): boolean {
        const locationCriteria = this.rule.criteria.toLowerCase();
        return resource.room! &&
            (resource.room.defaultAddress.toLowerCase().includes(locationCriteria) ||
                resource.room.lpuShortName.toLowerCase().includes(locationCriteria));
    }

    /**
     * Проверка, подходит ли комната под критерии правила
     */
    private isDoctorMatch(doctor: MainDoctor | undefined): boolean {
        if (doctor === undefined) return false;
        const locationCriteria = this.rule.criteria.toLowerCase();
        if (!doctor.lastName) return false;
        return doctor.lastName.toLowerCase().includes(locationCriteria.toLowerCase());
    }

    /**
     * Создание объекта соответствия комнаты
     */
    private createRoomMatch(availableResourceId: number, complexResourceId: number): RuleMatch {
        return {
            referralId: this.rule.referralId!,
            availableResourceId,
            complexResourceId
        };
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
     * Поиск свободных временных слотов
     */
    private async findTimeMatches(match: RuleMatch): Promise<AppointmentDto[]> {
        const response = await this.emiasClient.getTimeInfo(this.user, match, this.rule);
        console.log(response.data.result)
        const appointmentDtoList: AppointmentDto[] = [];

        response.data.result.scheduleOfDay.forEach(schedule => {
            schedule.scheduleBySlot.forEach(scheduleBySlot => {
                scheduleBySlot.slot.forEach(slot => {
                    if (isTimeInInterval(this.rule.timeRange, slot.startTime.toString())) {
                        appointmentDtoList.push(this.createAppointmentDto(match, slot));
                    }
                });
            });
        });
        console.log('3')

        return appointmentDtoList;
    }

    /**
     * Создание объекта назначения
     */
    private createAppointmentDto(match: RuleMatch, slot: any): AppointmentDto {
        return { match, slot };
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
                console.log("Запись прошла успешно.");
                await this.removeRule();
            }
        } catch (error) {
            console.log('Ошибка при записи!', error);
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
