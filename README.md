# Внимание
### На момент 2025 года не работает!
## Windows
Установить node.js версии 18 или выше
Распаковать dist, перейти в папку и запустить
```bash
npm i sqlite3
```
В config.json следовать шагам в разделе Config
```bash
node bot.js
```
```bash
node daemon.js
```

## Config
В поле token требуется ввести токен telegram бота
В поле whitelist нужно вписать массив из никнеймов, которым будет разрешено пользоваться ботом. Никнейм "$" означает отключение whitelist

## Linux (Ubuntu)
Установить на сервер node.js версии 18 или выше
Распаковать dist и открыть терминал, перейти к dist
```bash
scp -r ./** user@ip:/path
```
На сервере перейти в папку, куда скопировали приложение
Настроить файлы .service так, как удобно, чтобы все пути совпадали
 ```bash
 cp ./*.service /etc/systemd/system
 ```
 ```bash
 npm i sqlite3
 ```
 В config.json следовать шагам в разделе Config
```bash
 systemctl daemon-reload
```
```bash
systemctl start emias-bot.service && systemctl start emias-daemon.service
```

Если нужно перезагрузить с новым конфигом, то systemctl restart emias-bot.service
Можно включить автоматическую загрузку при помощи 
```bash
sudo systemctl enable emias-bot.service && sudo systemctl enable emias-daemon.service
``` 
