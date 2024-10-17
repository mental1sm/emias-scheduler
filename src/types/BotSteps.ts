export enum RegistrationState {
    AWAIT_OMS,
    AWAIT_BIRTHDATE,
    NONE
}

export enum CreateRuleState {
    AWAIT_REFERRAL,
    AWAIT_LOCATION_CRITERIA,
    AWAIT_TIME_RANGE,
    AWAIT_INIT_TIME,
    NONE
}