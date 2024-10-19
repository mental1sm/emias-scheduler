import {DataSource} from "typeorm";
import {EmiasClient} from "../client/EmiasClient";
import {User} from "../entity/User";
import {EmiasRule} from "../entity/EmiasRule";
import {Context, Telegraf} from "telegraf";
import {CreateRuleState, RegistrationState, RuleType} from "../types/BotSteps";
import {RegisterChain} from "./RegisterChain";
import {CreateRuleChain} from "./CreateRuleChain";
import {ReferralsResponse} from "../types/Referrals";
import {SpecialitiesResponse} from "../types/Specialities";
import { InlineKeyboardMarkup } from 'telegraf/typings/core/types/typegram';

export class Bot {

    private emiasClient = EmiasClient.instance();
    private readonly userRepository;
    private ruleRepository;
    private bot;

    constructor(private readonly dataSource: DataSource, private whitelist: string[], private token: string) {
        this.userRepository = dataSource.getRepository(User);
        this.ruleRepository = dataSource.getRepository(EmiasRule);
        this.bot = new Telegraf(token);
    }

    async bootstrap() {
        await this.initBot();
        await this.bot.launch(() => {
            console.log('Started!');
        });
    }

    async stop() {
        this.bot.stop();
    }

    private registrationState: { [chatId: number]: RegisterChain | null } = {};
    private createRuleState: { [chatId: number]: CreateRuleChain<any> | null } = {};
    private readRuleCounter: { [chatId: string]: number } = {};


    async findUserById(userId: number) {
        try {
            return this.userRepository.findOne({where: {id: userId}});
        } catch (e) {
            console.log('Exception in user find!')
            return null;
        }
    }

    checkWhitelist(ctx: Context): boolean {
        if (ctx.from === undefined) return false;
        if (!ctx.from.username) return false;
        return this.whitelist.includes(ctx.from.username);
    }

