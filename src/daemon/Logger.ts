export class Logger {

    static currentTime() {
        const time = new Date();
        const date = time.getDate();
        const month = time.getMonth();
        const year = time.getFullYear();

        const hours = time.getHours();
        const minutes = time.getMinutes();
        const seconds = time.getSeconds();

        function nullify(n: number) {
            return n < 10 ? '0' + n : n;
        }

        return `${nullify(date)}.${nullify(month)}.${time.getFullYear()}] [${nullify(hours)}:${nullify(minutes)}:${nullify(seconds)}.${time.getMilliseconds()}`
    }

    static log(msg: string) {
        console.log(`[LOG] [${Logger.currentTime()}] ${msg}`);
    }

    static debug(msg: string) {
        console.log(`[DEBUG] [${Logger.currentTime()}] ${msg}`);
    }

    static warn(msg: string) {
        console.log(`[WARN] [${Logger.currentTime()}] ${msg}`);
    }

    static error(msg: string) {
        console.log(`[ERROR] [${Logger.currentTime()}] ${msg}`);
    }
}