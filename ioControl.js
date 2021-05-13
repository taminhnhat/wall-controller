/**
 * GPIO controll
 * Access GPIO with pigpio
 */
var frontLightPort = 0 << 7;
var backLightPort = 0 << 7;

const event = require('./event');
const api = require('./api');
var Gpio = require('pigpio').Gpio; //include pigpio to interact with the GPIO

// require wall objects
var wall = require('./wallApi');

let ArraySensor = function(){
    let temp = {};
    temp.detected = true;
    temp.sensor1Trigger = false;
    temp.sensor2Trigger = false;
    return temp;
}

var array1 = new ArraySensor;
var array2 = new ArraySensor;
var tempArray1 = 0;
var tempArray2 = 0;



//  Output io
// var dsPin1 = new Gpio(21, {mode: Gpio.OUTPUT});   //create bit state
// var dsPin2 = new Gpio(12, {mode: Gpio.OUTPUT});   //create bit state
// var shcpPin1 = new Gpio(16, {mode: Gpio.OUTPUT});    //Write bit to shift register
// var shcpPin2 = new Gpio(1, {mode: Gpio.OUTPUT});    //Write bit to shift register
// var stcpPin = new Gpio(20, {mode: Gpio.OUTPUT});   //trigger - shift to storage register
//
var pin1 = new Gpio(24, {mode: Gpio.OUTPUT});
var pin2 = new Gpio(25, {mode: Gpio.OUTPUT});
var pin3 = new Gpio(8, {mode: Gpio.OUTPUT});
var pin4 = new Gpio(7, {mode: Gpio.OUTPUT});
var pin5 = new Gpio(12, {mode: Gpio.OUTPUT});
var pin6 = new Gpio(16, {mode: Gpio.OUTPUT});
var pin7 = new Gpio(20, {mode: Gpio.OUTPUT});
var pin8 = new Gpio(21, {mode: Gpio.OUTPUT});
//  Input io
//button1 = new Gpio(11, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, edge: Gpio.FALLING_EDGE});
var button1 = new Gpio(17, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, alert: true});
var button2 = new Gpio(27, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, alert: true});
var button3 = new Gpio(22, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, alert: true});
var button4 = new Gpio(5, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, alert: true});
var button5 = new Gpio(6, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, alert: true});
var button6 = new Gpio(13, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, alert: true});
var button7 = new Gpio(19, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, alert: true});
var button8 = new Gpio(26, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, alert: true});
// Sensor input
var sensor1 = new Gpio(14, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, alert: true});
var sensor2 = new Gpio(15, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_DOWN, alert: true});
var sensor3 = new Gpio(18, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_DOWN, alert: true});
var sensor4 = new Gpio(23, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_DOWN, alert: true});
//
// var button1 = new Gpio(14, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_DOWN, alert: true});
// var button2 = new Gpio(15, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_DOWN, alert: true});
// var button3 = new Gpio(18, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_DOWN, alert: true});
// var button4 = new Gpio(23, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_DOWN, alert: true});
// var button5 = new Gpio(24, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_DOWN, alert: true});
// var button6 = new Gpio(25, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_DOWN, alert: true});
// var button7 = new Gpio(8, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_DOWN, alert: true});
// var button8 = new Gpio(7, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_DOWN, alert: true});
//
const buttonStableTime = 50000;
button1.glitchFilter(buttonStableTime);
button2.glitchFilter(buttonStableTime);
button3.glitchFilter(buttonStableTime);
button4.glitchFilter(buttonStableTime);
button5.glitchFilter(buttonStableTime);
button6.glitchFilter(buttonStableTime);
button7.glitchFilter(buttonStableTime);
button8.glitchFilter(buttonStableTime);
const sensorStableTime = 50000;
sensor1.glitchFilter(sensorStableTime);
sensor2.glitchFilter(sensorStableTime);
sensor3.glitchFilter(sensorStableTime);
sensor4.glitchFilter(sensorStableTime);
//
let lightPin = [pin1, pin2, pin3, pin4, pin5, pin6, pin7, pin8];
for(let i = 0; i < 8; i ++){
    lightPin[i].digitalWrite(0);
}
let tempButton1 = 0, tempButton2 = 0, tempButton3 = 0, tempButton4 = 0, tempButton5 = 0, tempButton6 = 0, tempButton7 = 0, tempButton8 = 0,
tempSensor1 = 0, tempSensor2 = 0, tempSensor3 = 0, tempSensor4 = 0;

