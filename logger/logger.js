const PRODUCTION_MODE = false;

class Logger{
    constructor(){
        //
    }
    #createLog(message, location, level, value){
        if(!PRODUCTION_MODE){
            console.log(message);
            if(value != null) console.log(value);
        }
        else{
            let logtext = `${Date(Date.now())}\t${level.toUpperCase()}`;
            if(location != null){
                logtext += `\tat:${location}`;
            }
            logtext += `\t\tmessage:${message}`;
            if(value != null){
                logtext += `\t\tvalue:${JSON.stringify(value)}`;
            }
            console.log(logtext);
        }
    }
    info(obj){
        const {message, location = null, value = null} = obj;
        this.#createLog(message, location, 'info', value);
        //if(value != undefined) console.log(JSON.stringify(value));
    }
    debug(obj){
        const {message, location = null, value = null} = obj;
        this.#createLog(message, location, 'debug', value);
        //if(value != undefined) console.log(JSON.stringify(value));
    }
    waring(obj){
        const {message, location = null, value = null} = obj;
        this.#createLog(message, location, 'warning', value);
        //if(value != undefined) console.log(JSON.stringify(value));
    }
    error(obj){
        const {message, location = null, value = null} = obj;
        this.#createLog(message, location, 'error', value);
        //if(value != undefined) console.log(JSON.stringify(value));
    }
    fatal(obj){
        const {message, location = null, value = null} = obj;
        this.#createLog(message, location, 'fatal', value);
        //if(value != undefined) console.log(JSON.stringify(value));
    }
}

const logger = new Logger();

module.exports = logger;