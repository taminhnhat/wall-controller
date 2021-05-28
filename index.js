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

const FILE_NAME = 'wall-controller/index.js'

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
//     logger.debug('Unix socket started');
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
const platformOS = process.platform;
if(platformOS == 'linux' || platformOS == 'darwin'){
    require('./gpio-ipc');
}
else if(platformOS == 'win32'){
    require('../events_emulator/eventsEmulator');
}

//  EVENT EMITTER__________________________________________________________________________

const event = require('./event');

//  Emulator events for scanners, buttons when they are not available
//const eventsEmulator = require('./events_emulator/eventsEmulator')

//  FILES__________________________________________________________________________________

const fs = require('fs');
const path = require('path');
console.log(__dirname);


//  LOGGER__________________________________________________________________________

const logger = require('./logger/logger');


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
    logger.debug('Restore from backup database');
    let backupState = {}
    if(mongoEnable)
    mongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
        if (err) logger.error(err);
        const db = client.db(WALL_DB);
        db.collection(BACKUP_COLLECTION).find({}, { projection: { _id: 0, name: 1, position: 1, frontLight: 1, backLight: 1, importTote: 1, exportTote: 1 } }).toArray(function(err, res){
            if (err) logger.error(err);
            backupState = res;
            client.close();
            let frontBitmap = 0;
            let backBitmap = 0;

            //  Check light state of wall
            logger.info(`get wall status`, FILE_NAME, backupState);
            for(idx in backupState){
                let wallState = backupState[idx];
                const wallName = wallState.name;
                //
                accessWallByPosition(wallState.position).setNam;
                //  Emit light event
                if(wallState.frontLight == true){
                    frontBitmap |= (1 << accessWallByName(wallName).getIndex() >>> 0);
                    frontBitmap >>> 0;
                }
                if(wallState.backLight == true){
                    backBitmap |= (1 << accessWallByName(wallName).getIndex() >>> 0);
                    backBitmap >>> 0;
                }
            }
            event.emit('light:set', {bitmap: frontBitmap, side: 'front'});
            setTimeout(function(){
                event.emit('light:set', {bitmap: backBitmap, side: 'back'});
            });
        });
    });
}

logger.debug('Main process started', FILE_NAME);
restoreFromBackupDb();

//  HANDLE EVENTS FROM EVENT EMITTER_______________________________________________________________________________________

//  Listenning event from event emitter
event.on('start', function(){
    logger.debug('Start listenning events!', FILE_NAME);
});

/**
 * Handle 'button:front' event from gpio
 */
event.on('button:front', function(buttonParams){
    logger.debug('button:front event', FILE_NAME, buttonParams);

    const buttonPosition = buttonParams.button;
    // create query by wall name to access database
    const queryByPosition = { position: buttonPosition };
    let newValues = { $set: {frontLight: false} };

    const wallName = accessWallByPosition(buttonPosition).getName();

    let str = `${importToteNow} => ${wallName}`;
    event.emit('print:action', `Hang len:\n   Khay ${importToteNow}\nNhap vao\n   Tuong ${wallName}`);
    buttonParams.tote = importToteNow;
    
    let tempApi = message.generateApi('pressButton', 'wallController', {wall: wallName});

    logger.debug(`Tote ${buttonParams.tote} push to wall ${wallName}, key: ${tempApi.key}`, FILE_NAME);

    if(importToteNow != null){
        socket.emit('pushToWall', tempApi);
    }
    else{
        logger.debug('Front button pressed, not valid button!!!', FILE_NAME);
    }
    importToteNow = null;

    if(mongoEnable){
        //  Update 'frontLight' to false
        mongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
            if (err) logger.error(err);
            const db = client.db(WALL_DB);
            db.collection(BACKUP_COLLECTION).updateOne(queryByPosition, newValues, function(err, res){
                if (err) logger.error(err);
                logger.debug('Add newScan event to Db', FILE_NAME, res.result);
                client.close();

                event.emit('light:off', {wall: buttonPosition, side: 'front'});
            });
        });
    }
});