let timerTick = 0;
const buttonDelay = 3;
const sensorDelay = 1;


setInterval(function(){
    timerTick ++;
    if(timerTick > 1000000){
        timerTick = 0;
        tempButton1 = 0;
        tempButton2 = 0;
        tempButton3 = 0;
        tempButton4 = 0;
        tempButton5 = 0;
        tempButton6 = 0;
        tempButton7 = 0;
        tempButton8 = 0;
    
        tempSensor1 = 0;
        tempSensor2 = 0;
        tempSensor3 = 0;
        tempSensor4 = 0;
    
    }
}, 200);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//  PUT index.js script here

/**
 * Handle light:on event
 * emitted in index.js
 * Turn on light with input params
 */
event.on('light:on', function(lightParams){
    console.log('light on event', lightParams);
    let temp = lightParams.wall.split('-');
    let tempType = temp[0];
    let tempCol = temp[1];
    let tempRow = temp[2];
    turnLight(tempType, tempCol, tempRow, lightParams.side, 'on');
});

/**
 * Handle light:off event
 * emitted in index.js
 * Turn off light with input params
 */
event.on('light:off', function(lightParams){
    console.log('light off event', lightParams);
    let temp = lightParams.wall.split('-');
    let tempType = temp[0];
    let tempRow = temp[2];
    let tempCol = temp[1];
    turnLight(tempType, tempCol, tempRow, lightParams.side, 'off');
});
/**
 * Handle light:test event
 * emitted in index.js
 * Turn on all the lights on wall
 */
event.on('light:test', function(side){
    for(let i = 1; i <= 1; i ++){
        for(let j = 1; j <= 4; j ++){
            turnLight('M', i, j, side, 'on');
        }
    }
})

event.prependOnceListener('light:test', function(){
    turnLight('M', 1, 1, 'front', 'on');
    turnLight('M', 1, 2, 'front', 'on');
    turnLight('M', 1, 3, 'front', 'on');
    turnLight('M', 1, 4, 'front', 'on');
    turnLight('M', 1, 1, 'back', 'on');
    turnLight('M', 1, 2, 'back', 'on');
    turnLight('M', 1, 3, 'back', 'on');
    turnLight('M', 1, 4, 'back', 'on');
});

//  END index.js
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// /**
//  * 
//  * @param {*} ioState 
//  */
// function exportFrontIO(ioState){
//     for(let i = 0; i < 8; i ++){
//         let temp = (ioState >> i) & 1;
//         dsPin1.digitalWrite(temp);
//         shcpPin1.trigger(1, 1);
//     }
//     stcpPin.trigger(1,1);
// }
// function exportBackIO(ioState){
//     for(let i = 7; i >= 0; i --){
//         let temp = (ioState >> i) & 1;
//         dsPin2.digitalWrite(temp);
//         shcpPin2.trigger(1, 1);
//     }
//     stcpPin.trigger(1,1);
// }
// // exportFrontIO(frontLightPort);
// // exportBackIO(backLightPort);
// exportFrontIO(0);
// exportBackIO(0);
// /**
//  * 
//  * @param {*} type type of wall
//  * @param {*} row row of wall
//  * @param {*} col column of wall
//  * @param {*} side side of wall
//  * @param {*} state 'on'/'off'
//  * @returns complete|error_type|error_row_col|error_state
//  */
function turnLight(type, col, row, side, state){
    if(type != 'M') return 'error_type';
    row = Number(row);
    col = Number(col);
    let pos = (row + (col - 1)*4)*2;
    if(pos > 8) return 'error_row_col';

    if(side == 'front') pos -= 2;
    else if(side == 'back') pos --;
    else return 'error_side';

    if(state == 'on'){
        lightPin[pos].digitalWrite(1);
        //console.log('on light', pos);
    }
    else if (state == 'off'){
        lightPin[pos].digitalWrite(0);
        //console.log('off light', pos);
    }
    else return 'error_state';
    return 'complete';
}

