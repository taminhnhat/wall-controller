/**
 * Read from "../pipe/fifo1"
 * Write to "../pipe/fifo2"
 */
const fs              = require('fs');
const { spawn, fork } = require('child_process');
const event = require('./event');

const message = require('./message');

let {accessWallByName, accessWallByCoor} = require('./wallApi');

let gpioBitmap = require('./gpioMap');

const write_pipe_path = './pipe/pipe_emit_light';
const read_pipe_path = './pipe/pipe_button_callback';
let readfifo = spawn('mkfifo', [read_pipe_path]);

readfifo.on('exit', function(status) {
    console.log('Created Pipe B');

    const fd   = fs.openSync(read_pipe_path, 'r+');
    let fifoRs = fs.createReadStream(null, { fd });
    let fifoWs = fs.createWriteStream(write_pipe_path);

    console.log('Ready to write');

    fifoRs.on('data', mess => {
        console.log('Message from pipe', String(mess));
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
        console.log('error at writing pipe', err);
    });
    
    
    /**
     * Handle 'light:on' event
     * emitted in index.js
     * Turn on light with input params
     */
     event.on('light:on', function(lightParams){
        console.log('light on event', lightParams);
        const wallCoor = lightParams.wall;
        const wallSide = lightParams.side;
        emitLightToPipe(wallCoor, wallSide, 'on');
    });
    
    /**
     * Handle 'light:off' event
     * 
     * emitted in index.js
     * Turn off light with input params
     */
    event.on('light:off', function(lightParams){
        console.log('light off event', lightParams);
        const wallCoor = lightParams.wall;
        const wallSide = lightParams.side;
        emitLightToPipe(wallCoor, wallSide, 'off');
    });

    

    event.on('light:set', function(lightParams){
        console.log('light init event', lightParams);
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
        const mess = `light:${2**32-1}:${wallSide}`;
        fifoWs.write(mess);
    });

    event.on('light:error', function(lightParams){
        const errorLightIndex = lightParams.lightIndex;
        const wallSide = lightParams.wallSide;
        emitErrorToPipe(errorLightIndex, wallSide, 'on');
    });
    
    /**
     * Emit a light message to C++ process via named-pipe
     * @param {String} wallCoor eg: 'W.1.1'
     * @param {String} wallSide 'front'|'back'
     */
    function emitLightToPipe(wallCoor, wallSide, lightState){
        //console.log('generating', wallCoor, wallSide, lightState);
        //console.log('get wall', accessWallByCoor(wallCoor).getName());
        const lightIndex = accessWallByCoor(wallCoor).getIndex();
        //console.log('light index', lightIndex)
        //  generate light bitmap of wall
        gpioBitmap.bitmapGenerate(lightIndex, wallSide, lightState);
        //  get light bitmap of wall
        const lightBitmap = gpioBitmap.getBitmap(wallSide);
        //  generate message
        const mess = `light:${lightBitmap}:${wallSide}`;
        //  write message to named-pipe
        fifoWs.write(mess);
        console.log('emit message to pipe:', mess, lightBitmap.toString(2));
    }

    function emitErrorToPipe(errorLightIndex, wallSide, lightState){
        gpioBitmap.bitmapGenerate(errorLightIndex, wallSide, lightState);
        //  get light bitmap of wall
        const lightBitmap = gpioBitmap.getBitmap(wallSide);
        //  generate message
        const mess = `error:${errorLightIndex}:${wallSide}`;
        fifoWs.write(mess);
        console.log('emit message to pipe:', mess, lightBitmap.toString(2));
    }
});
