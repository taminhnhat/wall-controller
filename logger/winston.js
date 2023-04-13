require('dotenv').config({ path: './.env' });
const { format } = require('logform');
const winston = require('winston');
const myFormat = winston.format.printf(({ level, message, timestamp, error, value }) => {
    let res = `${timestamp} ${level.toUpperCase()} ${message}`
    if (error != undefined) res += ` ${JSON.stringify(error)}`
    if (value != undefined) res += ` ${JSON.stringify(value)}`
    return res
})
const myErrorFormat = winston.format.printf(error => `${error.timestamp} ${error.level.toUpperCase()} ${error.message} ${error.value}`)
const myWarningFormat = winston.format.printf(warning => `${warning.timestamp} ${warning.level.toUpperCase()} ${warning.message} ${warning.value}`)
const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'DD/MM/YYYY hh:mm:ss A' }),
        winston.format.json(),
        myFormat
    ),
    transports: [
        //
        // - Write all logs with importance level of `error` or less to `error.log`
        // - Write all logs with importance level of `info` or less to `combined.log`
        //
        new winston.transports.File({ filename: './logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: './logs/combined.log' }),
    ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.timestamp({ format: 'hh:mm:ss A' }),
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp, error, value }) => {
                let res = `${timestamp} ${level} ${message}`
                if (error != undefined) res += ` ${JSON.stringify(error)}`
                if (value != undefined) res += ` ${JSON.stringify(value)}`
                return res
            })
        )
    }))
}

logger.exceptions.handle(
    new winston.transports.File({ filename: './logs/exceptions.log' })
)

module.exports = logger;