// function turnLight(type, row, col, side, state){
//     //console.log(`${type}.${row}.${col}.${side}.${state}`);
//     if(type != 'M') return 'error_type';
//     row = Number(row);
//     col = Number(col);
//     if(side == 'front'){
//         let pos = row + (col - 1)*4 - 1;
//         if(state == 'on'){
//             //console.log('Front light on');
//             frontLightPort = frontLightPort | ((1 << 7) >> pos);
//         }
//         else if(state == 'off'){
//             //console.log('Front light off');
//             frontLightPort = frontLightPort & (((1 << 7) >> pos) ^ 0b11111111);
//         }
//         else return 'error_state';
//         exportFrontIO(frontLightPort);
//         console.log('Front light', frontLightPort, frontLightPort.toString(2));
//     }
//     else if(side == 'back'){
//         let pos = row + (col - 1)*4 - 1;
//         if(state == 'on'){
//             //console.log('Back light on');
//             backLightPort = backLightPort | ((1 << 7) >> pos);
//         }
//         else if(state == 'off'){
//             //console.log('Back light off');
//             backLightPort = backLightPort & (((1 << 7) >> pos) ^ 0b11111111);
//         }
//         else return 'error_state';
//         exportBackIO(backLightPort);
//         console.log('Back light', backLightPort, backLightPort.toString(2));
//     }
//     else return 'error_side';
//     return 'complete';
// }


//   HANDLE BUTTON ALERT ____________________________________________________________________________________________

button1.on('alert', function(level, tick){
    if(level === 0){
        if(timerTick - tempButton1 > buttonDelay){
            let tempParams = api.generateButtonParams('M', 1, 1);
            if(wall('M-1-1').frontLight){
            }
            event.emit('button:front', tempParams);
            turnLight('M', 1, 1, 'front', 'off');
            tempButton1 = timerTick;
        }
    }
});

button2.on('alert', function(level, tick){
    if(level === 0){
        if(timerTick - tempButton2 > buttonDelay){
            let tempParams = api.generateButtonParams('M', 1, 1);
            if(wall('M-1-1').backLight){
            }
            event.emit('button:back', tempParams);
            //turnLight('M', 1, 1, 'back', 'off');
            tempButton2 = timerTick;
        }
    }
});

button3.on('alert', function(level, tick){
    if(level === 0){
        if(timerTick - tempButton3 > buttonDelay){
            let tempParams = api.generateButtonParams('M', 1, 2);
            if(wall('M-1-2').frontLight){
            }
            event.emit('button:front', tempParams);
            turnLight('M', 1, 2, 'front', 'off');
            tempButton3 = timerTick;
        }
    }
});

button4.on('alert', function(level, tick){
    if(level === 0){
        if(timerTick - tempButton4 > buttonDelay){
            let tempParams = api.generateButtonParams('M', 1, 2);
            if(wall('M-1-2').backLight){
            }
            event.emit('button:back', tempParams);
            //turnLight('M', 1, 2, 'back', 'off');
            tempButton4 = timerTick;
        }
    }
});

button5.on('alert', function(level, tick){
    if(level === 0){
        if(timerTick - tempButton5 > buttonDelay){
            let tempParams = api.generateButtonParams('M', 1, 3);
            if(wall('M-1-3').frontLight){
            }
            event.emit('button:front', tempParams);
            turnLight('M', 1, 3, 'front', 'off');
            tempButton5 = timerTick;
        }
    }
});

button6.on('alert', function(level, tick){
    if(level === 0){
        if(timerTick - tempButton6 > buttonDelay){
            let tempParams = api.generateButtonParams('M', 1, 3);
            if(wall('M-1-3').backLight){
            }
            event.emit('button:back', tempParams);
            //turnLight('M', 1, 3, 'back', 'off');
            tempButton6 = timerTick;
        }
    }
});

button7.on('alert', function(level, tick){
    if(level === 0){
        if(timerTick - tempButton7 > buttonDelay){
            let tempParams = api.generateButtonParams('M', 1, 4);
            if(wall('M-1-4').frontLight){
            }
            event.emit('button:front', tempParams);
            turnLight('M', 1, 4, 'front', 'off');
            tempButton7 = timerTick;
        }
    }
});

