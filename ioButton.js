const event = require('./event');
const api = require('./api');
let Gpio = require('pigpio').Gpio; //include pigpio to interact with the GPIO

const resetButton = new Gpio(17, { mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, alert: true });
const reloadButton = new Gpio(27, { mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, alert: true });

const buttonStableTime = 50000;
resetButton.glitchFilter(buttonStableTime);
reloadButton.glitchFilter(buttonStableTime);

let timerTick = 0;
const buttonDelay = 3;
const sensorDelay = 1;


setInterval(function () {
    timerTick++;
    if (timerTick > 1000000) {
        timerTick = 0;
        tempButton1 = 0;
        tempButton2 = 0;
    }
}, 200);

resetButton.on('alert', function (level, tick) {
    if (level === 0) {
        if (timerTick - tempButton1 > buttonDelay) {
            let tempParams = api.generateButtonParams('M-1-1');
            if (wall('M-1-1').frontLight) {
            }
            event.emit('button:reset', tempParams);
            turnLight('M', 1, 1, 'front', 'off');
            tempButton1 = timerTick;
        }
    }
});