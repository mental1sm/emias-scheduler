export type ReferralsResponse = {
    jsonrpc: string;
    id:      string;
    result:  ReferralsResult[];
}

export type ReferralsResult = {
    id:                                number;
    number:                            string;
    startTime:                         Date;
    endTime:                           Date;
    type:                              string;
    lpuId:                             number;
    lpuType?:                          string;
    lpuName:                           string;
    toDoctor?:                         ToDoctor;
    countActiveAppointment:            number;
    countAppointmentWithReceptionFact: number;
    isMultipleLpuSpeciality:           boolean;
    isComplaintSpeciality:             boolean;
    comment?:                          string;
    toLdp?:                            ToLdp;
}

export type ToDoctor = {
    specialityId:    number;
    specialityName:  string;
    receptionTypeId: number;
}

export type ToLdp = {
    ldpTypeId:                 number;
    ldpTypeName:               string;
    countAssignmentProcedures: number;
}