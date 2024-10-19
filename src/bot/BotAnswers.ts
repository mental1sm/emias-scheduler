import {EmiasRule} from "../entity/EmiasRule";

export const Answers = {
    criteriaText: () => {
        return 'Введите критерий поиска.\n\n' +
            'Пример:' +
            '\nОригинальное название: Москва, Измайловский проспект, д. 63' +
            '\nОригинальное учреждение: ГБУЗ ГП 191 Ф 3 (ГП 182)' +
            '\n\nВаш критерий: измайловс' +
            '\n\nЕсли запись к конкретному врачу, то тогда нужно писать часть фамилии врача, не всю.'
    },
    ruleCard: (rule: EmiasRule, currentIndex: number, maxIndex: number) => {
        return `Правило [${currentIndex + 1} из ${maxIndex}]` +
            `\n\nНаправление: ${rule.targetName}` +
            `\n\nКритерий поиска: ${rule.criteria}` +
            `\n\nВремя записи: ${rule.timeRange}` +
            `\nВремя запуска скрипта: ${rule.initTime}` +
            `\nВремя останова скрипта: ${rule.stopTime}` +
            `\n\nИнтервал: ${rule.pollInterval} секунд` +
            `\n\nСтатус: [${rule.status ? rule.status : '???'}]`
    }
}