button8.on('alert', function(level, tick){
    if(level === 0){
        if(timerTick - tempButton8 > buttonDelay){
            let tempParams = api.generateButtonParams('M', 1, 4);
            if(wall('M-1-4').backLight){
            }
            event.emit('button:back', tempParams);
            //turnLight('M', 1, 4, 'back', 'off');
            tempButton8 = timerTick;
        }
    }
});

sensor1.on('alert', function(level, tick){
    if(level == 0){
        //turnLight('M', 1, 4, 'back', 'on');
        array2.sensor1Trigger = true;

        if(wall('M-1-2').backLight){
            console.log('TRUE!', wall('M-1-2').backLight)
            turnLight('M', 1, 2, 'back', 'off');
            turnLight('M', 1, 1, 'back', 'off');

            setTimeout(function(){
                wall('M-1-2').backLight = false;
            }, 1000)
        }
        else{
            console.log('ALERT!', wall('M-1-2').backLight)
            turnLight('M', 1, 1, 'back', 'on');
        }
    }
    else if(level == 1){
        //turnLight('M', 1, 4, 'back', 'off')
        array2.sensor1Trigger = false;
        if(!array2.sensor1Trigger && !array2.sensor2Trigger){
            console.log('Right sensor off')
            turnLight('M', 1, 1, 'back', 'off');
        }
    }
});

sensor2.on('alert', function(level, tick){
    if(level == 0){
        //turnLight('M', 1, 3, 'back', 'on');
        array2.sensor2Trigger = true;

        if(wall('M-1-2').backLight){
            console.log('TRUE!', wall('M-1-2').backLight)
            turnLight('M', 1, 2, 'back', 'off');
            turnLight('M', 1, 1, 'back', 'off');

            setTimeout(function(){
                wall('M-1-2').backLight = false;
            }, 1000)
        }
        else{
            console.log('ALERT!', wall('M-1-2').backLight)
            turnLight('M', 1, 1, 'back', 'on');
        }
    }
    else if(level == 1){
        array2.sensor2Trigger = false;
        //turnLight('M', 1, 3, 'back', 'off')
        if(!array2.sensor1Trigger && !array2.sensor2Trigger){
            console.log('Right sensor off')
            turnLight('M', 1, 1, 'back', 'off');
        }
    }
});

sensor3.on('alert', function(level, tick){
    if(level == 0){
        //turnLight('M', 1, 3, 'front', 'on');
        array1.sensor1Trigger = true;

        if(wall('M-1-2').frontLight){
            console.log('TRUE!', wall('M-1-2').frontLight)
            turnLight('M', 1, 2, 'front', 'off');
            turnLight('M', 1, 1, 'front', 'off');

            setTimeout(function(){
                wall('M-1-2').frontLight = false;
            }, 1000)
        }
        else{
            console.log('ALERT!', wall('M-1-2').frontLight)
            turnLight('M', 1, 1, 'front', 'on');
        }
    }
    else if(level == 1){
        //turnLight('M', 1, 3, 'front', 'off')
        array1.sensor1Trigger = false;
        if(!array1.sensor1Trigger && !array1.sensor2Trigger){
            console.log('Left sensor off')
            turnLight('M', 1, 1, 'front', 'off');
        }
    }
})

sensor4.on('alert', function(level, tick){
    if(level == 0){
        //turnLight('M', 1, 4, 'front', 'on');
        array1.sensor2Trigger = true;

        if(wall('M-1-2').frontLight){
            console.log('TRUE!', wall('M-1-2').frontLight)
            turnLight('M', 1, 2, 'front', 'off');
            turnLight('M', 1, 1, 'front', 'off');

            setTimeout(function(){
                wall('M-1-2').frontLight = false;
            }, 1000)
        }
        else{
            console.log('ALERT!', wall('M-1-2').frontLight)
            turnLight('M', 1, 1, 'front', 'on');
        }
    }
    else if(level == 1){
        //turnLight('M', 1, 4, 'front', 'off')
        array1.sensor2Trigger = false;
        if(!array1.sensor1Trigger && !array1.sensor2Trigger){
            console.log('Left sensor off')
            turnLight('M', 1, 1, 'front', 'off');
        }
    }
})


