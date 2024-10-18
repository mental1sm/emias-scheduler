import {RegistrationState} from "../types/BotSteps";
import {Repository} from "typeorm";
import {User} from "../entity/User";
import {Context} from "telegraf";

export class RegisterChain {
    public state: RegistrationState;
    private user: User;
    private onComplete;

    constructor(private userRepository: Repository<User>, userId: number, chatId: number, onComplete:  () => Promise<void>) {
        this.user = new User();
        this.user.id = userId;
        this.user.chatId = chatId;
        this.onComplete = onComplete;
    }

    public async handleState(ctx: Context) {
        if (!ctx.text) return;
        switch (this.state) {
            case RegistrationState.AWAIT_OMS: {
                if (ctx.text.trim().length === 16) {
                    this.user.oms = ctx.text.trim();
                    this.state = RegistrationState.AWAIT_BIRTHDATE;
                    await ctx.reply("Введите дату рождения в формате 2001-01-01")
                } else {
                    await ctx.reply("Неверный формат полиса. Введите еще раз.")
                }
                break;
            }
            case RegistrationState.AWAIT_BIRTHDATE: {
                this.user.birthDate = ctx.text.trim();
                this.state = RegistrationState.NONE;
                const newUser = this.userRepository.create(this.user);
                await this.userRepository.save(this.user);
                await ctx.reply("Регистрация завершена.");
                await this.onComplete();
            }
        }
    }
}