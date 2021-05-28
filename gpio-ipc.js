/**
 * Read from "../pipe/fifo1"
 * Write to "../pipe/fifo2"
 */
const fs              = require('fs');
const { spawn, fork } = require('child_process');
const event = require('./event');
const logger = require('./logger/logger');

const message = require('./message');

let {accessWallByName, accessWallByPosition} = require('./wallApi');

let gpioBitmap = require('./gpioMap');

const write_pipe_path = './pipe/pipe_emit_light';
const read_pipe_path = './pipe/pipe_button_callback';
let readfifo = spawn('mkfifo', [read_pipe_path]);

readfifo.on('exit', function(status) {
    logger.debug('Created read named-pipe from GPIO');

    const fd   = fs.openSync(read_pipe_path, 'r+');
    let fifoRs = fs.createReadStream(null, { fd });
    let fifoWs = fs.createWriteStream(write_pipe_path);

    logger.debug('Created write named-pipe to GPIO');

    fifoRs.on('data', mess => {
        logger.debug('Message from pipe', String(mess));
        const messarr = String(mess).split(':');
        const buttonCoor = messarr[1];
        if(buttonCoor.split('.')[0] == 'W'){
            const wallSide = messarr[2].trim();
            const buttonEventName = `button:${wallSide}`;
            const tempParams = message.generateButtonParams(buttonCoor);
            event.emit(buttonEventName, tempParams);
        }
        else if(buttonCoor.split('.')[0] == 'U'){
            const buttonEventName = 'button:user';
            const tempParams = message.generateButtonParams(buttonCoor);
            event.emit(buttonEventName, tempParams);
        }
    });

    fifoWs.on('error', function(err){
        logger.debug('error at writing pipe', err);
    });
    
    
    /**
     * Handle 'light:on' event
     * emitted in index.js
     * Turn on light with input params
     */
     event.on('light:on', function(lightParams){
        logger.debug('light on event', lightParams);
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
        logger.debug('light off event', lightParams);
        const wallPosition = lightParams.wall;
        const wallSide = lightParams.side;
        emitLightToPipe(wallPosition, wallSide, 'off');
    });

    event.on('light:reload', function(lightParams){
        const wallSide = lightParams.side;
        logger.debug('light:set event');
        const lightBitmap = gpioBitmap.getBitmap(wallSide);
        //  generate message
        const mess = `light:${lightBitmap}:${wallSide}`;
        //  write message to named-pipe
        fifoWs.write(mess);
    });

    event.on('light:set', function(lightParams){
        logger.debug('light init event', lightParams);
        const lightBitmap = lightParams.bitmap;
        const wallSide = lightParams.side;
        //  Emit message to named-pipe
        const mess = `light:${lightBitmap}:${wallSide}`;
        fifoWs.write(mess);
    });
    
    /**
     * Handle 'light:test' event
     * emitted in index.js
     * Turn on all the lights on wall
     */
    event.on('light:test', function(wallSide){
        gpioBitmap.bitmapSet(2**32-1, wallSide);
        const mess = `light:${gpioBitmap.getBitmap(wallSide)}:${wallSide}`;
        fifoWs.write(mess);
    });

    event.on('light:error', function(lightParams){
        const errorLightIndex = lightParams.status;
        const wallSide = lightParams.side;
        let greenLight = false, redLight = false;
        switch(status){
            case 'error':
                greenLight = false;
                redLight = true;
                emitErrorToPipe(greenLight, redLight, wallSide);
                break;
            case 'warning':
                greenLight = 'ignore';
                redLight = true;
                emitErrorToPipe(greenLight, redLight, wallSide);
                break;
            case 'ok':
                greenLight = true;
                redLight = false;
                emitErrorToPipe(greenLight, redLight, wallSide);
                break;
            default:
                //
        }
    });
    
    /**
     * Emit a light message to C++ process via named-pipe
     * @param {String} wallPosition eg: 'W.1.1'
     * @param {String} wallSide 'front'|'back'
     */
    function emitLightToPipe(wallPosition, wallSide, lightState){
        //logger.debug('generating', wallPosition, wallSide, lightState);
        //logger.debug('get wall', accessWallByPosition(wallPosition).getName());
        const lightIndex = accessWallByPosition(wallPosition).getIndex();
        //logger.debug('light index', lightIndex)
        //  generate light bitmap of wall
        gpioBitmap.bitmapGenerate(lightIndex, wallSide, lightState);
        //  get light bitmap of wall
        const lightBitmap = gpioBitmap.getBitmap(wallSide);
        //  generate message
        const mess = `light:${lightBitmap}:${wallSide}`;
        //  write message to named-pipe
        fifoWs.write(mess);
        logger.debug('emit message to pipe:', mess, lightBitmap.toString(2));
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
        const mess = `light:${gpioBitmap.getBitmap(wallSide)}:${wallSide}`;
        fifoWs.write(mess);
        logger.debug('emit message to pipe:', mess, lightBitmap.toString(2));
    }
});
