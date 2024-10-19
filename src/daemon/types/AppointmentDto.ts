import {RuleMatch} from "./RuleMatch";
import {Slot} from "./AvailableSchedule";

export type AppointmentDto = {
    match: RuleMatch,
    slot: Slot
}