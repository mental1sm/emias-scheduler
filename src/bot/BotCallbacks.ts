import {Context, Telegraf} from "telegraf";
import {CreateRuleState, RuleType} from "../types/BotSteps";
import {CreateRuleChain} from "./CreateRuleChain";
import {ReferralsResponse} from "../types/Referrals";
import {SpecialitiesResponse} from "../types/Specialities";
import {BotSharedMemory} from "./BotSharedMemory";
import {BotSharedFunc} from "./BotSharedFunc";
import {Repository} from "typeorm";
import {User} from "../entity/User";
import {EmiasRule} from "../entity/EmiasRule";
import {EmiasClient} from "../client/EmiasClient";
import {Answers} from "./BotAnswers";
import {Logger} from "../daemon/Logger";

export class BotCallbacks extends BotSharedFunc {
    constructor(
        memory: BotSharedMemory, userRepository: Repository<User>,
        ruleRepository: Repository<EmiasRule>, emiasClient: EmiasClient) {
        super(userRepository, memory, ruleRepository, emiasClient);
    }

    init(bot: Telegraf) {
        bot.on('callback_query', async (ctx: Context) => {
            try {
                if (!this.checkWhitelist(ctx)) return;
                if (!ctx.from) return;

                // @ts-ignore
                const callbackData: string = ctx.callbackQuery?.data;
                const userId = ctx.from.id;
                const chatId = ctx.chat!.id;

                const createRuleState = this.memory.getCreateRuleState();
                const readRuleCounter = this.memory.getReadRuleCounter();

                if (callbackData === 'reg_callback') {
                    await this.register(ctx, chatId, userId);
                }

                const user = await this.findUserById(userId);
                if (!user) {
                    if (callbackData !== 'reg_callback') await ctx.reply('Вы не зарегистрированы!')
                    return;
                }

                if (callbackData === 'create_rule_callback') {
                    const markup = {reply_markup: {inline_keyboard: [
                                [{text: 'По направлению', callback_data: 'create_referral'},],
                                [{text: 'К врачу', callback_data: 'create_doc'}]
                            ]}}
                    await ctx.editMessageReplyMarkup(markup.reply_markup);
                }

                if (callbackData === 'create_referral') {
                    await this.createRule(ctx, chatId, user, RuleType.REFERRAL);
                }

                if (callbackData === 'create_doc') {
                    await this.createRule(ctx, chatId, user, RuleType.DOC);
                }

                if (callbackData.includes('ref_')) {
                    if (!createRuleState[chatId]) return;
                    const chain: CreateRuleChain<ReferralsResponse> = createRuleState[chatId];

                    chain.rule.referralId = Number(callbackData.split('_')[1]);
                    const referralResult = chain.cachedResult.result.find(r => r.id === chain.rule.referralId);
                    if (referralResult?.toLdp) {
                        chain.rule.targetName = referralResult.toLdp.ldpTypeName;
                    }
                    else if (referralResult?.toDoctor) {
                        chain.rule.targetName = referralResult.toDoctor.specialityName;
                        chain.rule.specialityId = referralResult.toDoctor.specialityId;
                    }
                    chain.state = CreateRuleState.AWAIT_CRITERIA;
                    await ctx.reply(Answers.criteriaText());
                }

                if (callbackData.includes('doc_')) {
                    if (!createRuleState[chatId]) return;
                    const chain: CreateRuleChain<SpecialitiesResponse> = createRuleState[chatId];
                    chain.rule.specialityId = Number(callbackData.split('_')[1]);
                    const specialityResult = chain.cachedResult.result.find(r => r.code === chain.rule.specialityId!.toString());
                    chain.rule.targetName = specialityResult!.name;
                    chain.state = CreateRuleState.AWAIT_CRITERIA;
                    await ctx.reply(Answers.criteriaText());
                }

                if (callbackData === 'check_rule_callback') {
                    if (!readRuleCounter[chatId]) {
                        readRuleCounter[chatId] = 0;
                    }

                    await this.showRule(ctx);

                }

                if (callbackData === 'next_rule_callback') {
                    if (!readRuleCounter[chatId]) {
                        readRuleCounter[chatId] = 0;
                    }
                    readRuleCounter[chatId]++;
                    await this.showRule(ctx);
                }

                if (callbackData === 'back_rule_callback') {
                    if (!readRuleCounter[chatId]) {
                        readRuleCounter[chatId] = 0;
                    }
                    readRuleCounter[chatId]--;
                    await this.showRule(ctx);
                }

                if (callbackData.includes('delete_rule')) {
                    const ruleId = callbackData.split('_')[2];
                    const rule = await this.ruleRepository.findOne({where: {id: Number(ruleId)}});
                    if (rule) {
                        await this.ruleRepository.update(rule.id, {deletionFlag: true})
                        await ctx.reply('Запланировано удаление!');
                    }
                }
            } catch (e) {
                Logger.error('Ошибка в коллбеках кнопок!');
                await ctx.reply('Непредвиденная ошибка! Проверьте правильность полиса ОМС и даты рождения.')
            }
        });
        Logger.log('Модуль коллбеков инициализирован');
    }
}