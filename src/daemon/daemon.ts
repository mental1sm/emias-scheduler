import {User} from "../entity/User";
import {LdpRule} from "../entity/LdpRule";
import {EmiasClient} from "../client/EmiasClient";
import {DataSource} from "typeorm";
import {RuleMatch} from "../types/RuleMatch";
import {AppointmentDto} from "../types/AppointmentDto";

const AppDataSource = new DataSource({
    type: "sqlite",
    database: "database.sqlite",
    synchronize: true,
    logging: false,
    entities: [User, LdpRule],
    subscribers: [],
    migrations: [],
});

AppDataSource.initialize().then(async (d) => {
    const ruleRepository = AppDataSource.getRepository(LdpRule);
    const rules = await ruleRepository.find();

    console.log('Демон запущен...');

    if (rules.length > 0) {
        const rule = rules[0];
        const [targetHours, targetMinutes] = rule.initTime.split(':').map(Number);
        console.log(`Правило будет запущено в ${targetHours}:${targetMinutes}`);
    }

    // Функция для проверки времени и запуска executeRule
    const checkTimeAndExecute = async () => {
        const rules = await ruleRepository.find();
        if (rules.length === 0) return;
        const rule = rules[0];

        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();

        // Получаем время запуска из правила
        const [targetHours, targetMinutes] = rule.initTime.split(':').map(Number);

        if (currentHours === targetHours && currentMinutes === targetMinutes) {
            console.log("Наступило время! Запускаем поток executeRule");

            // Запускаем executeRule каждые 2 секунды
            const executionIntervalId = setInterval(async () => {
                const success = await executeRule(rule);

                // Если успешно, то отключаем оба таймера
                if (success) {
                    console.log("Запись прошла успешно, останавливаем таймеры.");
                    clearInterval(executionIntervalId);
                    clearTimeout(timeoutId); // Останавливаем таймер завершения через 5 минут
                    await ruleRepository.remove(rule); // Удаляем правило после успешного выполнения
                }
            }, 2000);

            // Останавливаем поток через 5 минут, если успешной записи не было
            const timeoutId = setTimeout(() => {
                console.log("Поток executeRule остановлен через 5 минут без успеха");
                clearInterval(executionIntervalId);
            }, 300000); // 5 минут = 300 000 мс
        }
    };

    // Таймер для проверки каждые 2 секунды, наступило ли нужное время
    const intervalId = setInterval(() => checkTimeAndExecute(), 2000);
});


async function executeRule(rule: LdpRule): Promise<boolean> {
    let success = false;
    const user = await rule.user;
    const matches = await matchRooms(rule, user);

    try {
        for (const match of matches) {
            if (success) break; // Если уже успешно записались, прерываем цикл
            success = await matchTimeAndCreateAppointment(match, user, rule);
        }
    } catch (e) {
        console.error("Ошибка при выполнении правила:", e);
    }

    return success; // Возвращаем результат выполнения (успех или нет)
}

async function matchRooms(rule: LdpRule, user: User) {
    try {
        const emiasClient = EmiasClient.instance();
        if (!user || !rule) return [];
        const response = await emiasClient.getDoctorsInfo(user, rule.referralId);
        const matches: RuleMatch[] = [];

        response.data.result.forEach(result => {
            result.complexResource.forEach(resource => {
                if (resource.room) {
                    if (
                        resource.room.defaultAddress.toLowerCase().includes(rule.locationCriteria.toLowerCase()) ||
                        resource.room.lpuShortName.toLowerCase().includes(rule.locationCriteria.toLowerCase())) {
                        const match: RuleMatch = {
                            referralId: rule.referralId,
                            availableResourceId: result.id,
                            complexResourceId: resource.id
                        };
                        matches.push(match);
                    }
                }
            });
        });

        return matches;
    } catch (e) {
        console.log('Ошибка при поиске доступных кабинетов!')
        return [];
    }
}

async function matchTimeAndCreateAppointment(match: RuleMatch, user: User, rule: LdpRule): Promise<boolean> {
    const emiasClient = EmiasClient.instance();
    if (!user || !match) return false;
    const response = await emiasClient.getTimeInfo(user, match);

    const appointmentDtoList: AppointmentDto[] = [];

    response.data.result.scheduleOfDay.forEach(schedule => {
        schedule.scheduleBySlot.forEach(scheduleBySlot => {
            scheduleBySlot.slot.forEach(slot => {
                if (isTimeInInterval(rule.timeRange, slot.startTime.toString())) {
                    const appointment: AppointmentDto = {
                        match: match,
                        slot: slot
                    };
                    appointmentDtoList.push(appointment);
                }
            });
        });
    });

    for (const adl of appointmentDtoList) {
        try {
            const appointmentResponse = await emiasClient.createAppointment(user, adl);
            if (appointmentResponse.status === 200) {
                return true; // Успешная запись, возвращаем true и останавливаем процесс
            }
        } catch (e) {
            console.log('Ошибка при записи!');
        }
    }

    return false;
}


function isTimeInInterval(interval: string, timestamp: string): boolean {
    // Разбираем интервал на начало и конец
    const [startTime, endTime] = interval.split('-').map(time => time.trim());

    // Проверка, что интервал корректный
    if (!startTime || !endTime) {
        console.error("Некорректный формат интервала");
        return false;
    }

    // Парсим начало и конец интервала в часы и минуты
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    // Проверка корректности значений времени
    if (isNaN(startHours) || isNaN(startMinutes) || isNaN(endHours) || isNaN(endMinutes)) {
        //console.error("Некорректные значения времени в интервале");
        return false;
    }

    // Проверка, что timestamp корректный
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
        //console.error("Некорректная временная метка");
        return false;
    }

    // Получаем текущее время в timestamp
    const hours = date.getHours();
    const minutes = date.getMinutes();

    // Преобразуем всё в минуты с начала дня для удобства сравнения
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    const currentTotalMinutes = hours * 60 + minutes;


    // Если интервал не переходит через полночь
    if (startTotalMinutes <= endTotalMinutes) {
        return currentTotalMinutes >= startTotalMinutes && currentTotalMinutes <= endTotalMinutes;
    } else {
        // Если интервал перекрывает полночь (например, "22:00-02:00")
        return currentTotalMinutes >= startTotalMinutes || currentTotalMinutes <= endTotalMinutes;
    }
}
