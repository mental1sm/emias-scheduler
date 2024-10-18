import {DataSource} from "typeorm";
import {User} from "./entity/User";
import {EmiasRule} from "./entity/EmiasRule";
import {Bot} from "./bot/Bot";


const token = "8093829634:AAEoIC9A-t_S54u5GdMaJG2XLKHytK5oFyU";
const whitelist = ['karsus'];

const AppDataSource = new DataSource({
    type: "sqlite",
    database: "database.sqlite",
    synchronize: true,
    logging: false,
    entities: [User, EmiasRule],
    subscribers: [],
    migrations: [],
});


AppDataSource.initialize().then(async (dataSource) => {
    const bot = new Bot(dataSource, whitelist, token);
    await bot.bootstrap();
});