/**
 * Main file
 * Pi connect to server via websocket using socket.io-client
 * Access GPIO with pigpio
 */

//  CONFIGURATION_________________________________________________________________________
//
const WALL_NAME = 'M-1';
//  db and collections name
const WALL_DB = 'Wall';
const BACKUP_COLLECTION = 'backup';
const HISTORY_COLLECTION = 'history';
const ERROR_COLLECTION = 'error';
const WARNING_COLECTION = 'warning';
const RECEIVE_MESSAGE = 'received_messages';
const SEND_MESSAGE = 'sent_messages';
const SCANNER_COLLECTION = 'scanner';
const FRONT_BUTTON_COLLECTION = 'front_button';
const BACK_BUTTON_COLLECTION = 'back_button';

//  WEB SOCKET____________________________________________________________________________

const io = require('socket.io-client');
//const socket = io.connect('http://app3.fahasa.com:1300/');
const socket = io.connect('ws://localhost:3000');
//const socket = io.connect('ws://172.16.0.100:3000');
//const socket = io.connect('ws://192.168.50.65:3000');
//const socket = io.connect('http://192.168.1.157:3001');
//const socket = io.connect('ws://192.168.1.20:3000');


// if(process.platform == 'linux'){
//     var ioControl = require('./ioControl');
// }
// else if(process.platform == 'win32'){
//     //
// }

//  UNIX SOCKET_________________________________________________________________________

// const ipc=require('node-ipc');

// ipc.config.id = 'gpio';
// ipc.config.retry= 1500;

// ipc.connectTo('gpio', function(){
//     console.log('Unix socket started');
// });

//  MONGODB_______________________________________________________________________________

const mongoClient = require('mongodb').MongoClient;

const url = "mongodb://localhost:27017/";

//  SERIAL PORT________________________________________________________________________________

// read scan through serial port
if(process.platform == 'linux'){
    const {port0, port1} = require('./serial');
}

//  NAMED PIPE____________________________________________________________________________

// IPC using named pipe, easy to communicate with python
require('./gpio-ipc');

//  EVENT EMITTER__________________________________________________________________________

const event = require('./event');

//  Emulator events for scanners, buttons when they are not available
//const eventsEmulator = require('./events_emulator/eventsEmulator')

//  FILES__________________________________________________________________________________

const fs = require('fs');
const path = require('path');


//  WINSTON LOGGER__________________________________________________________________________

//const logger = require('./winston/winston');


//  WALL CLASS_____________________________________________________________________________

// require wall objects
var {accessWallByName, accessWallByPosition} = require('./wallApi');

const createDbSchema = require('./schema')

//  Import API generator send to web socket server
const message = require('./message');

//
let wall = require('./wallApi');


//  VARIABLES______________________________________________________________________________

//  enable mongodb
const mongoEnable = true;

//  Enable moggodb driver log
const mongodbLogEnable = true;

// pending messages sending to web socket server
var pendingMessages = [];
const MAX_RETRY_COUNT = 5;

//  temporary scan from scanners 
var exportToteNow = null;
var importToteNow = null;

//  Temporary key for every API send to sockert server
var wallKeyNow = null;


//  RESTORE FROM BACKUP____________________________________________________________________________________________________

function restoreFromBackupDb(){
    console.log(createLog('Restore from backup database', 'debug'));
    let backupState = {}
    if(mongoEnable)
    mongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
        if (err) console.error(err);
        const db = client.db(WALL_DB);
        db.collection(BACKUP_COLLECTION).find({}, { projection: { _id: 0, name: 1, coordinate: 1, frontLight: 1, backLight: 1, importTote: 1, exportTote: 1 } }).toArray(function(err, res){
            if (err) console.error(err);
            backupState = res;
            client.close();
            let frontBitmap = 0;
            let backBitmap = 0;

            //  Check light state of wall
            for(idx in backupState){
                let wallState = backupState[idx];
                console.log(wallState.toString());
                //  Emit light event
                if(wallState.frontLight == true){
                    event.emit('light:on', {wall: wallState.name, side: 'front'});
                    frontBitmap |= (1 << accessWallByName(wallName).getIndex() >>> 0);
                    frontBitmap >>> 0;
                }
                if(wallState.backLight == true){
                    backBitmap |= (1 << accessWallByName(wallName).getIndex() >>> 0);
                    backBitmap >>> 0;
                }
            }
            
        });
    });
}

