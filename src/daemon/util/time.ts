import {EmiasRule} from "../../entity/EmiasRule";
import {RuleDaemon} from "../RuleDaemon";

export function isTimeInInterval(interval: string, timestamp: string): boolean {
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

export function isTimeToRun(rule: EmiasRule) {
    if (rule.initTime === '$') return true;
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    // Получаем время запуска из правила
    const [targetHours, targetMinutes] = rule.initTime.split(':').map(Number);

    return  currentHours === targetHours && currentMinutes === targetMinutes
}

export function isTimeToStop(rule: EmiasRule) {
    if (rule.initTime === '$') return false;
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    const [targetHours, targetMinutes] = rule.stopTime.split(':').map(Number);

    return currentHours === targetHours && currentMinutes === targetMinutes
}

export function intervalOfExecutedRuleElapsed(ruleDaemon: RuleDaemon) {
    if (!ruleDaemon.lastExecution) return true;
    const currentTime = new Date();
    const elapsedTime = currentTime.getTime() - ruleDaemon.lastExecution.getTime();
    return  elapsedTime >= (ruleDaemon.executionIntervalMs * 1000);
}

export function matchTime(rule: EmiasRule, date: string) {
    const [wantedDay, wantedMonth, wantedYear] = rule.wantedStartDate.split('.').map(Number);
    const [year, month, day] = date.split('-').map(Number);

    const wantedDate = new Date(wantedYear, wantedMonth - 1, wantedDay);
    const currentDate = new Date(year, month - 1, day);

    return currentDate >= wantedDate;
}