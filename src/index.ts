import {Context, Telegraf} from "telegraf";
import {DataSource} from "typeorm";
import {User} from "./entity/User";
import {CreateRuleState, RegistrationState} from "./types/BotSteps";
import {LdpRule} from "./entity/LdpRule";
import {EmiasClient} from "./client/EmiasClient";
import {ReferralsResponse, ReferralsResult} from "./types/Referrals";

const token = "8093829634:AAEoIC9A-t_S54u5GdMaJG2XLKHytK5oFyU";
const whitelist = ['karsus'];

const bot = new Telegraf(token);

const AppDataSource = new DataSource({
    type: "sqlite",
    database: "database.sqlite",
    synchronize: true,
    logging: false,
    entities: [User, LdpRule],
    subscribers: [],
    migrations: [],
});

function checkWhitelist(ctx: Context): boolean {
    if (ctx.from === undefined) return false;
    if (!ctx.from.username) return false;
    if (whitelist.includes(ctx.from.username)) return true;
    return false;
}

const registrationState: { [chatId: string]: RegistrationState } = {};
const userData: { [chatId: string]: Partial<User> } = {};

const createRuleState: { [chatId: string]: CreateRuleState } = {};
const createRuleData: { [chatId: string]: Partial<LdpRule> } = {};
const readRuleCounter: { [chatId: string]: number } = {};
const cachedReferralsResult: { [chatId: string]: ReferralsResponse } = {};



