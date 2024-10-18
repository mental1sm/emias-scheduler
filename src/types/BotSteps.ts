export enum RegistrationState {
    AWAIT_OMS,
    AWAIT_BIRTHDATE,
    NONE
}

export enum CreateRuleState {
    AWAIT_TYPE,
    AWAIT_SPECIALIST,
    AWAIT_REFERRAL,
    AWAIT_CRITERIA,
    AWAIT_TIME_RANGE,
    AWAIT_INIT_TIME,
    AWAIT_STOP_TIME,
    AWAIT_POLL_INTERVAL,
    NONE
}

export enum RuleType {
    DOC,
    REFERRAL
}