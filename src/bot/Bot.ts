import {DataSource} from "typeorm";
import {EmiasClient} from "../client/EmiasClient";
import {User} from "../entity/User";
import {EmiasRule} from "../entity/EmiasRule";
import {Telegraf} from "telegraf";
import {BotSharedMemory} from "./BotSharedMemory";
import {BotCommands} from "./BotCommands";
import {BotCallbacks} from "./BotCallbacks";
import {BotOnMessage} from "./BotOnMessage";

export class Bot {
    private emiasClient = EmiasClient.instance();
    private readonly userRepository;
    private ruleRepository;
    private readonly bot;
    private memory: BotSharedMemory;

    constructor(dataSource: DataSource, whitelist: string[], token: string) {
        this.userRepository = dataSource.getRepository(User);
        this.ruleRepository = dataSource.getRepository(EmiasRule);
        this.bot = new Telegraf(token);
        this.memory = new BotSharedMemory(whitelist);
    }

    async bootstrap() {
        console.log('Бот запускается...');
        await this.initBot();
        await this.bot.launch(() => {
            console.log('Готово!');
        });
    }

    async stop() {
        this.bot.stop();
    }

    async initBot() {
        new BotCommands(this.memory, this.userRepository, this.ruleRepository, this.emiasClient).init(this.bot);
        new BotCallbacks(this.memory, this.userRepository, this.ruleRepository, this.emiasClient).init(this.bot);
        new BotOnMessage(this.memory).init(this.bot);
    }
}