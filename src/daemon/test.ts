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

// Пример использования:
console.log(isTimeInInterval("22:00-06:00", "2024-10-31T23:50:00+03:00")); // true
console.log(isTimeInInterval("10:00-15:00", "2024-10-31T12:50:00+03:00")); // true
console.log(isTimeInInterval("10:00-16:00", "2024-10-31T08:50:00+03:00")); // false