import {Repository} from "typeorm";
import {LdpRule} from "../entity/LdpRule";
import {EmiasClient} from "../client/EmiasClient";
import {RuleMatch} from "../types/RuleMatch";
import {AppointmentDto} from "../types/AppointmentDto";

export class RuleDaemon {

    private finished: boolean = false;
    private lastExecution: Date | null;
    private executionIntervalMs: number;
    private emiasClient: EmiasClient = EmiasClient.instance();

    private matches: RuleMatch[] = [];
    private appointmentVariants: AppointmentDto[] = []

    constructor(private ruleRepository: Repository<LdpRule>) {
        this.executionIntervalMs = 2000;
    }

    async execute() {

    }

    async exploreMatches() {
        const emiasClient = EmiasClient.instance();
        if (!user || !rule) return [];
        const response = await emiasClient.getDoctorsInfo(user, rule.referralId);
        const matches: RuleMatch[] = [];

        response.data.result.forEach(result => {
            result.complexResource.forEach(resource => {
                if (resource.room) {
                    if (
                        resource.room.defaultAddress.toLowerCase().includes(rule.locationCriteria.toLowerCase()) ||
                        resource.room.lpuShortName.toLowerCase().includes(rule.locationCriteria.toLowerCase())) {
                        const match: RuleMatch = {
                            referralId: rule.referralId,
                            availableResourceId: result.id,
                            complexResourceId: resource.id
                        };
                        matches.push(match);
                    }
                }
            });
        });

        return matches;
    }


}