//  'button:back' emitted in 'ioControl.js' when a button pressed
event.on('button:back', function(buttonParams){
    logger.debug('button:back event', FILE_NAME, buttonParams);

    const buttonPosition = buttonParams.button;
    // create query by wall name to access database
    const queryByPosition = { position: buttonPosition };
    const newBackupValues = { $set: {exportTote: exportToteNow, complete: true, backLight: false} };
    let newHistoryValues = {};

    const wallName = accessWallByPosition(buttonPosition).getName();

    let str = `${wallName} => ${exportToteNow}`;
    event.emit('print', str);
    event.emit('print:action', `Hang xuong:\n   Tuong ${wallName}\nNhap vao\n   Khay ${exportToteNow}`);
    if(exportToteNow != null){
        let lightParams = {};
        lightParams.wall = buttonPosition;
        lightParams.side = 'back';
        buttonParams.tote = exportToteNow;

        let tempApi = message.generateApi('pressButton', 'wallController', buttonParams);
        logger.debug(`Wall ${wallName} pick to tote ${buttonParams.tote}, key: ${tempApi.key}`, FILE_NAME);
        socket.emit('pickToLight', tempApi);
        
        if(mongoEnable){
            // Insert new event to database
            mongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
                if (err) logger.error(err);
                const db = client.db(WALL_DB);

                // function update 'backup' collection with new tote scanned, set 'backlight' to false and 'complete' to true
                const updateBackupDb = function(db, callback) {
                    // Get the documents collection
                    const collection = db.collection(BACKUP_COLLECTION);
                    // Update document where a is 2, set b equal to 1
                    collection.updateOne(queryByPosition, newBackupValues, function(err, result) {
                        callback(result);
                    });
                };

                // function ind all proberties of this wall in 'backup' collection
                const findBackupDb = function(db, callback) {
                    // Get the documents collection
                    const collection = db.collection(BACKUP_COLLECTION);
                    // Update document where a is 2, set b equal to 1
                    collection.findOne(queryByPosition, function(err, result) {
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
                    logger.debug('update to backup result', FILE_NAME, updateResult.result);
                    exportToteNow = null;
                    findBackupDb(db, function(findResult){
                        //logger.debug('find from backup result', findResult);

                        newHistoryValues = createDbSchema.historySchema(findResult.importTote, findResult.exportTote, findResult.name, findResult.key);

                        insertHistoryDb(db, function(insertResult){
                            logger.debug('insert to history result', FILE_NAME, insertResult.result);
                            client.close();

                            event.emit('light:off', {wall: buttonPosition, side: 'back'});
                            event.emit('wall:completeOne',wallName);
                        })
                    })
                })

            });
        }

    }else{
        logger.debug('Back button pressed, scan container first!!!', FILE_NAME);
    }
});

event.on('button:user', function(buttonParams){
    logger.debug('button:user event', FILE_NAME, buttonParams);
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
            lightBitmap = 1 << count >>> 0;
            event.emit('light:set', {bitmap: lightBitmap, side: 'front'});
            count ++;
            if(count == 32) clearInterval(testLightInterval);
        }, 500);
    }

    function reloadGPIO(){
        event.emit('light:reload', {side: 'back'});
        setTimeout(function(){
            event.emit('light:reload', {side: 'front'});
        }, 1000);
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

event.on('scanner:front', function(scanParams){
    logger.debug('New front scan', FILE_NAME, scanParams);

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
        logger.debug(`Scan tote ${scanParams.val}, key: ${frontScanKey}`, FILE_NAME);
        socket.emit('scanTotePushToWall', scanApi);    
        
        function sendScanToServer(callback){
            let tempMess = {};
            tempMess.count = 0;

            tempMess.interval = setInterval(function(){
                logger.debug(`Resend message with key #${frontScanKey}!`, FILE_NAME);
                //socket.emit('scanTotePushToWall', scanApi);
                tempMess.count ++;
                if(tempMess.count >= MAX_RETRY_COUNT){
                    logger.debug(`Message with key #${frontScanKey} has been called ${MAX_RETRY_COUNT} times and stopped!!!`, FILE_NAME);
                    //  Stop interval
                    clearInterval(tempMess.interval);
                }
            }, 2000);

            tempMess.key = frontScanKey;
            pendingMessages.push(tempMess);
            
            if(pendingMessages.length > 10){
                logger.debug('pending messages are larger than 10!!!', FILE_NAME);
            }

            callback();
        }

        importToteNow = scanParams.val;
        
        // // Insert new event to database
        // if(mongoEnable)
        // mongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
        //     if (err) logger.error(err);
        //     const db = client.db(WALL_DB);

        //     function insertFrontScanToDb(db, callback){
        //         let scanObject = {};
        //         scanObject.val = scanParams.val;
        //         scanObject.key = frontScanKey;
        //         scanObject.sent = false;
        //         scanObject.confirm = false;
        //         scanObject.date = Date(Date.now());
        //         const collection = db.collection('frontScan');
        //         collection.insertOne(scanObject, function(err, res){
        //             if(err) logger.error(err);
        //             callback();
        //         })
        //     }

        //     function updateFrontScanToDb(db, callback){
        //         const queryByKey = {key: frontScanKey};
        //         const updateFrontScan = {$set: {sent: true}};
        //         const collection = db.collection('frontScan');
        //         collection.updateOne(queryByKey, updateFrontScan, function(err, res){
        //             if(err) logger.error(err);
        //             callback();
        //         })
        //     }

        //     logger.debug('connecting to frontScan collection');

        //     // insert new scan to 'frontScan' collection
        //     insertFrontScanToDb(db, function(){
        //         // send front scan to server
        //         sendScanToServer(function(){
        //             // update sent status to 'frontScan' collection after sending to server
        //             updateFrontScanToDb(db, function(){
        //                 client.close();
        //             });
        //         });
        //     })
        // });

    }
    //  If scanned tote not a valid value
    else{
        logger.waring('Scan unknown tote:', scanParams.val, ', Please scan again!');
        socket.emit('scanner:unknown', scanApi);
        mongoClient.connect(url, { useUnifiedTopology: true }, function(err, client){
            const db = client.connect(WALL_DB);
            const warningMess = `unknown front scan:${scanParams.val}`;
            const warningObj = message.generateWarning('wall-controller', warningMess);
            const collection = db.collection(WARNING_COLECTION);
            collection.insertOne(warningObj, function(err, res){
                if(err) logger.error(err);
                client.close();
            });
        });
    }
});


