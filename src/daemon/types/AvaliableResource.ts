export type AvailableResourceResponse = {
    jsonrpc: string;
    id:      string;
    result:  Result[];
}

export type Result = {
    id:                      number;
    lpuId:                   number;
    name:                    string;
    arType:                  number;
    specialityChangeAbility: boolean;
    receptionType:           ReceptionType[];
    ldpType:                 LdpType[];
    samplingType:            any[];
    complexResource:         ComplexResource[];
    district:                boolean;
    replacement:             boolean;
    nondistrict:             boolean;
    availableByReferral:     boolean;
    mainDoctor?:              MainDoctor;
}

export type ComplexResource = {
    id:    number;
    name:  string;
    room?: Room;
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

export type MainDoctor = {
    specialityName: string;
    specialityId:   number;
    firstName:      string;
    lastName:       string;
    secondName:     string;
    mejiId:         number;
    employeeId:     number;
}

export type ReceptionType = {
    code?:    string;
    name?:    string;
    primary?: string;
    home?:    string;
}