import {Connection} from "typeorm";

export class UserService {
    private connection: Connection;
    private static _instance: UserService;
    private constructor() {
    }
    public static instance(): UserService {
        if (UserService._instance === null) {
            UserService._instance = new UserService();
        }
        return UserService._instance;
    }
}