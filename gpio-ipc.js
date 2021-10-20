/**
 * Using named-pipe to communicate with gpio process
 * Read from "/tmp/gpio_callback"
 * Write to "/tmp/emit_gpio"
 */

require('dotenv').config({path: './CONFIGURATIONS.env'});
const fs              = require('fs');
const { spawn, fork } = require('child_process');
const event = require('./event');
const logger = require('./logger/logger');
const FILE_NAME = 'gpio-ipc.js';

const message = require('./message');

let {accessWallByName, accessWallByLocation} = require('./wallApi');

let gpioBitmap = require('./gpioMap');

const write_pipe_path = process.env.EMIT_GPIO_NAMED_PIPE_PATH;
const read_pipe_path = process.env.GPIO_CALLBACK_NAMED_PIPE_PATH;
let readfifo = spawn('mkfifo', [read_pipe_path]);

readfifo.on('exit', function(status) {
    //logger.debug({message: 'Created read named-pipe from GPIO', location: FILE_NAME});

    const fd   = fs.openSync(read_pipe_path, 'r+');
    let fifoRs = fs.createReadStream(null, { fd });
    let fifoWs = fs.createWriteStream(write_pipe_path);

    //logger.debug({message: 'Created write named-pipe to GPIO', location: FILE_NAME});
    logger.debug({message: 'Connected to GPIO process', location: FILE_NAME});

    fifoRs.on('data', mess => {
        logger.debug({message: 'message from pipe', value: String(mess), location: FILE_NAME});
        //  button:W.1.1 | button:U.1.1
        const messarr = String(mess).trim().split(':');
        const buttonLocation = messarr[1];

        const fistDigitOfLocation = buttonLocation.split('.')[0];

        try{
            if(fistDigitOfLocation == 'W'){
                const raw_wallSide = messarr[2];
                const isWallSideValid = raw_wallSide !== 'front' && raw_wallSide !== 'back';
                if(isWallSideValid) throw {error: 'Not a valid message from pipe!', describe: `missing wall side`};
                const wallSide = raw_wallSide;
                const buttonEventName = `button:${wallSide}`;
                const tempParams = message.generateButtonParams(buttonLocation, wallSide);
                event.emit(buttonEventName, tempParams);
            }
            else if(fistDigitOfLocation == 'U'){
                const buttonEventName = 'button:user';
                const tempParams = message.generateButtonParams(buttonLocation, 'cabin');
                event.emit(buttonEventName, tempParams);
            }
            else{
                throw {error: 'Not a valid message from pipe!', describe: `at "${buttonLocation}"`};
            }
        }
        catch(err){
            logger.error({message: 'Error reading from pipe', location: FILE_NAME, value: err});
        }
    });

    fifoWs.on('error', function(err){
        logger.debug({message: 'error at writing pipe', location: FILE_NAME, value: err});
    });
    
    /**
     * Handle 'light:on' event
     * emitted in index.js
     * Turn on light with input params
     */
     event.on('light:on', function(lightParams){
        logger.debug({message: 'light:on event', location: FILE_NAME, value: lightParams});
        const wallPosition = lightParams.wall;
        const wallSide = lightParams.side;
        emitLightToPipe(wallPosition, wallSide, 'on');
    });
    
    /**
     * Handle 'light:off' event
     * 
     * emitted in index.js
     * Turn off light with input params
     */
    event.on('light:off', function(lightParams){
        logger.debug({message: `'light:off' event`, location: FILE_NAME, value: lightParams});
        const wallPosition = lightParams.wall;
        const wallSide = lightParams.side;
        emitLightToPipe(wallPosition, wallSide, 'off');
    });

    event.on('light:reload', function(lightParams){
        const wallSide = lightParams.side;
        logger.debug({message: `'light:reload' event`, location: FILE_NAME});
        //  get light bitmap 
        const lightBitmap = gpioBitmap.getBitmap(wallSide);
        //  generate message
        const mess = `light:${lightBitmap}:${wallSide}\n`;
        //  write message to named-pipe
        fifoWs.write(mess);
    });

    event.on('light:set', function(lightParams){
        logger.debug({message: `'light:set' event`, location: FILE_NAME, value: lightParams});
        const lightBitmap = lightParams.bitmap;
        const wallSide = lightParams.side;
        //  Set bimap
        gpioBitmap.bitmapSet(lightBitmap, wallSide);
        //  Emit message to named-pipe
        const mess = `light:${lightBitmap}:${wallSide}\n`;
        fifoWs.write(mess);
    });
    
    /**
     * Handle 'light:test' event
     * emitted in index.js
     * Turn on all the lights on wall
     */
    event.on('light:test', function(lightParams){
        logger.debug({message: `'light:test' event`, location: FILE_NAME, value: lightParams});
        const wallSide = lightParams.side;
        gpioBitmap.bitmapSet(2**32-1, wallSide);
        const mess = `light:${gpioBitmap.getBitmap(wallSide)}:${wallSide}\n`;
        fifoWs.write(mess);
    });

    /**
     * lightParams{
     *  status: _status,
     *  side: _side
     * }
     * 
     * _status: 'error'|'warning'|'normal'
     * _side: 'front'|'back'
     */
    event.on('towerlight:set', function(lightParams){
        logger.debug({message: `'towerlight:set' event`, location: FILE_NAME, value: lightParams});
        const errorLightStatus = lightParams.status;
        const wallSide = lightParams.side;
        let greenLight = false, redLight = false;
        switch(errorLightStatus){
            case 'error':
                /**
                 * Turn off green light and turn on red light
                 */
                greenLight = false;
                redLight = true;
                emitErrorToPipe(greenLight, redLight, wallSide);
                break;
            case 'warning':
                /**
                 * Turn on red light but ignore green light
                 */
                greenLight = 'ignore';
                redLight = true;
                emitErrorToPipe(greenLight, redLight, wallSide);
                break;
            case 'normal':
                /**
                 * Turn on green light and turn off red light
                 */
                greenLight = true;
                redLight = false;
                emitErrorToPipe(greenLight, redLight, wallSide);
                break;
            default:
                logger.waring({message: `bad params for 'towerlight:set' event`, location: FILE_NAME, value: lightParams});
        }
    });

    event.on('lcd:print', function(data){
        logger.debug({message: `'lcd:print' event`, location: FILE_NAME, value: data});
        emitLcdPrintToPipe(data.message);
    });
    
    /**
     * Emit a light message to C++ process via named-pipe
     * @param {String} wallPosition eg: 'W.1.1'
     * @param {String} wallSide 'front'|'back'
     */
    function emitLightToPipe(wallPosition, wallSide, lightState){
        const lightIndex = accessWallByLocation(wallPosition).getIndex();
        //  generate light bitmap of wall
        gpioBitmap.bitmapGenerate(lightIndex, wallSide, lightState);
        //  get light bitmap of wall
        const lightBitmap = gpioBitmap.getBitmap(wallSide);
        //  create message
        const mess = `light:${lightBitmap}:${wallSide}\n`;
        //  write message to named-pipe
        fifoWs.write(mess);
        logger.debug({message: 'emit message to pipe:', location: FILE_NAME, value: mess});
    }

    function emitLcdPrintToPipe(data){
        //  create message
        const mess = `lcd:${data}\n`;
        fifoWs.write(mess);
        logger.debug({message: 'emit message to pipe:', location: FILE_NAME, value: mess});
    }

    function emitErrorToPipe(greenLight, redLight, wallSide){
        //  generate green light status
        if(greenLight != 'ignore'){
            let greenLightState;
            if(greenLight) greenLightState = 'on';
            else greenLightState = 'off'
            gpioBitmap.bitmapGenerate(30, wallSide, greenLightState);
        }
        //  generate red light status
        let redLightState;
        if(redLight) redLightState = 'on';
        else redLightState = 'off';
        gpioBitmap.bitmapGenerate(31, wallSide, redLightState);
        //  get light bitmap of wall
        const lightBitmap = gpioBitmap.getBitmap(wallSide);
        //  generate message
        const mess = `light:${gpioBitmap.getBitmap(wallSide)}:${wallSide}\n`;
        fifoWs.write(mess);
        logger.debug({message: 'emit message to pipe:', location: FILE_NAME, value: mess});
    }
});
