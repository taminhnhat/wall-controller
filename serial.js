/*************
 * This file used to interact serial device on USB port
 * Scanners are configured
 */

const GLOBAL = require('./CONFIGURATION');
const SerialPort = require('serialport');
const event = require('./event');

const logger = require('./logger/logger');

const FILE_NAME = 'serial.js  ';

// const frontScannerPath = GLOBAL.FRONT_SCANNER_PATH;
// const backScannerPath = GLOBAL.BACK_SCANNER_PATH;
const frontScannerPath = '/dev/ttyS10';
const backScannerPath = '/dev/ttyS4';

//  NEED TO CONFIG SERIAL PORT FIRST, READ 'README.md'
const frontScanner = new SerialPort(frontScannerPath, {
  baudRate: 9600,
  autoOpen: false
});
const backScanner = new SerialPort(backScannerPath, {
  baudRate: 9600,
  autoOpen: false
});

frontScanner.on('open', function () {
  event.emit('scanner:opened', 'Front scanner opened');
});
backScanner.on('open', function () {
  event.emit('scanner:opened', 'Back scanner opened');
});

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

frontScanner.on('close', () => {
  event.emit('scanner:closed', 'Front scanner closed');
});
backScanner.on('close', () => {
  event.emit('scanner:closed', 'Back scanner closed');
});

frontScanner.on('error', (err) => {
  event.emit('scanner:error', err.message);
});
backScanner.on('error', (err) => {
  event.emit('scanner:error', err.message);
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
  frontScanner.open((err) => {
    if (err) {
      if (err.message !== 'Port is already open')
        event.emit('scanner:error', err.message);
    }
  });
}

function backScannerCheckHealth() {
  backScanner.open((err) => {
    if (err) {
      if (err.message !== 'Port is already open')
        event.emit('scanner:error', err.message);
    }
  });
}

setInterval(frontScannerCheckHealth, 5000);
setInterval(backScannerCheckHealth, 5000);