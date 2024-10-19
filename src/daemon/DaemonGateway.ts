import {DataSource, Repository} from "typeorm";
import {Queue} from "./Queue";
import {RuleDaemon} from "./RuleDaemon";
import {EmiasRule} from "../entity/EmiasRule";
import {intervalOfExecutedRuleElapsed, isTimeToRun, isTimeToStop} from "./util/time";
import {Logger} from "./Logger";

export class DaemonGateway {

    // Очередь ожидания
    private waitingQueue: Queue<RuleDaemon> = new Queue();
    private sleepingQueue: Queue<RuleDaemon> = new Queue();
    // Очередь исполнения
    private executingQueue: Queue<RuleDaemon> = new Queue();
    // Очередь выполненных правил
    private executedQueue: Queue<RuleDaemon> = new Queue();

    private readonly ruleRepository: Repository<EmiasRule>;

    constructor(datasource: DataSource, private pollingIntervalMs: number) {
        this.ruleRepository = datasource.getRepository(EmiasRule);
    }

    public async bootstrap() {
        setInterval(() => this.mainLoop(), this.pollingIntervalMs);
    }

    private async mainLoop() {
        await this.checkRulesFromDatabase();
        await this.checkWaitingRules();
        await this.executeRules();
        await this.processExecutedRules();
        await this.processSleepingRules();
    }

    private async checkRulesFromDatabase() {
        const rules = await this.ruleRepository.find();
        rules.forEach(rule => {
            if (!this.existsInQueues(rule)) {
                Logger.log(`Запланировано новое правило на ${rule.initTime}!`)
                const ruleDaemon = new RuleDaemon(this.ruleRepository, rule);
                this.writeDirtyStatus(ruleDaemon, 'Запланировано');
                this.waitingQueue.enqueue(ruleDaemon);
            }
        })
    }

    private async checkWaitingRules() {
        const temporaryQueue = new Queue<RuleDaemon>();
        while (!this.waitingQueue.isEmpty()) {
            const rule = this.waitingQueue.dequeue()!;
            temporaryQueue.enqueue(rule);
        }

        while (!temporaryQueue.isEmpty()) {
            const rule = temporaryQueue.dequeue()!;
            if (isTimeToRun(rule.getRule())) {
                this.executingQueue.enqueue(rule);
                await this.writeDirtyStatus(rule, 'Выполняется');
            }
            else this.waitingQueue.enqueue(rule);
        }
    }

    private existsInQueues(rule: EmiasRule): boolean {
        const predicate = (r: RuleDaemon) => r.getRuleId() === rule.id;
        return !!(
            this.executingQueue.find(r => predicate(r))
            || this.executedQueue.find(r => predicate(r))
            || this.waitingQueue.find(r => predicate(r))
            || this.sleepingQueue.find(r => predicate(r))
        );
    }

    async executeRules() {
        if (this.executingQueue.isEmpty()) return;
        const rule = this.executingQueue.dequeue()!;
        try {
            // Равно ли время между текущим и предыдущим запуском нужному интервалу
            if (intervalOfExecutedRuleElapsed(rule)) {
                rule.lastExecution = new Date();
                await rule.execute();
            } else this.executingQueue.enqueue(rule);
        } catch (e) {
            Logger.error('Ошибка во время работы правила!')
        } finally {
            this.executedQueue.enqueue(rule);
        }
    }

    async processExecutedRules() {
        while (!this.executedQueue.isEmpty()) {
            const rule = this.executedQueue.dequeue()!;
            if (!rule.succeed && isTimeToStop(rule.getRule())) {
                Logger.log('Время правила вышло. Перевод в режим ожидания.')
                await this.writeDirtyStatus(rule, 'Запланировано повторно');
                this.waitingQueue.enqueue(rule);
            }
            else if (!rule.succeed) {
                Logger.log('Правило не было успешно исполнено. Отправка на повторный запуск.')
                await this.writeDirtyStatus(rule, 'Выполняется');
                this.sleepingQueue.enqueue(rule);
            }
        }
    }

    async processSleepingRules() {
        const temporaryQueue = new Queue<RuleDaemon>();

        while (!this.sleepingQueue.isEmpty()) {
            const ruleDaemon = this.sleepingQueue.dequeue()!;

            // Проверяем, истёк ли интервал между последним выполнением и текущим моментом
            if (intervalOfExecutedRuleElapsed(ruleDaemon)) {
                this.executingQueue.enqueue(ruleDaemon);
            } else {
                // Если интервал не истёк, возвращаем в sleepingQueue
                temporaryQueue.enqueue(ruleDaemon);
            }
        }

        // Возвращаем оставшиеся правила обратно в `sleepingQueue`
        while (!temporaryQueue.isEmpty()) {
            this.sleepingQueue.enqueue(temporaryQueue.dequeue()!);
        }
    }

    async writeDirtyStatus(daemon: RuleDaemon, status: string) {
        const rule = daemon.getRule();
        try {
            void this.ruleRepository.update(rule.id, {status: status})
        } catch (e) {}
    }
}
