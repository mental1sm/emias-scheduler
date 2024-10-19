import {User} from "../entity/User";
import {EmiasRule} from "../entity/EmiasRule";
import {DataSource} from "typeorm";
import {DaemonGateway} from "./DaemonGateway";
import {Logger} from "./Logger";


const AppDataSource = new DataSource({
    type: "sqlite",
    database: "database.sqlite",
    synchronize: true,
    logging: false,
    entities: [User, EmiasRule],
    subscribers: [],
    migrations: [],
});

AppDataSource.initialize().then(async (datasource) => {
    Logger.log('Запуск демона...')
    const gateway = new DaemonGateway(datasource, 2000);
    await gateway.bootstrap();
    Logger.log('Демон запущен!')
});