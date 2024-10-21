import {DataSource} from "typeorm";
import {User} from "./entity/User";
import {EmiasRule} from "./entity/EmiasRule";
import {Bot} from "./bot/Bot";
const path = require('path')
const fs = require('fs')

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')));


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
    const bot = new Bot(dataSource, config.whitelist, config.token);
    await bot.bootstrap();
});