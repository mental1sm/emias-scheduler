import {User} from "../entity/User";
import * as axios from "axios";
import {ReferralsResponse} from "../types/Referrals";
import {AvailableResourceResponse} from "../daemon/types/AvaliableResource";
import {RuleMatch} from "../types/RuleMatch";
import {AvailableSchedule} from "../daemon/types/AvailableSchedule";
import {AppointmentDto} from "../daemon/types/AppointmentDto";
import {SpecialitiesResponse} from "../types/Specialities";
import {EmiasRule} from "../entity/EmiasRule";
import {RuleType} from "../types/BotSteps";

interface Json {
    jsonrpc: string;
    id: string;
    method: string;
    params: {
        omsNumber: string;
        birthDate: string;
        availableResourceId?: number;
        complexResourceId?: number;
        specialityId?: string;  // Опционально
        referralId?: number;
        startTime?: Date,
        endTime?: Date,
        receptionTypeId?: string
    }
}

export class EmiasClient {
    private static _instance: EmiasClient;
    private constructor() {
    }
    public static instance() {
        if (EmiasClient._instance === undefined) {
            EmiasClient._instance = new EmiasClient();
        }
        return EmiasClient._instance;
    }


    public async getReferrals(user: User) {
        const url = "https://emias.info/api/emc/appointment-eip/v1/?getReferralsInfo";
        const json = {
            jsonrpc:"2.0",
            id: "5T6iY5txZNMM951X4wpsnm",
            method:"getReferralsInfo",
            params: {
                omsNumber: user.oms,
                birthDate: user.birthDate
            }
        }

        return axios.post<ReferralsResponse>(url, JSON.stringify(json), {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 6000
        });
    }

    public async getSpecialities(user: User) {
        const url = "https://emias.info/api/emc/appointment-eip/v1/?getSpecialitiesInfo";
        const json = {
            jsonrpc:"2.0",
            id: "-DH_l6BjUUNYaPKrdteEv",
            method:"getSpecialitiesInfo",
            params: {
                omsNumber: user.oms,
                birthDate: user.birthDate
            }
        }

        return axios.post<SpecialitiesResponse>(url, JSON.stringify(json), {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 6000
        });
    }

    public async getDoctorsInfo(user: User, rule: EmiasRule) {
        const url = "https://emias.info/api/emc/appointment-eip/v1/?getDoctorsInfo";
        const json: Json = {
            jsonrpc:"2.0",
            id: "5T2iY8txZNGV951X3wpsnm",
            method:"getDoctorsInfo",
            params: {
                omsNumber: user.oms,
                birthDate: user.birthDate
            }
        }

        if (rule.referralId) json.params.referralId = rule.referralId;
        if (rule.specialityId) json.params.specialityId = rule.specialityId.toString();

        return axios.post<AvailableResourceResponse>(url, JSON.stringify(json), {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 6000
        });
    }

    public async getTimeInfo(user: User, match: RuleMatch, rule: EmiasRule) {
        const url = "https://emias.info/api/emc/appointment-eip/v1/?getAvailableResourceScheduleInfo";
        let json: Json = {
            jsonrpc:"2.0",
            id: "5T2iY8txYNG2951X3wpsnm",
            method:"getAvailableResourceScheduleInfo",
            params: {
                omsNumber: user.oms,
                birthDate: user.birthDate,
                availableResourceId: match.availableResourceId,
                complexResourceId: match.complexResourceId,
            }
        }

        if (rule.specialityId) json.params.specialityId = rule.specialityId.toString();
        if (rule.referralId) json.params.referralId = rule.referralId;

        console.log(json)

        return axios.post<AvailableSchedule>(url, JSON.stringify(json), {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 6000
        });
    }

    public async createAppointment(user: User, appointmentDto: AppointmentDto, rule: EmiasRule) {
        const url = "https://emias.info/api/emc/appointment-eip/v1/?createAppointment";
        const json: Json = {
            jsonrpc:"2.0",
            id: "5T2iY2txYNH2951X6wpsnm",
            method:"createAppointment",
            params: {
                omsNumber: user.oms,
                birthDate: user.birthDate,
                availableResourceId: appointmentDto.match.availableResourceId,
                complexResourceId: appointmentDto.match.complexResourceId,
                startTime: appointmentDto.slot.startTime,
                endTime: appointmentDto.slot.endTime
            }
        }

        if (rule.referralId) json.params.referralId = rule.referralId;
        if (rule.specialityId) json.params.specialityId = rule.specialityId.toString();
        if (appointmentDto.match.receptionTypeId) json.params.receptionTypeId = appointmentDto.match.receptionTypeId;

        return axios.post<AvailableSchedule>(url, JSON.stringify(json), {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 8000
        });
    }
}