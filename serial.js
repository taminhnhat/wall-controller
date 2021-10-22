/*************
 * This file used to interact serial device on USB port
 * Scanners are configured
 */

require('dotenv').config({ path: './CONFIGURATIONS.env' });
const SerialPort = require('serialport');
const event = require('./event');
const message = require('./message');

const logger = require('./logger/logger');

const FILE_NAME = 'serial.js  ';

// const port = new SerialPort('COM5', {
//   baudRate: 9600,
//   autoOpen: false
// });


//  NEED TO CONFIG SERIAL PORT FIRST, READ 'README.md'

// const frontScanner = new SerialPort(process.env.FRONT_SCANNER_PATH, {
//   baudRate: 9600
// });
// const backScanner = new SerialPort(process.env.BACK_SCANNER_PATH, {
//   baudRate: 9600
// });
const frontScanner = new SerialPort('/dev/ttyS10', {
  baudRate: 9600,
  autoOpen: false
});
const backScanner = new SerialPort('/dev/ttyS4', {
  baudRate: 9600,
  autoOpen: false
});

frontScanner.on('open', function () {
  event.emit('scanner:opened', 'Front scanner opened');
});
backScanner.on('open', function () {
  event.emit('scanner:opened', 'Back scanner opened');
});

// Switches the port into "flowing mode"
frontScanner.on('data', function (data) {
  let scanString = String(data).trim();
  // logger.debug({
  //   message: 'Front scanner:',
  //   location: FILE_NAME,
  //   value: scanString
  // });

  event.emit('scanner:front', {
    value: scanString
  });
});

backScanner.on('data', function (data) {
  let scanString = String(data).trim();
  // logger.debug({
  //   message: 'Back scanner:',
  //   location: FILE_NAME,
  //   value: scanString
  // });

  event.emit('scanner:back', {
    value: scanString
  });
});

frontScanner.on('close', function () {
  event.emit('scanner:closed', 'Front scanner closed');
});

backScanner.on('close', function () {
  event.emit('scanner:closed', 'Back scanner closed');
});

frontScanner.on('error', function () {
  event.emit('scanner:error', 'Front scanner error');
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
function frontScannerCheckHealth() {
  frontScanner.open(function (err) {
    if (err) {
      if (err.message !== 'Port is already open')
        logger.debug({ message: 'Error connecting front scanner:', location: FILE_NAME, value: err.message });
    }
  });
}

function backScannerCheckHealth() {
  backScanner.open(function (err) {
    if (err) {
      if (err.message !== 'Port is already open')
        logger.debug({ message: 'Error connecting back scanner:', location: FILE_NAME, value: err.message });
    }
  });
}

setInterval(frontScannerCheckHealth, 5000);
setInterval(backScannerCheckHealth, 5000);