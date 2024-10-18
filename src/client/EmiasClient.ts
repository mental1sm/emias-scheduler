import {User} from "../entity/User";
import * as axios from "axios";
import {ReferralsResponse} from "../types/Referrals";
import {AvailableResourceResponse} from "../types/AvaliableResource";
import {RuleMatch} from "../types/RuleMatch";
import {AvailableSchedule, Slot} from "../types/AvailableSchedule";
import {AppointmentDto} from "../types/AppointmentDto";


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

        const response = await axios.post<ReferralsResponse>(url, JSON.stringify(json), {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 6000
        })

        return response;
    }

    public async getDoctorsInfo(user: User, referralId: number) {
        const url = "https://emias.info/api/emc/appointment-eip/v1/?getDoctorsInfo";
        const json = {
            jsonrpc:"2.0",
            id: "5T2iY8txZNGV951X3wpsnm",
            method:"getDoctorsInfo",
            params: {
                omsNumber: user.oms,
                birthDate: user.birthDate,
                referralId: referralId
            }
        }
        const response = await axios.post<AvailableResourceResponse>(url, JSON.stringify(json), {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 6000
        })

        return response;
    }

    public async getTimeInfo(user: User, match: RuleMatch) {
        const url = "https://emias.info/api/emc/appointment-eip/v1/?getAvailableResourceScheduleInfo";
        const json = {
            jsonrpc:"2.0",
            id: "5T2iY8txYNG2951X3wpsnm",
            method:"getAvailableResourceScheduleInfo",
            params: {
                omsNumber: user.oms,
                birthDate: user.birthDate,
                availableResourceId: match.availableResourceId,
                complexResourceId: match.complexResourceId,
                referralId: match.referralId
            }
        }
        const response = await axios.post<AvailableSchedule>(url, JSON.stringify(json), {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 6000
        })

        return response;
    }

    public async createAppointment(user: User, appointmentDto: AppointmentDto) {
        const url = "https://emias.info/api/emc/appointment-eip/v1/?createAppointment";
        const json = {
            jsonrpc:"2.0",
            id: "5T2iY2txYNH2951X6wpsnm",
            method:"createAppointment",
            params: {
                omsNumber: user.oms,
                birthDate: user.birthDate,
                availableResourceId: appointmentDto.match.availableResourceId,
                complexResourceId: appointmentDto.match.complexResourceId,
                referralId: appointmentDto.match.referralId,
                startTime: appointmentDto.slot.startTime,
                endTime: appointmentDto.slot.endTime
            }
        }
        const response = await axios.post<AvailableSchedule>(url, JSON.stringify(json), {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 8000
        })

        return response;
    }
}