event.on('scanner:back', function(scanParams){
    const query = { name: scanParams.wall };

    let scanApi = message.generateApi('newScan', 'wallController', scanParams);
    let scanArray = scanParams.val.split('-');
    let firstElementScan = scanArray[0];
    let sizeOfScan = scanParams.val.split('-').length;

    if(sizeOfScan == 2 && (firstElementScan === "M" || firstElementScan === "L" || firstElementScan === "S")){
        exportToteNow = scanParams.val;
    }
    else{
        logger.debug(`Scan unknown tote:${scanParams.val} Please scan again!`, FILE_NAME);
    }

    if(mongoEnable){
        // Insert new event to database
        mongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
            if (err) logger.error(err);
            const db = client.db(WALL_DB);
            let temp = {};
            temp.val = scanParams.val;
            temp.side = 'back';
            temp.date = Date(Date.now());
            
            db.collection("scanner").insertOne(temp, function(err, res){
                if (err) logger.error(err);
                client.close();
            });
        });
    }
});


event.on('wall:completeOne', function(wallCoor){
    // create query by wall name to access database
    logger.debug('wall complete!!!', FILE_NAME)
    const queryByPosition = { coordinate: wallCoor}
    const newBackupValues = createDbSchema.backupSchema([], "", wallCoor, null, false, false, false, false);
    logger.debug('reset shema', FILE_NAME, newBackupValues);

    if(mongoEnable)
    mongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
        if (err) logger.error(err);
        const db = client.db(WALL_DB);

        const updateBackupDb = function(db, callback) {
            // Get the documents collection
            const collection = db.collection(BACKUP_COLLECTION);
            // Update document where a is 2, set b equal to 1
            collection.updateOne(queryByPosition, {$set: newBackupValues}, function(err, result) {
                callback(result);
            });
        };

        updateBackupDb(db, function(result){
            logger.debug('reset backup collection', FILE_NAME, result.result);
            client.close();
        })
    })


})


//  HANDLE EVENTS FROM UNIX SOCKET_______________________________________________________________________________________________________

//  HANDLE EVENTS FROM WEB SOCKET_________________________________________________________________________________________________________

//  handle scanner:confirm from server
socket.on('confirmWall', function(confirmApi){
    const confirmKey = confirmApi.key;
    const confirmDate = confirmApi.date;
    logger.debug('Confirm from server', FILE_NAME, {key: confirmKey});
    //  Find pennding message match the key then clear interval and remove it from pendingMessage array
    for(let i = 0; i < pendingMessages.length; i ++){
        if(pendingMessages[i].key === confirmKey){
            clearInterval(pendingMessages[i].interval);
            pendingMessages.splice(i, 1);
            logger.debug(pendingMessages, FILE_NAME);
        }
    }
    const queryByKey = { key: confirmKey, date: confirmDate};
    const updateFrontScanValue = {$set: {confirm: true}};
    mongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
        if (err) logger.error(err);
        //  Find and remove message match the key in database
        const db = client.db(WALL_DB);
        db.collection("frontScan").updateOne(queryByKey, updateFrontScanValue, function(err, res){
            if (err) logger.error(err);
            logger.debug(`Delete pending api with key:${confirmKey} from Db`, FILE_NAME, res.result);
            client.close();
        });
    });
});

