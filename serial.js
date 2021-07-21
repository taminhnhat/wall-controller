/*************
 * This file used to interact serial device on USB port
 * Scanners are configured
 */

require('dotenv').config({path: './CONFIGURATIONS.env'});
const SerialPort = require('serialport');
const event = require('./event');
const message = require('./message');

const logger = require('./logger/logger');

const FILE_NAME = 'serial.js  ';

const connectPort0 = setInterval(reconnectPort0, 5000);
const connectPort1 = setInterval(reconnectPort1, 5000);

// const port = new SerialPort('COM5', {
//   baudRate: 9600,
//   autoOpen: false
// });


//  NEED TO CONFIG SERIAL PORT FIRST, READ 'README.md'

// const port0 = new SerialPort(process.env.FRONT_SCANNER_PATH, {
//   baudRate: 9600
// });
const port0 = new SerialPort('/dev/tty.usbmodem143301', {
  baudRate: 9600
});
const port1 = new SerialPort(process.env.BACK_SCANNER_PATH, {
  baudRate: 9600
});

port1.open(function (err) {
  if (err) {
    return logger.debug({message: 'Error opening port: ', location: FILE_NAME, value: err.message})
  }
});
port0.open(function (err) {
  if (err) {
    return logger.debug({message: 'Error opening port: ', location: FILE_NAME, value: err.message})
  }
});

port1.on('open', function(){
  clearInterval(connectPort1);
  event.emit('scanner:opened', 'Back scanner opened');
});
port0.on('open', function(){
  clearInterval(connectPort0);
  event.emit('scanner:opened', 'Front scanner opened');
});
  
// Switches the port into "flowing mode"
port0.on('data', function (data) {
  let scanString = String(data).trim();
  logger.debug({
    message: 'Front scanner:',
    location: FILE_NAME,
    value: scanString
  });
  
  event.emit('scanner:front', {
    value: scanString
  });
});

port1.on('data', function (data) {
  let scanString = String(data).trim();
  logger.debug({
    message: 'Back scanner:',
    location: FILE_NAME,
    value: scanString
  });
  
  event.emit('scanner:back', {
    value: scanString
  });
});

port0.on('close', function(){
  event.emit('scanner:closed', 'Serial port 0 closed');
  connectPort = setInterval(reconnectPort0, 5000);
});

port1.on('close', function(){
  event.emit('scanner:closed', 'Serial port 1 closed');
  connectPort = setInterval(reconnectPort1, 5000);
});

// event.on('lcd:print:action', function(printParams){
//   try{
//     usb.write(printParams.message + '\r');
//   }
//   catch(err){
//     logger.error({message: 'Cannot write to usb', location: FILE_NAME, value: err});
//   }
// });

// event.on('lcd:print:error', function(errorParams){
//   try{
//     const message = `${errorParams.code}|${errorParams.message}`;
//     usb.write(`${message}\r`);
//   }
//   catch(err){
//     logger.error({message: 'Cannot write to usb', location: FILE_NAME, value: err});
//   }
// });


/**
 * Reconnecting to serial port every 5 seconds after loosing connection
 */
function reconnectPort0() {
  port0.open(function(err){
      if (err){
        //logger.debug({message: 'Error connecting port 0:', location: FILE_NAME, value: err.message});
      }
  });
}

function reconnectPort1() {
  port1.open(function(err){
      if (err){
        //logger.debug({message: 'Error connecting port 1:', location: FILE_NAME, value: err.message});
      }
  });
}

module.exports = {port0, port1};

