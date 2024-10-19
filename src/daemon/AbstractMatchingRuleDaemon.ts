import {AbstractRuleDaemon} from "./AbstractRuleDaemon";
import {EmiasRule} from "../entity/EmiasRule";
import {EmiasClient} from "../client/EmiasClient";
import {RuleMatch} from "./types/RuleMatch";
import {User} from "../entity/User";
import {isTimeInInterval} from "./util/time";
import {AppointmentDto} from "./types/AppointmentDto";
import {Slot} from "./types/AvailableSchedule";
import {Logger} from "./Logger";

export abstract class AbstractMatchingRuleDaemon extends AbstractRuleDaemon {
    protected roomMatches: RuleMatch[] = [];
    protected user: User

    protected constructor(rule: EmiasRule, protected emiasClient: EmiasClient) {
        super(rule);
    }

    /**
     * Поиск соответствий для комнат
     */
    protected async findRoomMatches(): Promise<void> {
        try {
            const response = await this.emiasClient.getDoctorsInfo(this.user, this.rule);

            response.data.result.forEach(result => {
                const matches = result.complexResource
                    .filter(resource => this.isRoomMatch(resource) || (this.isDoctorMatch(result.mainDoctor) && resource.room))
                    .map(resource => {
                        const match = this.createRoomMatch(result.id, resource.id);
                        const reception = result.receptionType[0];
                        if (reception) {
                            match.receptionTypeId = reception.code;
                        }
                        return match;
                    });

                this.roomMatches.push(...matches);
            });
        } catch (error) {
            Logger.error('Ошибка при исследовании локаций!');
        }
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
     * Поиск свободных временных слотов
     */
    protected async findTimeMatches(match: RuleMatch): Promise<AppointmentDto[]> {
        const response = await this.emiasClient.getTimeInfo(this.user, match, this.rule);
        const { scheduleOfDay } = response.data.result;

        return scheduleOfDay.flatMap(schedule =>
            schedule.scheduleBySlot.flatMap(scheduleBySlot =>
                scheduleBySlot.slot
                    .filter(slot => isTimeInInterval(this.rule.timeRange, slot.startTime.toString()))
                    .map(slot => this.createAppointmentDto(match, slot))
            )
        );
    }

    /**
     * Создание объекта назначения
     */
    private createAppointmentDto(match: RuleMatch, slot: Slot): AppointmentDto {
        return { match, slot };
    }
}