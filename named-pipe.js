/**
 * Read from "../pipe/fifo1"
 * Write to "../pipe/fifo2"
 */
const fs              = require('fs');
const { spawn, fork } = require('child_process');
const event = require('./event');
const api = require('./api');
let wall = require('./wallApi');

const write_pipe_path = './pipe/pipe_emit_light';
const read_pipe_path = './pipe/pipe_button_callback';
let fifo_b = spawn('mkfifo', [read_pipe_path]);  // Create Pipe B

fifo_b.on('exit', function(status) {
    console.log('Created Pipe B');

    const fd   = fs.openSync(read_pipe_path, 'r+');
    let fifoRs = fs.createReadStream(null, { fd });
    let fifoWs = fs.createWriteStream(write_pipe_path);

    console.log('Ready to write')

    fifoRs.on('data', mess => {
        console.log(String(mess), typeof(mess));
        const messarr = String(mess).split(':');
        const wallName = messarr[0];
        const wallSide = messarr[1];
        const buttonEventName = 'button:' + wallSide;
        let tempParams = api.generateButtonParams(wallName);

        console.log(buttonEventName, tempParams);

        if(wall(wallName).frontLight){
        }
        event.emit(buttonEventName, tempParams);
        //turnLight('M', 1, 1, 'front', 'off');
        //event.emit('button:pressed', data);
    });

    fifoWs.on('error', function(err){
        console.log('error at writing pipe', err);
    })

    setTimeout(function(){
        event.emit('light:on', {wall: 'M-1-1', side: 'front'});
        console.log('emitted');
    }, 2000);


    const timer = setInterval(function(){
        console.log('timer tick for 1 s');
    }, 1000);
    
    
    /**
     * Handle light:on event
     * emitted in index.js
     * Turn on light with input params
     */
     event.on('light:on', function(lightParams){
        console.log('light on event', lightParams);
        const wallName = lightParams.wall;
        const wallSide = lightParams.side;
        emitLightToPipe(wallName, wallSide, 'on');
    });
    
    /**
     * Handle light:off event
     * emitted in index.js
     * Turn off light with input params
     */
    event.on('light:off', function(lightParams){
        console.log('light off event', lightParams);
        const wallName = lightParams.wall;
        const wallSide = lightParams.side;
        emitLightToPipe(wallName, wallSide, 'off');
    });
    
    /**
     * Handle light:test event
     * emitted in index.js
     * Turn on all the lights on wall
     */
    event.on('light:test', function(side){
        for(let i = 1; i <= 6; i ++){
            for(let j = 1; j <= 5; j ++){
                const wallName = `M-${j}-${j}`
                turnLight(wallName, side, 'on');
            }
        }
    });
    
    /**
     * Emit a message to C++ process via named-pipe
     * @param {String} wallname eg: 'M-1-1'
     * @param {String} side 'front'|'back'
     * @param {String} state 'on'|'off'
     */
    function emitLightToPipe(wallname, side, state){
        let mess = wallname + ":" + side + ":" + state;
        fifoWs.write(mess);
        console.log('emit message to pipe:', mess);
    }
});
