const SerialPort = require('serialport');
const event = require('./event');
const message = require('./message');

var connectPort0 = setInterval(reconnectPort0, 1000);
var connectPort1 = setInterval(reconnectPort1, 1000);

// const port = new SerialPort('COM5', {
//   baudRate: 9600,
//   autoOpen: false
// });


//  NEED TO CONFIG SERIAL PORT FIRST, READ 'README.md'

const port0 = new SerialPort('/dev/frontScanner', {
  baudRate: 9600
});
const port1 = new SerialPort('/dev/backScanner', {
  baudRate: 9600
});
const usb = new SerialPort('/dev/lcdScreen', {
  baudRate: 115200
});

port1.open(function (err) {
  if (err) {
    return console.log('Error opening port: ', err.message)
  }
});
port0.open(function (err) {
  if (err) {
    return console.log('Error opening port: ', err.message)
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
  console.log('---------------');
  console.log('Front scanner:', scanString);
  let scanParams = message.generateScannerParams(scanString);
  event.emit('scanner:front', scanParams);
});
port1.on('data', function (data) {
  let scanString = String(data).trim();
  console.log('---------------');
  console.log('Back scanner:', scanString);
  let scanParams = message.generateScannerParams(scanString);
  event.emit('scanner:back', scanParams);
});

port0.on('close', function(){
  event.emit('scanner:closed', 'Serial port 0 closed');
  connectPort = setInterval(reconnectPort0, 5000);
});
port1.on('close', function(){
  event.emit('scanner:closed', 'Serial port 1 closed');
  connectPort = setInterval(reconnectPort1, 5000);
});

event.on('print:action', function(str){
  try{
    usb.write(str + '\r');
  }
  catch(err){
    console.log('Cannot write to usb', err);
  }
});

event.on('print:internalError', function(cod, str){
  try{
    usb.write(str + '\r');
  }
  catch(err){
    console.log('Cannot write to usb', err);
  }
});


/**
 * Reconnecting to serial port after loss connection
 */
function reconnectPort0() {
  //console.log(port);
  port0.open(function(err){
      //if (err) console.log('Error connecting port 0:', err.message);
  });
}
function reconnectPort1() {
  //console.log(port);
  port1.open(function(err){
      //if (err) console.log('Error connecting port 1:', err.message);
  });
}

module.exports = {port0, port1};

