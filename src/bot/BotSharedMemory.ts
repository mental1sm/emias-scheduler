import {RegisterChain} from "./RegisterChain";
import {CreateRuleChain} from "./CreateRuleChain";

export class BotSharedMemory {

    private registrationState: { [chatId: number]: RegisterChain | null } = {};
    private createRuleState: { [chatId: number]: CreateRuleChain<any> | null } = {};
    private readRuleCounter: { [chatId: string]: number } = {};

    constructor(private whitelist: string[]) {}

    getRegistrationState() {
        return this.registrationState;
    }

    getCreateRuleState() {
        return this.createRuleState;
    }

    getReadRuleCounter() {
        return this.readRuleCounter;
    }

    getWhiteList() {
        return this.whitelist;
    }
}