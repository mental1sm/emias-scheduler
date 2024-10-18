import {User} from "../entity/User";
import {EmiasRule} from "../entity/EmiasRule";
import {DataSource} from "typeorm";
import {DaemonGateway} from "./DaemonGateway";


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
    const gateway = new DaemonGateway(datasource, 2000);
    console.log("Запуск демона...")
    await gateway.bootstrap();
    console.log("Демон запущен")
});