console.log(createLog('Main process started', 'INFO'));
restoreFromBackupDb();

//  HANDLE EVENTS FROM EVENT EMITTER_______________________________________________________________________________________

//  Listenning event from event emitter
event.on('start', function(){
    console.log('Start listenning events!');
});

/**
 * Handle 'button:front' event from gpio
 */
event.on('button:front', function(buttonParams){
    console.log('button:front event', buttonParams);

    //logger.info(`${Date(Date.now())} | wallController/index.js | button ${buttonParams.wall} pressed`);

    const buttonCoor = buttonParams.button;
    // create query by wall name to access database
    const queryByCoor = { coordinate: buttonCoor };
    let newValues = { $set: {frontLight: false} };

    const wallName = accessWallByPosition(buttonCoor).getName();

    let str = `${importToteNow} => ${wallName}`;
    event.emit('print:action', `Hang len:\n   Khay ${importToteNow}\nNhap vao\n   Tuong ${wallName}`);
    buttonParams.tote = importToteNow;
    const wallParams = {wall: wallName};
    let tempApi = message.generateApi('pressButton', 'wallController', wallParams);
    console.log(`Tote ${buttonParams.tote} push to wall ${wallName}, key: ${tempApi.key}`);
    if(importToteNow != null){
        socket.emit('pushToWall', tempApi);
    }
    else{
        console.log('Front button pressed, not valid button!!!');
    }
    importToteNow = null;

    if(mongoEnable){
        //  Update 'frontLight' to false
        mongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
            if (err) console.error(err);
            const db = client.db(WALL_DB);
            db.collection(BACKUP_COLLECTION).updateOne(queryByCoor, newValues, function(err, res){
                if (err) console.error(err);
                console.log('Add newScan event to Db', res.result);
                client.close();
                let lightParams = {};
                lightParams.wall = buttonCoor;
                lightParams.side = 'front';
                event.emit('light:off', lightParams);
            });
        });
    }
});

