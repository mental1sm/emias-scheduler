import {ComplexResource} from "./types/AvaliableResource";
import {MainDoctor} from "./types/AvaliableResource";
import {EmiasRule} from "../entity/EmiasRule";

export abstract class AbstractRuleDaemon {
    protected constructor(protected rule: EmiasRule) {
    }

    /**
     * Проверка, подходит ли комната под критерии правила
     */
    protected isRoomMatch(resource: ComplexResource): boolean {
        const locationCriteria = this.rule.criteria.toLowerCase();
        return resource.room! &&
            (resource.room.defaultAddress.toLowerCase().includes(locationCriteria) ||
                resource.room.lpuShortName.toLowerCase().includes(locationCriteria));
    }

    /**
     * Проверка, подходит ли комната под критерии правила
     */
    protected isDoctorMatch(doctor: MainDoctor | undefined): boolean {
        if (doctor === undefined) return false;
        const locationCriteria = this.rule.criteria.toLowerCase();
        if (!doctor.lastName) return false;
        return doctor.lastName.toLowerCase().includes(locationCriteria.toLowerCase());
    }
}