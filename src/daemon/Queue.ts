export class Queue<T> {
    private items: T[] = [];

    constructor() {}

    /**
     * Добавить в конец
     * @param item
     */
    enqueue(item: T) {
        this.items.push(item);
    }

    /**
     * Извлечь первый элемент
     */
    dequeue(): T | undefined {
        return this.items.shift();
    }

    /**
     * Проверка на отсутствие элементов
     */
    isEmpty(): boolean {
        return this.items.length === 0;
    }

    /**
     * Возвращает первый элемент без удаления из очереди
     */
    peek(): T | undefined {
        return this.items[0];
    }

    /**
     * Возвращает размер очереди
     */
    size(): number {
        return this.items.length;
    }

    /**
     * Map прокси
     */
    map(clb: (item: T) => T): T[] {
        return this.items.map(item => clb(item));
    }
}