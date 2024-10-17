import {User} from "../entity/User";
import * as axios from "axios";
import {ReferralsResponse} from "../types/Referrals";


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
            }
        })

        return response;
    }
}