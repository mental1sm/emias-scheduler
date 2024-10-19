const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');

const botCmd = "ncc build ./src/index.ts -o ./dist && cd dist && ren index.js bot.js && cd ..";
const daemonCmd = "ncc build ./src/daemon/daemon.ts -o ./dist && cd dist && ren index.js daemon.js && cd ..";

console.log('Убираем старые файлы')
exec('rd /s /q dist', () => {
    console.log('Начинаем билд бота')
    build(botCmd, () => {
        console.log('Начинаем билд демона')
        build(daemonCmd, () => {});
    })
});

function build(cmd, callback) {
    exec(cmd, (e, stdout, stderr) => {
        console.log('Модуль забилдился')
        if (e) {
            console.error(`Ошибка: ${e.message}`);
            return;
        }
        if (stderr) {
            console.error(`Ошибка stderr: ${stderr}`);
            return;
        }
        console.log(stdout);
        callback();
    })
}
