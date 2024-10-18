export type SpecialitiesResponse = {
    jsonrpc: string;
    id:      string;
    result:  Result[];
}

export type Result = {
    code:                    string;
    name:                    string;
    male:                    boolean;
    female:                  boolean;
    areaType:                any[];
    therapeutic:             boolean;
    isMultipleLpuSpeciality: boolean;
    isComplaintSpeciality:   boolean;
}