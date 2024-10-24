export type AvailableSchedule = {
    jsonrpc: string;
    id:      string;
    result:  Result;
}

export type Result = {
    availableResource: AvailableResource;
    scheduleOfDay:     ScheduleOfDay[];
}

export type AvailableResource = {
    id:                      number;
    lpuId:                   number;
    name:                    string;
    arType:                  number;
    specialityChangeAbility: boolean;
    receptionType:           any[];
    ldpType:                 LdpType[];
    samplingType:            any[];
    complexResource:         ComplexResource[];
    district:                boolean;
    replacement:             boolean;
    nondistrict:             boolean;
    availableByReferral:     boolean;
}

export type ComplexResource = {
    id:   number;
    name: string;
    room: Room;
}

export type Room = {
    id:               number;
    number:           string;
    lpuId:            number;
    lpuShortName:     string;
    addressPointId:   number;
    defaultAddress:   string;
    availabilityDate: Date;
}

export type LdpType = {
    code: string;
    name: string;
}

export type ScheduleOfDay = {
    date:           string;
    scheduleBySlot: ScheduleBySlot[];
}

export type ScheduleBySlot = {
    complexResourceId: number;
    cabinetNumber:     string;
    slot:              Slot[];
}

export type Slot = {
    startTime: Date;
    endTime:   Date;
}
