import {DataSource} from "typeorm";
import {Queue} from "./Queue";
import {RuleDaemon} from "./RuleDaemon";

export class DaemonGateway {

    // Очередь ожидания
    private waitingQueue: Queue<RuleDaemon> = new Queue();
    // Очередь исполнения
    private executingQueue: Queue<RuleDaemon> = new Queue();
    // Очередь пост-исполнения
    private executedQueue: Queue<RuleDaemon> = new Queue();

    constructor(private datasource: DataSource, private pollingIntervalMs: number) {}

    public async bootstrap() {

    }

}
