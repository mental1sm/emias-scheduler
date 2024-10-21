import {Context} from "telegraf";
import {Repository} from "typeorm";
import {User} from "../entity/User";
import {RegisterChain} from "./RegisterChain";
import {CreateRuleState, RegistrationState, RuleType} from "../types/BotSteps";
import {BotSharedMemory} from "./BotSharedMemory";
import {CreateRuleChain} from "./CreateRuleChain";
import {EmiasRule} from "../entity/EmiasRule";
import {ReferralsResponse} from "../types/Referrals";
import {InlineKeyboardMarkup} from "telegraf/typings/core/types/typegram";
import {SpecialitiesResponse} from "../types/Specialities";
import {EmiasClient} from "../client/EmiasClient";
import {Answers} from "./BotAnswers";
import {Logger} from "../daemon/Logger";

export abstract class BotSharedFunc {

    protected constructor(
        protected userRepository: Repository<User>,
        protected memory: BotSharedMemory,
        protected ruleRepository: Repository<EmiasRule>,
        protected emiasClient: EmiasClient
    ) {}

    protected checkWhitelist(ctx: Context): boolean {
        if (this.memory.getWhiteList().includes('$')) return true;
        if (ctx.from === undefined) return false;
        if (!ctx.from.username) return false;
        return this.memory.getWhiteList().includes(ctx.from.username);
    }

    protected async findUserById(userId: number) {
        try {
            return this.userRepository.findOne({where: {id: userId}});
        } catch (e) {
            Logger.error('Exception in user find!')
            return null;
        }
    }

    protected async register(ctx: Context, chatId: number, userId: number) {
        const registrationState = this.memory.getRegistrationState();
        registrationState[chatId] = new RegisterChain(this.userRepository, userId, chatId, async () => {
            registrationState[chatId] = null;
        });

        registrationState[chatId].state = RegistrationState.AWAIT_OMS;
        await ctx.reply("Введите полис ОМС без пробелов, все 16 цифр");
    }

    protected async createRule(ctx: Context, chatId: number, user: User, type: RuleType) {
        const createRuleState = this.memory.getCreateRuleState();
        createRuleState[chatId] = new CreateRuleChain(type, user, this.ruleRepository, async () => {
            createRuleState[chatId] = null;
        })

        const chain = createRuleState[chatId];
        chain.rule.type = type;

        if (chain.type === RuleType.REFERRAL) {
            const markup = await this.findReferrals(chain);
            await ctx.editMessageReplyMarkup(markup);
        }

        if (chain.type === RuleType.DOC) {
            const markup = await this.findSpecialities(chain);
            await ctx.editMessageReplyMarkup(markup);
        }
    }

    protected async findReferrals(createChain: CreateRuleChain<ReferralsResponse>) {
        const createRuleState = this.memory.getCreateRuleState();
        const chain = createRuleState[createChain.user.chatId];
        if (!chain) return;
        let markup: InlineKeyboardMarkup = {
            inline_keyboard: [] as { text: string, callback_data: string }[][]
        }

        const response = await this.emiasClient.getReferrals(chain.user);
        response.data.result.map(r => {
            if (r.toLdp) {
                const item = [
                    {text: r.toLdp.ldpTypeName, callback_data: `ref_${r.id}`}
                ]
                markup.inline_keyboard.push(item)
            }
            if (r.toDoctor) {
                const item = [
                    {text: r.toDoctor.specialityName, callback_data: `ref_${r.id}`}
                ]
                markup.inline_keyboard.push(item)
            }
        });

        chain.cachedResult = response.data;
        chain.state = CreateRuleState.AWAIT_REFERRAL;
        return markup;
    }

    protected async findSpecialities(createChain: CreateRuleChain<SpecialitiesResponse>) {
        const createRuleState = this.memory.getCreateRuleState();
        const chain = createRuleState[createChain.user.chatId];
        if (!chain) return;
        let markup: InlineKeyboardMarkup = {
            inline_keyboard: [] as { text: string, callback_data: string }[][]
        }

        const response = await this.emiasClient.getSpecialities(chain.user);
        response.data.result.map(r => {
            const item = [
                {text: r.name, callback_data: `doc_${r.code}`}
            ]
            markup.inline_keyboard.push(item)
        });

        chain.cachedResult = response.data;
        chain.state = CreateRuleState.AWAIT_SPECIALIST;
        return markup;
    }

    protected async showRule(ctx: Context, edit?: boolean) {
        try {
            const readRuleCounter = this.memory.getReadRuleCounter();
            const chatId = ctx.chat!.id;
            const userId = ctx.from!.id;
            const user = await this.findUserById(userId);
            if (!user) {
                await ctx.reply('Вы не зарегистрированы!');
                return;
            }

            if (user.rules.length === 0) {
                await ctx.reply('У вас нет правил для записей.')
                return;
            }

            if (readRuleCounter[chatId] < 0) readRuleCounter[chatId] = 0;
            if (readRuleCounter[chatId] >= user.rules.length) readRuleCounter[chatId] = user.rules.length - 1;

            const currentIndex = readRuleCounter[chatId];


            const rule = user.rules[currentIndex];

            const markup: InlineKeyboardMarkup = {
                inline_keyboard: [
                    [
                        {text: 'Назад', callback_data: 'back_rule_callback'},
                        {text: 'Вперед', callback_data: 'next_rule_callback'}
                    ],
                    [
                        {text: 'Удалить', callback_data: `delete_rule_${rule.id}`}
                    ]
                ]
            }
            await ctx.editMessageText(Answers.ruleCard(rule, currentIndex, user.rules.length));
            await ctx.editMessageReplyMarkup(markup);

        } catch (e) {
            console.log('Ошибка в просмотре правил!')
            await ctx.reply('Непредвиденная ошибка!')
        }
    }
}