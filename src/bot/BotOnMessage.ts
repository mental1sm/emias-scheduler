import {Context, Telegraf} from "telegraf";
import {BotSharedMemory} from "./BotSharedMemory";
import {Logger} from "../daemon/Logger";

export class BotOnMessage {
    constructor(private memory: BotSharedMemory) {
    }

    init(bot: Telegraf) {
        bot.on('message', async (ctx: Context) => {
            if (!ctx.chat) return;
            const chatId = ctx.chat.id;

            const regState = this.memory.getRegistrationState();
            const createRuleState = this.memory.getCreateRuleState();
            if (regState[chatId]) {
                regState[chatId].handleState(ctx);
            }

            if (createRuleState[chatId]) {
                createRuleState[chatId].handleState(ctx);
            }
        });
        Logger.log('Модуль сообщений инициализирован');
    }
}