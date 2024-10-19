import {Telegraf} from "telegraf";
import {BotSharedFunc} from "./BotSharedFunc";
import {BotSharedMemory} from "./BotSharedMemory";
import {Repository} from "typeorm";
import {User} from "../entity/User";
import {EmiasRule} from "../entity/EmiasRule";
import {EmiasClient} from "../client/EmiasClient";

export class BotCommands extends BotSharedFunc {

    constructor(
        memory: BotSharedMemory, userRepository: Repository<User>,
        ruleRepository: Repository<EmiasRule>, emiasClient: EmiasClient) {
        super(userRepository, memory, ruleRepository, emiasClient);
    }

    init(bot: Telegraf) {
        bot.command('start', async (ctx) => {
            if (!this.checkWhitelist(ctx)) return;
            const msg = "Шаман пидорас ебать кстати. Все, можем продолжать. Напиши /help"
            await ctx.reply(msg);
        })

        bot.command('help', async (ctx) => {
            if (!this.checkWhitelist(ctx)) return;
            const markup = {
                reply_markup: {
                    inline_keyboard: [
                        [{text: 'Зарегистрироваться', callback_data: 'reg_callback'},],
                        [{text: 'Создать правило', callback_data: 'create_rule_callback'}, {text: 'Посмотреть правила', callback_data: 'check_rule_callback'}]
                    ]}}

            let msg = "Выберите действие";

            const user = await this.findUserById(ctx.from.id);
            if (!user) {
                await ctx.reply('Вы не зарегистрированы', markup);
                return;
            }
            msg = `ОМС: ${user.oms}\nДата рождения: ${user.birthDate}`
            await ctx.reply(msg, markup);
        })
    }
}