//  'button:back' emitted in 'ioControl.js' when a button pressed
event.on('button:back', function(buttonParams){
    console.log('button:back event', buttonParams);

    const buttonCoor = buttonParams.button;
    // create query by wall name to access database
    const queryByCoor = { coordinate: buttonCoor };
    const newBackupValues = { $set: {exportTote: exportToteNow, complete: true, backLight: false} };
    let newHistoryValues = {};

    const wallName = accessWallByPosition(buttonCoor).getName();

    let str = `${wallName} => ${exportToteNow}`;
    console.log(str + ' pressed');
    event.emit('print', str);
    event.emit('print:action', `Hang xuong:\n   Tuong ${wallName}\nNhap vao\n   Khay ${exportToteNow}`);
    if(exportToteNow != null){
        let lightParams = {};
        lightParams.wall = buttonCoor;
        lightParams.side = 'back';
        buttonParams.tote = exportToteNow;

        let tempApi = message.generateApi('pressButton', 'wallController', buttonParams);
        console.log(`Wall ${wallName} pick to tote ${buttonParams.tote}, key: ${tempApi.key}`);
        socket.emit('pickToLight', tempApi);
        
        if(mongoEnable){
            // Insert new event to database
            mongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
                if (err) console.error(err);
                const db = client.db(WALL_DB);

                // function update 'backup' collection with new tote scanned, set 'backlight' to false and 'complete' to true
                const updateBackupDb = function(db, callback) {
                    // Get the documents collection
                    const collection = db.collection(BACKUP_COLLECTION);
                    // Update document where a is 2, set b equal to 1
                    collection.updateOne(queryByCoor, newBackupValues, function(err, result) {
                        callback(result);
                    });
                };

                // function ind all proberties of this wall in 'backup' collection
                const findBackupDb = function(db, callback) {
                    // Get the documents collection
                    const collection = db.collection(BACKUP_COLLECTION);
                    // Update document where a is 2, set b equal to 1
                    collection.findOne(queryByCoor, function(err, result) {
                        callback(result);
                    });
                };

                // function create a new complete action on this wall then insert to 'history' collection
                const insertHistoryDb = function(db, callback) {
                    // Get the documents collection
                    const collection = db.collection(HISTORY_COLLECTION);
                    // Update document where a is 2, set b equal to 1
                    collection.insertOne(newHistoryValues, function(err, result) {
                        callback(result);
                    });
                };

                //  Update 'backup' collection, then insert new event to history db, do this step by step
                updateBackupDb(db, function(updateResult){
                    console.log('update to backup result', updateResult.result);
                    exportToteNow = null;
                    findBackupDb(db, function(findResult){
                        //console.log('find from backup result', findResult);

                        newHistoryValues = createDbSchema.historySchema(findResult.importTote, findResult.exportTote, findResult.name, findResult.key);

                        insertHistoryDb(db, function(insertResult){
                            console.log('insert to history result', insertResult.result);
                            client.close();
                            event.emit('light:off', lightParams);
                            event.emit('wall:completeOne',wallName);
                        })
                    })
                })

            });
        }

    }else{
        console.log('Back button pressed, scan container first!!!');
    }
});

event.on('button:user', function(buttonParams){
    console.log('button:user event', buttonParams);
    switch(buttonParams.button){
        case 'U.1.1':
            break;
        case 'U.2.1':
            //
            break;
        case 'U.3.1':
            //
            break;
        case 'U.4.1':
            runningLight();
            break;
        case 'U.5.1':
            reloadGPIO();
            break;
        case 'U.6.1':
            testLightProgram();
            break;
        default:
            //
    }

    function runningLight(){
        let lightBitmap = 1;
        let count = 0;
        const testLightInterval = setInterval(() => {
            lightBitmap = lightBitmap << count >>> 0;
            event.emit('light:set', {bitmap: lightBitmap, side: 'front'});
            count ++;
            if(count == 32) clearInterval(testLightInterval);
        }, 500);
    }

    function reloadGPIO(){
        event.emit('light:reload', '');
    }

    function testLightProgram(){
        // let lightBitmap = 1;
        // let count = 0;
        // const testLightInterval = setInterval(() => {
        //     lightBitmap <<= count;
        //     lightBitmap >>>= 0;
        //     event.emit('light:set', '');
        // }, 200);
        const bitmap = (2**32 - 1) >>> 0;
        event.emit('light:set', {bitmap: bitmap, side: 'front'});
        setTimeout(() => {
            event.emit('light:set', {bitmap: bitmap, side: 'back'});
        }, 1000);
        // setTimeout(() => {
        //     event.emit('light:set', {bitmap: 0, side: 'front'});
        // }, 5000);
        setTimeout(() => {
            event.emit('light:set', {bitmap: 0, side: 'back'});
        }, 6000);
    }
});


//  Handle openScanner event when scanner connecting to serial port
event.on('scanner:opened', function(d){
    console.log(d);
    //  turn off error light
});
//  Handle errorScanner event when scanner disconnecting to serial port
event.on('scanner:closed', function(d){
    console.log(d);
    //  turn on error light
});

