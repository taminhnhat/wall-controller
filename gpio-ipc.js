/**
 * Using named-pipe to communicate with gpio process
 * Read from "/tmp/gpio_callback"
 * Write to "/tmp/emit_gpio"
 */

const GLOBAL = require('./CONFIGURATION');
const fs = require('fs');
const { spawn, fork } = require('child_process');
const event = require('./event');
const logger = require('./logger/logger');
const FILE_NAME = 'gpio-ipc.js';

const message = require('./message');

let gpioBitmap = require('./gpioMap');

const write_pipe_path = GLOBAL.EMIT_GPIO_NAMED_PIPE_PATH;
const read_pipe_path = GLOBAL.GPIO_CALLBACK_NAMED_PIPE_PATH;
let readfifo = spawn('mkfifo', [read_pipe_path]);

readfifo.on('exit', function (status) {

    const fileHandle = fs.openSync(read_pipe_path, 'r+');
    let fifoRs = fs.createReadStream(null, { fd: fileHandle });
    let fifoWs = fs.createWriteStream(write_pipe_path, { flags: 'w' });

    //logger.debug({message: 'Connected to GPIO process', location: FILE_NAME});
    //logger.debug({ message: 'Connected to Pipe', location: FILE_NAME });

    // Handle Reading pipe event
    fifoRs.on('data', mess => {
        logger.debug({ message: 'message from pipe', value: String(mess), location: FILE_NAME });
        //  button:W.1.1 | button:U.1.1
        const messarr = String(mess).trim().split(':');
        const buttonLocation = messarr[1];
        const fistDigitOfLocation = buttonLocation.split('.')[0];
        const tempParams = {
            button: buttonLocation
        }

        try {
            if (fistDigitOfLocation == 'W') {
                const raw_wallSide = messarr[2];
                if (raw_wallSide === 'front') {
                    event.emit('button:front', tempParams);
                } else if (raw_wallSide === 'back') {
                    event.emit('button:back', tempParams);
                } else {
                    throw { error: 'Not a valid message from pipe!', describe: `missing wall side` };
                }

            }
            else if (fistDigitOfLocation == 'U') {
                event.emit('button:user', tempParams);
            }
            else {
                throw { error: 'Not a valid message from pipe!', describe: `at "${buttonLocation}"` };
            }
        }
        catch (err) {
            logger.error({ message: 'Error reading from pipe', location: FILE_NAME, value: err });
        }
    });

    fifoRs.on('ready', function (err) {
        logger.debug({ message: 'Reading pipe is ready', location: FILE_NAME });
    });

    fifoRs.on('open', function (err) {
        logger.debug({ message: 'Reading pipe opened', location: FILE_NAME });
    });

    fifoRs.on('close', function (err) {
        logger.debug({ message: 'Reading pipe closed', location: FILE_NAME });
    });

    // Handle writing pipe event
    fifoWs.on('ready', function (err) {
        logger.debug({ message: 'Writing pipe is ready', location: FILE_NAME });
    });

    fifoWs.on('open', function (err) {
        logger.debug({ message: 'Writing pipe opened', location: FILE_NAME });
    });

    fifoWs.on('close', function (err) {
        logger.debug({ message: 'Writing pipe closed', location: FILE_NAME });
    });

    fifoWs.on('error', function (err) {
        logger.debug({ message: 'error at writing pipe', location: FILE_NAME, value: err });
    });

    /**
     * Handle 'light:on' event
     * emitted in index.js
     * Turn on light with input params
     */
    event.on('light:on', function (lightParams) {
        logger.debug({ message: 'light:on event', location: FILE_NAME, value: lightParams });
        const lightIndex = lightParams.lightIndex;
        const wallSide = lightParams.side;
        emitLightToPipe(lightIndex, wallSide, 'on');
    });

    /**
     * Handle 'light:off' event
     * 
     * emitted in index.js
     * Turn off light with input params
     */
    event.on('light:off', function (lightParams) {
        logger.debug({ message: `'light:off' event`, location: FILE_NAME, value: lightParams });
        const lightIndex = lightParams.lightIndex;
        const wallSide = lightParams.side;
        emitLightToPipe(lightIndex, wallSide, 'off');
    });

    event.on('light:reload', function (lightParams) {
        const wallSide = lightParams.side;
        logger.debug({ message: `'light:reload' event`, location: FILE_NAME });
        //  get light bitmap 
        const lightBitmap = gpioBitmap.getBitmap(wallSide);
        //  generate message
        const mess = `light:${lightBitmap}:${wallSide}\n`;
        //  write message to named-pipe
        fifoWs.write(mess);
    });

    event.on('light:set', function (lightParams) {
        logger.debug({ message: `'light:set' event`, location: FILE_NAME, value: lightParams });
        const lightBitmap = lightParams.bitmap;
        const wallSide = lightParams.side;
        //  Set bimap
        gpioBitmap.bitmapSet(lightBitmap, wallSide);
        //  Emit message to named-pipe
        const mess = `light:${lightBitmap}:${wallSide}\n`;
        fifoWs.write(mess);
    });

    /**
     * Turn light but not save light states
     * Light states return to current state after calling 'light:reload'
     */
    event.on('light:test', function (lightParams) {
        logger.debug({ message: `'light:test' event`, location: FILE_NAME, value: lightParams });
        const lightBitmap = lightParams.bitmap;
        const wallSide = lightParams.side;
        //  Emit message to named-pipe
        const mess = `light:${lightBitmap}:${wallSide}\n`;
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
    event.on('towerlight:set', function (lightParams) {
        // logger.debug({ message: `'towerlight:set' event`, location: FILE_NAME, value: lightParams });
        const errorLightStatus = lightParams.status;
        const wallSide = lightParams.side;
        let greenLight = false, redLight = false;
        switch (errorLightStatus) {
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
                logger.waring({ message: `bad params for 'towerlight:set' event`, location: FILE_NAME, value: lightParams });
        }
    });

    event.on('lcd:print', function (data) {
        logger.debug({ message: `'lcd:print' event`, location: FILE_NAME, value: data });
        emitLcdPrintToPipe(data.message);
    });

    /**
     * Emit a light message to C++ process via named-pipe
     * @param {String} wallName eg: 'W.1.1'
     * @param {String} wallSide 'front'|'back'
     */
    function emitLightToPipe(lightIndex, wallSide, lightState) {
        //  generate light bitmap of wall
        gpioBitmap.bitmapGenerate(lightIndex, wallSide, lightState);
        //  get light bitmap of wall
        const lightBitmap = gpioBitmap.getBitmap(wallSide);
        //  create message
        const mess = `light:${lightBitmap}:${wallSide}\n`;
        //  write message to named-pipe
        fifoWs.write(mess);
        logger.debug({ message: 'Write to pipe:', location: FILE_NAME, value: mess });
    }

    function emitLcdPrintToPipe(data) {
        //  create message
        const mess = `lcd:${data}\n`;
        fifoWs.write(mess);
        logger.debug({ message: 'Write to pipe:', location: FILE_NAME, value: mess });
    }

    function emitErrorToPipe(greenLight, redLight, wallSide) {
        //  generate green light status
        if (greenLight != 'ignore') {
            let greenLightState;
            if (greenLight) greenLightState = 'on';
            else greenLightState = 'off';
            // gpioBitmap.bitmapGenerate(30, wallSide, greenLightState);
        }
        //  generate red light status
        let redLightState;
        if (redLight) redLightState = 'on';
        else redLightState = 'off';
        // gpioBitmap.bitmapGenerate(31, wallSide, redLightState);
        //  get light bitmap of wall
        const lightBitmap = gpioBitmap.getBitmap(wallSide);
        //  generate message
        const mess = `light:${lightBitmap}:${wallSide}\n`;
        fifoWs.write(mess);
        logger.debug({ message: 'Write to pipe:', location: FILE_NAME, value: mess });
    }
});
