import winston, { format } from "winston";
const util = require('node:util'); 

const debugFormat = format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.printf(({ level, message, timestamp }) => `${timestamp.toString()} : ${util.inspect(message)}`)
)

const file = new winston.transports.File({
    filename: `${new Date().toString()}.log`, level: "debug", format: debugFormat
})
const console = new winston.transports.Console({ level: "info", format: format.combine(format.simple(), format.printf(({message}) => message)) })

export const logger = winston.createLogger({
    //   defaultMeta: { service: "user-service" },
    transports: [
        file,
        console
    ],
});

export const verbose = () => {
    logger.remove(console);
    logger.add(new winston.transports.Console({ level: "debug", format: debugFormat }));
};