event.on('scanner:front', function(scanParams){
    console.log('---------------');

    function generateKey(size){
        let val = '';
        for(let i = 0; i < size; i ++){
            val += Math.floor(Math.random()*10);
        }
        return val;
    }
    const frontScanKey = generateKey(6);

    wallKeyNow = frontScanKey;

    let scanApi = message.generateApi('newScan', 'wallController', scanParams, frontScanKey);
    let scanArray = scanParams.val.split('-');
    let firstElementScan = scanArray[0];
    let sizeOfScan = scanParams.val.split('-').length;

    //  Check if scanned tote a valid value
    if(sizeOfScan == 2 && (firstElementScan === "M" || firstElementScan === "L" || firstElementScan === "S")){
        console.log(`Scan tote ${scanParams.val}, key: ${frontScanKey}`);
        socket.emit('scanTotePushToWall', scanApi);    
        
        function sendScanToServer(callback){
            let tempMess = {};
            tempMess.count = 0;

            tempMess.interval = setInterval(function(){
                console.log(`Resend message with key #${frontScanKey}!`);
                //socket.emit('scanTotePushToWall', scanApi);
                tempMess.count ++;
                if(tempMess.count >= MAX_RETRY_COUNT){
                    console.log(`Message with key #${frontScanKey} has been called ${MAX_RETRY_COUNT} times and stopped!!!`);
                    //  Stop interval
                    clearInterval(tempMess.interval);
                }
            }, 2000);

            tempMess.key = frontScanKey;
            pendingMessages.push(tempMess);
            
            if(pendingMessages.length > 10){
                console.log('pending messages are larger than 10!!!');
            }

            callback();
        }

        importToteNow = scanParams.val;
        
        // Insert new event to database
        if(mongoEnable)
        mongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
            if (err) console.error(err);
            const db = client.db(WALL_DB);

            function insertFrontScanToDb(db, callback){
                let scanObject = {};
                scanObject.val = scanParams.val;
                scanObject.key = frontScanKey;
                scanObject.sent = false;
                scanObject.confirm = false;
                scanObject.date = Date(Date.now());
                const collection = db.collection('frontScan');
                collection.insertOne(scanObject, function(err, res){
                    if(err) console.error(err);
                    callback();
                })
            }

            function updateFrontScanToDb(db, callback){
                const queryByKey = {key: frontScanKey};
                const updateFrontScan = {$set: {sent: true}};
                const collection = db.collection('frontScan');
                collection.updateOne(queryByKey, updateFrontScan, function(err, res){
                    if(err) console.error(err);
                    callback();
                })
            }

            console.log('connecting to frontScan collection');

            // insert new scan to 'frontScan' collection
            insertFrontScanToDb(db, function(){
                // send front scan to server
                sendScanToServer(function(){
                    // update sent status to 'frontScan' collection after sending to server
                    updateFrontScanToDb(db, function(){
                        client.close();
                    });
                });
            })
        });

    }
    //  If scanned tote not a valid value
    else{
        console.log('Scan unknown tote:', scanParams.val, ', Please scan again!');
        socket.emit('scanner:unknown', scanApi);
        mongoClient.connect(url, { useUnifiedTopology: true }, function(err, client){
            const db = client.connect(WALL_DB);
            const warningMess = `unknown front scan:${scanParams.val}`;
            const warningObj = message.generateWarning('wall-controller', warningMess);
            const collection = db.collection(WARNING_COLECTION);
            collection.insertOne(warningObj, function(err, res){
                if(err) console.error(err);
                client.close();
            });
        });
    }
});


event.on('scanner:back', function(scanParams){
    const query = { name: scanParams.wall };

    console.log('---------------');
    let scanApi = message.generateApi('newScan', 'wallController', scanParams);
    let scanArray = scanParams.val.split('-');
    let firstElementScan = scanArray[0];
    let sizeOfScan = scanParams.val.split('-').length;

    if(sizeOfScan == 2 && (firstElementScan === "M" || firstElementScan === "L" || firstElementScan === "S")){
        exportToteNow = scanParams.val;
    }
    else{
        console.log('Scan unknown tote:', scanParams.val, ', Please scan again!');
    }

    if(mongoEnable){
        // Insert new event to database
        mongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
            if (err) console.error(err);
            const db = client.db(WALL_DB);
            let temp = {};
            temp.val = scanParams.val;
            temp.side = 'back';
            temp.date = Date(Date.now());
            
            db.collection("scanner").insertOne(temp, function(err, res){
                if (err) console.error(err);
                client.close();
            });
        });
    }
});


