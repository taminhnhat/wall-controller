/*************
 * This file used to interact serial device on USB port
 * Scanners are configured
 */

require('dotenv').config({ path: './.env' });
const GLOBAL = require('./CONFIGURATION');
const SerialPort = require('serialport');
const event = require('./event');

const logger = require('./logger/logger');

const FILE_NAME = 'serial.js  ';

const frontScannerPath = process.env.FRONT_SCANNER_PATH;
const backScannerPath = process.env.BACK_SCANNER_PATH;
const rgbHubPath = process.env.RGB_HUB_PATH;

//  NEED TO CONFIG SERIAL PORT FIRST, READ 'README.md'
const frontScanner = new SerialPort(frontScannerPath, {
  baudRate: 9600,
  autoOpen: false
});
const backScanner = new SerialPort(backScannerPath, {
  baudRate: 9600,
  autoOpen: false
});
const rgbHub = new SerialPort(rgbHubPath, {
  baudRate: 9600,
  autoOpen: true
});

frontScanner.on('open', function () {
  event.emit('scanner:opened', 'Front scanner opened');
});
backScanner.on('open', function () {
  event.emit('scanner:opened', 'Back scanner opened');
});
rgbHub.on('open', function () {
  console.log('rgb hub opened');
  event.emit('rgbHub:opened', 'RGB Hub opened');
});

frontScanner.on('data', function (data) {
  let scanString = String(data).trim();
  // logger.debug({
  //   message: 'Front scanner:',
  //   location: FILE_NAME,
  //   value: scanString
  // });
  const scanArray = scanString.split('-');
  if (scanArray.length == 3) {
    event.emit('buttonFromScanner:front', {
      wall: scanString
    });
  }
  else {
    event.emit('scanner:front', {
      value: scanString
    });
  }
});
backScanner.on('data', function (data) {
  let scanString = String(data).trim();
  // logger.debug({
  //   message: 'Back scanner:',
  //   location: FILE_NAME,
  //   value: scanString
  // });
  const scanArray = scanString.split('-');
  if (scanArray.length == 3) {
    event.emit('buttonFromScanner:back', {
      wall: scanString
    });
  }
  else {
    event.emit('scanner:back', {
      value: scanString
    });
  }
});

rgbHub.on('data', function (data) {
  const message = String(data).trim();
  event.emit(`rgbHub:data`, { message: message });
});

frontScanner.on('close', () => {
  event.emit('scanner:closed', { message: 'Front scanner closed' });
});
backScanner.on('close', () => {
  event.emit('scanner:closed', { message: 'Back scanner closed' });
});
rgbHub.on('close', () => {
  event.emit('rgbHub:closed', { message: 'Back scanner closed' });
});

frontScanner.on('error', (err) => {
  event.emit('scanner:error', { message: 'Front scanner error', value: err.message });
});
backScanner.on('error', (err) => {
  event.emit('scanner:error', { message: 'Back scanner error', value: err.message });
});
rgbHub.on('error', (err) => {
  event.emit('rgbHub:error', { message: 'Rgb hub error', value: err.message });
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

// lightParams{
//   wall: wallState.name,
//   location: wallState.location,
//   lightIndex: wallState.lightIndex,
//   lightColor: [100, 0, 100],
//   side: wallSide
// }
// event.on('light:on', (lightParams) => {
//   const lightColor = lightParams.lightColor;
//   const wallName = `M-${lightParams.wall.split('-')[1]}`;
//   const wallLocation = lightParams.location;
//   const messageToRgbHub = `${wallName}:${wallLocation}:${lightColor}`;
//   try {
//     console.log('light on:', messageToRgbHub);
//     rgbHub.write(messageToRgbHub);
//   }
//   catch (err) {
//     logger.error({ message: 'Cannot write to rgbLight', location: FILE_NAME, value: err });
//   }
// });

// event.on('light:off', (lightParams) => {
//   const lightColor = lightParams.lightColor;
//   const wallName = `M.${lightParams.wall.split('-')[1]}`;
//   const wallLocation = lightParams.location;
//   const messageToRgbHub = `${wallName}:${wallLocation}:${lightColor}`;
//   try {
//     console.log('light off:', messageToRgbHub);
//     rgbHub.write(messageToRgbHub);
//   }
//   catch (err) {
//     logger.error({ message: 'Cannot write to rgbLight', location: FILE_NAME, value: err });
//   }
// });

event.on('rgbHub:emit', (params) => {
  const messageToRgbHub = params.message;
  rgbHub.write(messageToRgbHub, (err, res) => {
    console.log('emit to rgb hub:', messageToRgbHub);
  });
});


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

function rgbHubCheckHealth() {
  rgbHub.open((err) => {
    if (err) {
      if (err.message !== 'Port is already open')
        event.emit('rgbHub:error', err.message);
    }
  });
}

setInterval(frontScannerCheckHealth, 5000);
setInterval(backScannerCheckHealth, 5000);
setInterval(rgbHubCheckHealth, 5000);