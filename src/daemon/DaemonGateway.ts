import {DataSource, Repository} from "typeorm";
import {Queue} from "./Queue";
import {RuleDaemon} from "./RuleDaemon";
import {EmiasRule} from "../entity/EmiasRule";
import {intervalOfExecutedRuleElapsed, isTimeToRun, isTimeToStop} from "./util/time";

export class DaemonGateway {

    // Очередь ожидания
    private waitingQueue: Queue<RuleDaemon> = new Queue();
    // Очередь исполнения
    private executingQueue: Queue<RuleDaemon> = new Queue();
    // Очередь выполненных правил
    private executedQueue: Queue<RuleDaemon> = new Queue();

    private readonly ruleRepository: Repository<EmiasRule>;

    constructor(private datasource: DataSource, private pollingIntervalMs: number) {
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
    }

    private async checkRulesFromDatabase() {
        const rules = await this.ruleRepository.find();
        rules.forEach(rule => {
            if (!this.existsInQueues(rule)) {
                console.log(`Запланировано новое правило на ${rule.initTime}!`)
                const ruleDaemon = new RuleDaemon(this.ruleRepository, rule);
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
            if (isTimeToRun(rule.getRule())) this.executingQueue.enqueue(rule);
            else this.waitingQueue.enqueue(rule);
        }
    }

    private existsInQueues(rule: EmiasRule): boolean {
        const predicate = (r: RuleDaemon) => r.getRuleId() === rule.id;
        return !!(
            this.executingQueue.find(r => predicate(r))
            || this.executedQueue.find(r => predicate(r))
            || this.waitingQueue.find(r => predicate(r))
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
            console.log('Ошибка во время работы правила!')
            console.log(e)
        } finally {
            this.executedQueue.enqueue(rule);
        }
    }

    async processExecutedRules() {
        while (!this.executedQueue.isEmpty()) {
            const rule = this.executedQueue.dequeue()!;
            if (!rule.succeed && isTimeToStop(rule.getRule())) {
                console.log('Время правила вышло. Перевод в режим ожидания.')
                this.waitingQueue.enqueue(rule);
            }
            else if (!rule.succeed) {
                console.log('Правило не было успешно исполнено. Отправка на повторный запуск.')
                this.executingQueue.enqueue(rule);
            }
        }
    }
}