//  Handle lightOn event from server
socket.on('lightOn', function(lightApi){
    logger.debug('lightOn event from server', FILE_NAME, lightApi);

    const wallName = lightApi.params.wall;
    const wallSide = lightApi.params.side;
    const wallKey = lightApi.key;
    const queryByName = { name: wallName };
    
    let newBackupValues = "";

    //  Emit light:on event to execute in ioControl.js
    let lightParams = {};
    lightParams.wall = accessWallByName(wallName).getCoordinate();
    lightParams.side = wallSide;
    event.emit('light:on', lightParams);

    //ipc.of.gpio.emit('light:on', lightApi.params);

    socket.emit('lightOnConfirm', message.generateApi('lightOnConfirm', 'wallController', {wall: wallName}, wallKey));

    if(mongoEnable){
        mongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
            if (err) logger.error(err);
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
                
                collection.updateOne(queryByName, newBackupValues, function(err, res) {
                    callback(res.result);
                });
            };

            const insertLightDb = function(db, callback){

                const collection = db.collection(RECEIVE_MESSAGE);

                collection.insertOne(lightApi , function(err, res){
                    if (err) logger.error(err);
                    callback(res.result);
                });
            }

            insertLightDb(db, function(res){
                logger.debug('insert lightOn event to \'received_messages\' collection', FILE_NAME, res);
                
                updateBackupDb(db, function(res){
                    logger.debug('update light state to \'backup\' collection', FILE_NAME, res);
                    client.close();
                });
                
            })

        });
    }
});

//  Handle lightOff event from server
socket.on('lightOff', function(lightApi){
    logger.debug('lightOff event from server', lightApi);

    const wallName = lightApi.params.wall;
    const wallSide = lightApi.params.side;
    const wallKey = lightApi.key;
    const queryByName = { name: wallName };
    let newBackupValues = "";
    //  Emit light:on event to execute in ioControl.js
    let lightParams = {};
    lightParams.wall = accessWallByName(wallName).getCoordinate();
    lightParams.side = wallSide;
    event.emit('light:off', lightParams);

    //wallStorage[lightApi.params.row - 1].backLightEnable = false;
    socket.emit('lightOffConfirm', message.generateApi('lightOffConfirm', 'wallController', {wall: wallName}, wallKey));
    
    if(mongoEnable){
        mongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
            if (err) logger.error(err);
            const db = client.db(WALL_DB);

            const updateBackupDb = function(db, callback) {

                const collection = db.collection(BACKUP_COLLECTION);

                if(wallSide == 'front'){
                    newBackupValues = { $set: {frontLight: false} };
                }
                else if(wallSide == 'back'){
                    newBackupValues = { $set: {backLight: false} };
                }
                
                collection.updateOne(queryByName, newBackupValues, function(err, res) {
                    callback(res.result);
                });
            };

            const insertLightDb = function(db, callback){

                const collection = db.collection(RECEIVE_MESSAGE);

                collection.insertOne(lightApi , function(err, res){
                    if (err) logger.error(err);
                    callback(res.result);
                })
            }
            
            updateBackupDb(db, function(result){
                logger.debug('update light state to backup collection', FILE_NAME, result);
                insertLightDb(db, function(result){
                    logger.debug('insert lightOn event to \'received_messages\' collection', FILE_NAME, result);
                    client.close();
                })
            })

        });
    }
});

socket.on('lightTest', function(lightApi){
    logger.debug('LightTest event from server', FILE_NAME, lightApi);
    event.emit('light:test', lightApi.params.side);
});

//  Handle getWallState event from server
socket.on('getWallState', function(d){
    logger.debug(d);
    return;
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

//  handle connection event from server
socket.on('connect', function(){
    logger.debug('Connected to web socket Server!', FILE_NAME);
    event.emit('light:error', {status: 0, side: 'front'});
    setTimeout(function(){
        event.emit('light:error', {status: 0, side: 'back'});
    })
});

//  handle disconnect event
socket.on('disconnect', function(){
    logger.fatal('disconnected from socketServer!');
    event.emit('light:error', {status: 1, side: 'front'});
    setTimeout(function(){
        event.emit('light:error', {status: 1, side: 'back'});
    })
});

//
socket.on('error', function(){
    logger.error(error);
});