event.on('wall:completeOne', function(wallCoor){
    // create query by wall name to access database
    console.log('wall complete!!!')
    const queryByCoor = { coordinate: wallCoor}
    const newBackupValues = createDbSchema.backupSchema([], "", wallCoor, null, false, false, false, false);
    console.log('reset shema', newBackupValues);

    if(mongoEnable)
    mongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
        if (err) console.error(err);
        const db = client.db(WALL_DB);

        const updateBackupDb = function(db, callback) {
            // Get the documents collection
            const collection = db.collection(BACKUP_COLLECTION);
            // Update document where a is 2, set b equal to 1
            collection.updateOne(queryByCoor, {$set: newBackupValues}, function(err, result) {
                callback(result);
            });
        };

        updateBackupDb(db, function(result){
            console.log('reset backup collection', result.result);
            client.close();
        })
    })


})


//  HANDLE EVENTS FROM UNIX SOCKET_______________________________________________________________________________________________________

//  HANDLE EVENTS FROM WEB SOCKET_________________________________________________________________________________________________________

//  handle scanner:confirm from server
socket.on('confirmWall', function(confirmApi){
    console.log('---------------');
    const confirmKey = confirmApi.key;
    const confirmDate = confirmApi.date;
    console.log('Confirm from server, key:', confirmKey);
    //  Find pennding message match the key then clear interval and remove it from pendingMessage array
    for(let i = 0; i < pendingMessages.length; i ++){
        if(pendingMessages[i].key === confirmKey){
            clearInterval(pendingMessages[i].interval);
            pendingMessages.splice(i, 1);
            console.log(pendingMessages);
        }
    }
    const queryByKey = { key: confirmKey, date: confirmDate};
    const updateFrontScanValue = {$set: {confirm: true}};
    mongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
        if (err) console.error(err);
        //  Find and remove message match the key in database
        const db = client.db(WALL_DB);
        db.collection("frontScan").updateOne(queryByKey, updateFrontScanValue, function(err, res){
            if (err) console.error(err);
            console.log(`Delete pending api with key:${confirmKey} from Db`, res.result);
            client.close();
        });
    });
});

//  handle connection event from server
socket.on('connect', function(){
    console.log('---------------');
    console.log('Connected to web socket Server!');
    //socket.emit('pressButton', wall);
});

//  Handle lightOn event from server
socket.on('lightOn', function(lightApi){
    console.log('---------------');
    console.log(lightApi);

    const wallName = lightApi.params.wall;
    const wallSide = lightApi.params.side;
    const wallKey = lightApi.key;
    const queryByCoor = { name: wallName };
    
    let newBackupValues = "";

    let str = 'light on ' + wallName + ':' + wallSide;
    console.log(str);

    //event.emit('print', str);

    //  Emit light:on event to execute in ioControl.js
    let lightParams = {};
    lightParams.wall = accessWallByName(wallName).getCoordinate();
    lightParams.side = wallSide;
    event.emit('light:on', lightParams);

    //ipc.of.gpio.emit('light:on', lightApi.params);

    socket.emit('lightOnConfirm', message.generateApi('lightOnConfirm', 'wallController', {wall: wallName}, wallKey));

    if(mongoEnable){
        mongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
            if (err) console.error(err);
            const db = client.db(WALL_DB);

            const updateBackupDb = function(db, callback) {

                const collection = db.collection(BACKUP_COLLECTION);

                if(wallSide == 'front'){
                    newBackupValues = { $set: {frontLight: true}, $push: {importTote: importToteNow} };
                }
                else if(wallSide == 'back'){
                    newBackupValues = { $set: {backLight: true}};
                }
                else{}
                
                collection.updateOne(queryByCoor, newBackupValues, function(err, result) {
                    callback(result);
                });
            };

            const insertLightDb = function(db, callback){

                const collection = db.collection('light');

                const newLightValue = createDbSchema.lightSchema(wallName, wallSide, 'on', wallKeyNow);

                collection.insertOne(newLightValue , function(err, res){
                    if (err) console.error(err);
                    callback(res.result);
                })
            }

            insertLightDb(db, function(res){
                if(mongodbLogEnable) console.log('insert light event to light collection', res.result);
                
                updateBackupDb(db, function(res){
                    if(mongodbLogEnable) console.log('update light state to backup collection', res.result);
                    client.close();
                })
                
            })

        });
    }
});

