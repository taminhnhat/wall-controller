class Logger{
    constructor(){
        //
    }
    #createLog(message, location, level, value){
        if(value != undefined)
        return `${Date(Date.now())}\t|\t${level.toUpperCase()}\t|\tat:${location}\t|\tmessage:${message}\t|\tval:${JSON.stringify(value)}`;
        else 
        return `${Date(Date.now())}\t|\t${level.toUpperCase()}\t|\tat:${location}\t|\tmessage:${message}`;
    }
    info(message, location, value){
        console.log(this.#createLog(message, location, 'info', value));
        //if(value != undefined) console.log(JSON.stringify(value));
    }
    debug(message, location, value){
        console.log(this.#createLog(message, location, 'debug', value));
        //if(value != undefined) console.log(JSON.stringify(value));
    }
    waring(message, location, value){
        console.log(this.#createLog(message, location, 'warning', value));
        //if(value != undefined) console.log(JSON.stringify(value));
    }
    error(message, location, value){
        console.log(this.#createLog(message, location, 'error', value));
        //if(value != undefined) console.log(JSON.stringify(value));
    }
    fatal(message, location, value){
        console.log(this.#createLog(message, location, 'fatal', value));
        //if(value != undefined) console.log(JSON.stringify(value));
    }
}

const logger = new Logger();

module.exports = logger;