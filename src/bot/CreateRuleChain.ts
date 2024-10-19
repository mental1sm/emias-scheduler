import {CreateRuleState, RuleType} from "../types/BotSteps";
import {EmiasRule} from "../entity/EmiasRule";
import {User} from "../entity/User";
import {Context} from "telegraf";
import {Repository} from "typeorm";


export class CreateRuleChain<T> {
    public state: CreateRuleState;
    public rule: EmiasRule;
    public cachedResult: T;

    constructor(public type: RuleType, public user: User, private ruleRepository: Repository<EmiasRule>, private onComplete: () => Promise<void>) {
        this.state = CreateRuleState.AWAIT_REFERRAL;
        this.rule = new EmiasRule();
        this.rule.user = user;
    }

    public async handleState(ctx: Context) {
        if (!ctx.text) return;
        switch (this.state) {
            case CreateRuleState.AWAIT_CRITERIA: {
                this.rule.criteria = ctx.text.trim();
                this.state = CreateRuleState.AWAIT_TIME_RANGE;
                await ctx.reply("Введите диапазон оптимального времени.\n\nПример:\n10:00-15:00\n\n(Примечание: время разделяется тире)")
                break;
            }
            case CreateRuleState.AWAIT_TIME_RANGE: {
                this.rule.timeRange = ctx.text.trim();
                this.state = CreateRuleState.AWAIT_START_DATE;
                await ctx.reply("Введите дату, с которой нужно искать запись.\nФормат: 19.10.2024")
                break;
            }
            case CreateRuleState.AWAIT_START_DATE: {
                this.rule.wantedStartDate = ctx.text.trim();
                this.state = CreateRuleState.AWAIT_INIT_TIME;
                await ctx.reply("Введите время, с которого демон запустит задачу с этим правилом." +
                    "\nСимвол '$' означает круглосуточное правило, которое начнется сразу же и не закончится до успеха или удаления." +
                    "\n\nПример:" +
                    "\n7:30");
                break;
            }
            case CreateRuleState.AWAIT_INIT_TIME: {
                this.rule.initTime = ctx.text.trim();
                this.state = CreateRuleState.AWAIT_STOP_TIME;
                await ctx.reply('Введите время, с которого демон остановит задачу с этим правилом.\n\nПример:\n7:40');
                break;
            }
            case CreateRuleState.AWAIT_STOP_TIME: {
                this.rule.stopTime = ctx.text.trim();
                this.state = CreateRuleState.AWAIT_POLL_INTERVAL;
                await ctx.reply('Введите периодичность проверки на доступность записей. Для срочных записей рекомендуется 2, для круглосуточных 60 секунд.' +
                    '\nНапишите только цифру');
                break;
            }
            case CreateRuleState.AWAIT_POLL_INTERVAL: {
                try {
                    Number(ctx.text);
                } catch (e) {
                    await ctx.reply('Введите только число (в секундах)');
                    break;
                }
                this.rule.pollInterval = Number(ctx.text.trim());
                this.state = CreateRuleState.NONE;
                const newRule = this.ruleRepository.create(this.rule);
                await this.ruleRepository.save(newRule);
                await ctx.reply('Правило создано!');
                await this.onComplete();
            }
        }
    }
}