//  Handle lightOff event from server
socket.on('lightOff', function(lightApi){
    console.log('---------------');
    console.log(lightApi);

    const wallName = lightApi.params.wall;
    const wallSide = lightApi.params.side;
    const wallKey = lightApi.key;
    const queryByCoor = { name: wallName };
    let newBackupValues = "";
    const str = 'light off at address ' + wallName + wallSide;

    console.log(str);
    //event.emit('print', str);

    //  Emit light:on event to execute in ioControl.js
    let lightParams = {};
    lightParams.wall = accessWallByName(wallName).getCoordinate();
    lightParams.side = wallSide;
    event.emit('light:off', lightParams);

    //wallStorage[lightApi.params.row - 1].backLightEnable = false;
    socket.emit('lightOffConfirm', message.generateApi('lightOffConfirm', 'wallController', {wall: wallName}, wallKey));
    
    if(mongoEnable){
        mongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
            if (err) console.error(err);
            const db = client.db(WALL_DB);

            const updateBackupDb = function(db, callback) {

                const collection = db.collection(BACKUP_COLLECTION);

                if(wallSide == 'front'){
                    newBackupValues = { $set: {frontLight: false} };
                }
                else if(wallSide == 'back'){
                    newBackupValues = { $set: {backLight: false} };
                }
                
                collection.updateOne(queryByCoor, newBackupValues, function(err, res) {
                    callback(res);
                });
            };

            const insertLightDb = function(db, callback){

                const collection = db.collection('light');

                const newLightValue = createDbSchema.lightSchema(wallName, wallSide, 'off', wallKeyNow);

                collection.insertOne(newLightValue , function(err, res){
                    if (err) console.error(err);
                    callback(res);
                })
            }
            
            updateBackupDb(db, function(result){
                if(mongodbLogEnable) console.log('update light state to backup collection', result.result);
                insertLightDb(db, function(result){
                    if(mongodbLogEnable) console.log('insert light event to light collection', result.result);
                    client.close();
                })
            })

        });
    }
});

socket.on('lightTest', function(lightApi){
    console.log('---------------');
    console.log(lightApi);
    event.emit('light:test', lightApi.params.side);
});

//  Handle getWallState event from server
socket.on('getWallState', function(d){
    console.log('---------------');
    console.log(d);
    return;
});

//  Handle wallTest event from server
socket.on('wallTest', function(){
    event.emit('light:test', '');
});
//  Handle errorWall event from server
socket.on('errorWall', function(errApi){
    let str = '';
    let arr = errApi.params.message.split(' ');
    for(let i = 0; i < arr.length; i ++){
        if(arr[i] == ' ' && i >= 16){
            str += '\n'; 
        }
        else str += arr[i];
    }
    event.emit('print:action', errApi.params.message);
});

//  handle disconnect event
socket.on('disconnect', function(){
    console.log('---------------');
    console.log('disconnected from socketServer!');
}); 

//
socket.on('error', function(){
    console.log(error);
});


function createLog(message, status){
    return `${Date(Date.now())}|${status.toUpperCase()}|message:${message}|}`;
}