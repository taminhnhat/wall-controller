/**
 * GPIO controll
 * Access GPIO via C++ process
 * Communicate with C++ process using named-pipe
 */

const event = require('./event');
const api = require('./api');


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
});

event.on("button:pressed", function(mess){
    
})

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//   HANDLE BUTTON ALERT ____________________________________________________________________________________________