    async initBot() {
        this.bot.command('start', async (ctx) => {
            if (!this.checkWhitelist(ctx)) return;
            const msg = "Шаман пидорас ебать кстати. Все, можем продолжать. Напиши /help"
            await ctx.reply(msg);
        })

        this.bot.command('help', async (ctx) => {
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

        this.bot.on('callback_query', async (ctx: Context) => {
            try {
                if (!this.checkWhitelist(ctx)) return;
                if (!ctx.from) return;

                // @ts-ignore
                const callbackData: string = ctx.callbackQuery?.data;
                const userId = ctx.from.id;
                const chatId = ctx.chat!.id;

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
                    await ctx.reply("Выберите стратегию", markup);
                }

                if (callbackData === 'create_referral') {

                    await this.createRule(ctx, chatId, user, RuleType.REFERRAL);
                }

                if (callbackData === 'create_doc') {
                    await this.createRule(ctx, chatId, user, RuleType.DOC);
                }

                if (callbackData.includes('ref_')) {
                    if (!this.createRuleState[chatId]) return;
                    const chain: CreateRuleChain<ReferralsResponse> = this.createRuleState[chatId];

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
                    await ctx.reply('Введите часть названия учреждения.\n\n' +
                        'Пример:' +
                        '\nОригинальное название: Москва, Измайловский проспект, д. 63' +
                        '\nОригинальное учреждение: ГБУЗ ГП 191 Ф 3 (ГП 182)' +
                        '\n\nВаш критерий: измайловс' +
                        '\nЛибо возможно: 191 Ф 3' +
                        '\n\nТо есть подстрока от адреса или названия. В примере с "191 Ф 3" очень важно сохранять пробелы и порядок, ' +
                        'а в первом примере не писать больше необходимого, чтобы избежать ошибок.'
                    )
                }

                if (callbackData.includes('doc_')) {
                    if (!this.createRuleState[chatId]) return;
                    const chain: CreateRuleChain<SpecialitiesResponse> = this.createRuleState[chatId];
                    chain.rule.specialityId = Number(callbackData.split('_')[1]);
                    const specialityResult = chain.cachedResult.result.find(r => r.code === chain.rule.specialityId!.toString());
                    chain.rule.targetName = specialityResult!.name;
                    chain.state = CreateRuleState.AWAIT_CRITERIA;
                    await ctx.reply('Введите часть названия учреждения.\n\n' +
                        'Пример:' +
                        '\nОригинальное название: Москва, Измайловский проспект, д. 63' +
                        '\nОригинальное учреждение: ГБУЗ ГП 191 Ф 3 (ГП 182)' +
                        '\n\nВаш критерий: измайловс' +
                        '\nЛибо возможно: 191 Ф 3' +
                        '\n\nТо есть подстрока от адреса или названия. В примере с "191 Ф 3" очень важно сохранять пробелы и порядок, ' +
                        'а в первом примере не писать больше необходимого, чтобы избежать ошибок.'
                    )
                }

                if (callbackData === 'check_rule_callback') {
                    if (!this.readRuleCounter[chatId]) {
                        this.readRuleCounter[chatId] = 0;
                    }

                    await this.showRule(ctx);

                }

                if (callbackData === 'next_rule_callback') {
                    if (!this.readRuleCounter[chatId]) {
                        this.readRuleCounter[chatId] = 0;
                    }
                    this.readRuleCounter[chatId]++;
                    await this.showRule(ctx);
                }

                if (callbackData === 'back_rule_callback') {
                    if (!this.readRuleCounter[chatId]) {
                        this.readRuleCounter[chatId] = 0;
                    }
                    this.readRuleCounter[chatId]--;
                    await this.showRule(ctx);
                }

                if (callbackData.includes('delete_rule')) {
                    const ruleId = callbackData.split('_')[2];
                    const rule = await this.ruleRepository.findOne({where: {id: Number(ruleId)}});
                    if (rule) {
                        await this.ruleRepository.remove(rule);
                        await ctx.reply('Правило удалено!');
                    }
                }
            } catch (e) {
                console.log('Ошибка в коллбеках кнопок!');
                await ctx.reply('Непредвиденная ошибка! Проверьте правильность полиса ОМС и даты рождения.')
            }
        });

        this.bot.on('message', async (ctx: Context) => {
            if (!ctx.chat) return;
            const chatId = ctx.chat.id;

            if (this.registrationState[chatId]) {
                this.registrationState[chatId].handleState(ctx);
            }

            if (this.createRuleState[chatId]) {
                this.createRuleState[chatId].handleState(ctx);
            }
        });
    }

    async register(ctx: Context, chatId: number, userId: number) {
        this.registrationState[chatId] = new RegisterChain(this.userRepository, userId, chatId, async () => {
            this.registrationState[chatId] = null;
        });

        this.registrationState[chatId].state = RegistrationState.AWAIT_OMS;
        await ctx.reply("Введите полис ОМС без пробелов, все 16 цифр");
    }

    async createRule(ctx: Context, chatId: number, user: User, type: RuleType) {
        this.createRuleState[chatId] = new CreateRuleChain(type, user, this.ruleRepository, async () => {
            this.createRuleState[chatId] = null;
        })

        const chain = this.createRuleState[chatId];
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

    private async findReferrals(createChain: CreateRuleChain<ReferralsResponse>) {
        const chain = this.createRuleState[createChain.user.chatId];
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

    private async findSpecialities(createChain: CreateRuleChain<SpecialitiesResponse>) {
        const chain = this.createRuleState[createChain.user.chatId];
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

    private async showRule(ctx: Context, edit?: boolean) {
        try {
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

            if (this.readRuleCounter[chatId] < 0) this.readRuleCounter[chatId] = 0;
            if (this.readRuleCounter[chatId] >= user.rules.length) this.readRuleCounter[chatId] = user.rules.length - 1;

            const currentIndex = this.readRuleCounter[chatId];


            const rule = user.rules[currentIndex];
            const msg = `
            Правило [${currentIndex + 1} из ${user.rules.length}]
            \nНаправление: ${rule.targetName}
            \nКритерий учреждения: ${rule.criteria}
            \nВремя записи: ${rule.timeRange}
            \nВремя запуска скрипта: ${rule.initTime}`;

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
            await ctx.editMessageText(msg);
            await ctx.editMessageReplyMarkup(markup);

        } catch (e) {
            console.log('Ошибка в просмотре правил!')
            await ctx.reply('Непредвиденная ошибка!')
        }
    }
}