AppDataSource.initialize().then(async () => {
    const userRepository = AppDataSource.getRepository(User);
    const ruleRepository = AppDataSource.getRepository(LdpRule);
    const emiasClient = EmiasClient.instance();

    const findUserById = async (userId: number) => {
        return userRepository.findOne({where: {id: userId}});
    }

    // Выбор направления
    const startRuleCreation = async (ctx: Context) => {
        const chatId = ctx.chat!.id;
        if (!ctx.from) return;
        const user = await findUserById(ctx.from.id);
        if (!user) return;
        const response = await emiasClient.getReferrals(user);
        cachedReferralsResult[chatId] = response.data;

        let markup = {
            reply_markup: {
                inline_keyboard: [] as { text: string, callback_data: string }[][]
            }
        }

        response.data.result.map(r => {
          if (r.toLdp) {
              const item = [
                  {text: r.toLdp.ldpTypeName, callback_data: `ref_${r.id}`}
              ]
              markup.reply_markup.inline_keyboard.push(item)
          }
          if (r.toDoctor) {
              const item = [
                  {text: r.toDoctor.specialityName, callback_data: `ref_${r.id}`}
              ]
              markup.reply_markup.inline_keyboard.push(item)
          }
        });
        createRuleState[chatId] = CreateRuleState.AWAIT_REFERRAL;

        await ctx.reply("Выберите направление", markup);
    }

    bot.command('start', (ctx) => {
        if (!checkWhitelist(ctx)) return;
        const msg = "Шаман пидорас ебать кстати. Все, можем продолжать. Напиши /reg"
    })

    bot.command('help', async (ctx) => {
        if (!checkWhitelist(ctx)) return;
        const markup = {
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: 'Зарегистрироваться', callback_data: 'reg_callback'},
                    ],
                    [
                        {text: 'Создать правило', callback_data: 'create_rule_callback'},
                        {text: 'Посмотреть правила', callback_data: 'check_rule_callback'}
                    ]
                ]
            }
        }

        let msg = "Выберите действие";

        const user = await findUserById(ctx.from.id);
        if (user) {
           msg = `ОМС: ${user.oms}\nДата рождения: ${user.birthDate}`
        }

        await ctx.reply(msg, markup);
    })

    // Регистрация полиса ОМС
    const register = async (ctx: Context) => {
        if (!checkWhitelist(ctx)) return;
        const chatId = ctx.msg.chat.id;
        createRuleState[chatId] = CreateRuleState.NONE;
        registrationState[chatId] = RegistrationState.AWAIT_OMS;
        userData[chatId] = {
            id: ctx.from!.id,
            chatId: chatId
        };
        ctx.reply("Введите полис ОМС без пробелов, все 16 цифр");
    }

    const showRule = async (ctx: Context) => {
        const chatId = ctx.chat!.id;
        const userId = ctx.from!.id;
        const user = await findUserById(userId);
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
        const msg = `
            Правило [${currentIndex + 1} из ${user.rules.length}]
            \nНаправление: ${rule.referralName}
            \nКритерий учреждения: ${rule.locationCriteria}
            \nВремя записи: ${rule.timeRange}
            \nВремя запуска скрипта: ${rule.initTime}`;

        const markup = {
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: 'Назад', callback_data: 'next_rule_callback'},
                        {text: 'Вперед', callback_data: 'back_rule_callback'}
                    ],
                    [
                        {text: 'Удалить', callback_data: `delete_rule_${rule.id}`}
                    ]
                ]
            }
        }

        await ctx.reply(msg, markup);
    }

    bot.on('callback_query', async (ctx) => {
        // @ts-ignore
        const callbackData: string = ctx.callbackQuery?.data;
        const userId = ctx.from.id;
        const chatId = ctx.chat!.id;
        if (callbackData === 'reg_callback') {
            await register(ctx);
        }
        if (callbackData === 'create_rule_callback') {
            registrationState[chatId] = RegistrationState.NONE;
            createRuleData[chatId] = {};
            await startRuleCreation(ctx);
        }
        if (callbackData.includes('ref_')) {
            if (!createRuleData[chatId]) return;
            const referralId = callbackData.split('_')[1];
            createRuleData[chatId].referralId = Number(referralId);
            const referralResult = cachedReferralsResult[chatId].result.find(r => r.id === Number(referralId))!;
            let referralName = '';
            if (referralResult.toLdp) {
                referralName = referralResult.toLdp.ldpTypeName;
            }
            else if (referralResult.toDoctor) {
                referralName = referralResult.toDoctor.specialityName;
            }
            createRuleData[chatId].referralName = referralName;

            createRuleState[chatId] = CreateRuleState.AWAIT_LOCATION_CRITERIA;
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
            if (!readRuleCounter[chatId]) {
                readRuleCounter[chatId] = 0;
            }

            await showRule(ctx);

        }

        if (callbackData === 'next_rule_callback') {
            if (!readRuleCounter[chatId]) {
                readRuleCounter[chatId] = 0;
            }
            readRuleCounter[chatId]++;
            await showRule(ctx);
        }

        if (callbackData === 'back_rule_callback') {
            if (!readRuleCounter[chatId]) {
                readRuleCounter[chatId] = 0;
            }
            readRuleCounter[chatId]--;
            await showRule(ctx);
        }

        if (callbackData.includes('delete_rule')) {
            const ruleId = callbackData.split('_')[2];
            const rule = await ruleRepository.findOne({where: {id: Number(ruleId)}});
            if (rule) {
                await ruleRepository.remove(rule);
                await ctx.reply('Правило удалено!');
            }
        }

    })

    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;

        switch (registrationState[chatId]) {
            case RegistrationState.AWAIT_OMS: {
                if (msg.text?.trim().length === 16) {
                    userData[chatId].oms = msg.text.trim();
                    registrationState[chatId] = RegistrationState.AWAIT_BIRTHDATE;
                    await msg.reply("Введите дату рождения в формате 2001-01-01")
                } else {
                    await msg.reply("Неверный формат полиса. Введите еще раз.")
                }
                break;
            }
            case RegistrationState.AWAIT_BIRTHDATE: {
                if (msg.text) {
                    userData[chatId].birthDate = msg.text.trim();
                    registrationState[chatId] = RegistrationState.NONE;
                    const user = userRepository.create(userData[chatId]);
                    await userRepository.save(user);
                    msg.reply("Регистрация завершена.")
                }
                break;
            }
        }
    switch (createRuleState[chatId]) {
        case CreateRuleState.AWAIT_LOCATION_CRITERIA: {
            if (!msg.text) return;
            createRuleData[chatId].locationCriteria = msg.text.trim();
            createRuleState[chatId] = CreateRuleState.AWAIT_TIME_RANGE;
            await msg.reply("Введите диапазон оптимального времени.\n\nПример:\n10:00-15:00\n\n(Примечание: время разделяется тире)")
            break;
        }
        case CreateRuleState.AWAIT_TIME_RANGE: {
            if (!msg.text) return;
            createRuleData[chatId].timeRange = msg.text.trim();
            createRuleState[chatId] = CreateRuleState.AWAIT_INIT_TIME;
            await msg.reply("Введите время, с которого демон запустит задачу с этим правилом.\n\nПример:\n7:30")
            break;
        }
        case CreateRuleState.AWAIT_INIT_TIME: {
            if (!msg.text) return;
            createRuleData[chatId].initTime = msg.text.trim();
            const user = await findUserById(msg.from.id);
            if (!user) {
                await msg.reply('Ошибка! Вы не зарегистрированы!');
                break;
            }
            const rule = ruleRepository.create(createRuleData[chatId]);
            rule.user = user;
            await ruleRepository.save(rule);
            createRuleState[chatId] = CreateRuleState.NONE;
            msg.reply('Правило создано!')
        }
    }
    })

    bot.launch(() => {
        console.log('Started!');
    });
})

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))