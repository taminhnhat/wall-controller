/**
 * Main file
 * Pi connect to server via websocket using socket.io-client
 * Access GPIO with pigpio
 */

//  WEB SOCKET____________________________________________________________________________

const io = require('socket.io-client');
//var socket = io.connect('http://app3.fahasa.com:1300/');
//var socket = io.connect('http://192.168.1.157:8080');
var socket = io.connect('ws://172.16.0.100:3000');
//var socket = io.connect('http://192.168.1.157:3001');


if(process.platform == 'linux'){
    var ioControl = require('./ioControl');
}
else if(process.platform == 'win32'){
    //
}

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
//const pipe = require('./pipe/pipe');

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
var wall = require('./wallApi');

const createDbSchema = require('./schema')

//  Import API generator send to web socket server
const api = require('./api');


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
    console.log('Waiting to restore from database')
    let backupState = {}
    if(mongoEnable)
    mongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
        if (err) throw err;
        const db = client.db("wall");
        db.collection("backup").find({}, { projection: { _id: 0, name: 1, frontLight: 1, backLight: 1, importTote: 1, exportTote: 1 } }).toArray(function(err, res){
            if (err) throw err;
            backupState = res;
            client.close();
            for(idx in backupState){
                let wallState = backupState[idx]
                console.log('backup', wallState)
                if(wallState.frontLight == true){
                    event.emit('light:on', {wall: wallState.name, side: 'front'});
                }
                if(wallState.backLight == true){
                    event.emit('light:on', {wall: wallState.name, side: 'back'});
                }

            }
        });
    });
}
restoreFromBackupDb();

//  HANDLE EVENTS FROM EVENT EMITTER_______________________________________________________________________________________

//  Listenning event from event emitter
event.on('start', function(){
    console.log('Start listenning events!');
});
//
event.on('button:front', function(buttonParams){

    //logger.info(`${Date(Date.now())} | wallController/index.js | button ${buttonParams.wall} pressed`);

    const wallName = buttonParams.wall;
    // create query by wall name to access database
    const queryByName = { name: wallName };
    let newValues = { $set: {frontLight: false} };

    let str = `${importToteNow} => ${wallName}`;
    console.log(str + ' pressed');
    event.emit('print', str);
    event.emit('print:action', `Hang len:\n   Khay ${importToteNow}\nNhap vao\n   Tuong ${wallName}`);
    buttonParams.tote = importToteNow;
    let tempApi = api.generateApi('pressButton', 'wallController', buttonParams);
    console.log(`Tote ${buttonParams.tote} push to wall ${wallName}, key: ${tempApi.key}`);
    if(importToteNow != null){
        socket.emit('pushToWall', tempApi);
    }
    else{
        console.log('Front button pressed, not valid button!!!');
    }
    importToteNow = null;

    if(mongoEnable){
        // Insert new event to database
        mongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
            if (err) throw err;
            const db = client.db("wall");
            db.collection("backup").updateOne(queryByName, newValues, function(err, res){
                if (err) console.error(err);
                console.log('Add newScan event to Db', res.result);
                client.close();
            });
        });
    }
});

//  'button:back' emitted in 'ioControl.js' when a button pressed
event.on('button:back', function(buttonParams){
    const wallName = buttonParams.wall;
    // create query by wall name to access database
    const queryByName = { name: wallName };
    const newBackupValues = { $set: {exportTote: exportToteNow, complete: true, backLight: false} };
    let newHistoryValues = {};

    let str = `${wallName} => ${exportToteNow}`;
    console.log(str + ' pressed');
    event.emit('print', str);
    event.emit('print:action', `Hang xuong:\n   Tuong ${wallName}\nNhap vao\n   Khay ${exportToteNow}`);
    if(exportToteNow != null){
        let lightParams = {};
        lightParams.wall = wallName;
        lightParams.side = 'back';
        buttonParams.tote = exportToteNow;

        let tempApi = api.generateApi('pressButton', 'wallController', buttonParams);
        console.log(`Wall ${wallName} pick to tote ${buttonParams.tote}, key: ${tempApi.key}`);
        socket.emit('pickToLight', tempApi);
        
        if(mongoEnable){
            // Insert new event to database
            mongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
                if (err) throw err;
                const db = client.db("wall");

                // function update 'backup' collection with new tote scanned, set 'backlight' to false and 'complete' to true
                const updateBackupDb = function(db, callback) {
                    // Get the documents collection
                    const collection = db.collection('backup');
                    // Update document where a is 2, set b equal to 1
                    collection.updateOne(queryByName, newBackupValues, function(err, result) {
                        callback(result);
                    });
                };

                // function ind all proberties of this wall in 'backup' collection
                const findBackupDb = function(db, callback) {
                    // Get the documents collection
                    const collection = db.collection('backup');
                    // Update document where a is 2, set b equal to 1
                    collection.findOne(queryByName, function(err, result) {
                        callback(result);
                    });
                };

                // function create a new complete action on this wall then insert to 'history' collection
                const insertHistoryDb = function(db, callback) {
                    // Get the documents collection
                    const collection = db.collection('history');
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

    let scanApi = api.generateApi('newScan', 'wallController', scanParams, frontScanKey);
    let scanArray = scanParams.val.split('-');
    let firstElementScan = scanArray[0];
    let sizeOfScan = scanParams.val.split('-').length;

    if(sizeOfScan == 2 && (firstElementScan === "M" || firstElementScan === "L" || firstElementScan === "S")){
        console.log(`Scan tote ${scanParams.val}, key: ${frontScanKey}`);
        socket.emit('scanTotePushToWall', scanApi);    
        
        function sendScanToServer(callback){
            let tempMess = {};
            tempMess.count = 0;

            tempMess.interval = setInterval(function(){
                console.log(`Resend message with key #${frontScanKey}!`);
                socket.emit('scanTotePushToWall', scanApi);
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
            if (err) throw err;
            const db = client.db("wall");

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
    else{
        console.log('Scan unknown tote:', scanParams.val, ', Please scan again!');
        socket.emit('scanner:unknown', scanApi);
    }

});


event.on('scanner:back', function(scanParams){
    const query = { name: scanParams.wall };

    console.log('---------------');
    let scanApi = api.generateApi('newScan', 'wallController', scanParams);
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
            //if (err) throw err;
            const db = client.db("wall");
            let temp = {};
            temp.val = scanParams.val;
            temp.side = 'back';
            temp.date = Date(Date.now());
            
            db.collection("scanner").insertOne(temp, function(err, res){
                if (err) throw err;
                client.close();
            });
        });
    }
});


event.on('wall:completeOne', function(wallName){
    // create query by wall name to access database
    console.log('wall complete!!!')
    const queryByName = { name: wallName}
    const newBackupValues = createDbSchema.backupSchema([], "", wallName, null, false, false, false, false);
    console.log('reset shema', newBackupValues);

    if(mongoEnable)
    mongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
        if (err) throw err;
        const db = client.db("wall");

        const updateBackupDb = function(db, callback) {
            // Get the documents collection
            const collection = db.collection('backup');
            // Update document where a is 2, set b equal to 1
            collection.updateOne(queryByName, {$set: newBackupValues}, function(err, result) {
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
    const confirmKey = confirmApi.key
    console.log('Confirm from server, key:', confirmKey);
    //  Find pennding message match the key then clear interval and remove it from pendingMessage array
    for(let i = 0; i < pendingMessages.length; i ++){
        if(pendingMessages[i].key === confirmKey){
            clearInterval(pendingMessages[i].interval);
            pendingMessages.splice(i, 1);
            console.log(pendingMessages);
        }
    }
    const queryByKey = { key: confirmKey };
    const updateFrontScanValue = {$set: {confirm: true}};
    mongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
        if (err) throw err;
        //  Find and remove message match the key in database
        const db = client.db("wall");
        db.collection("frontScan").updateOne(queryByKey, updateFrontScanValue, function(err, res){
            if (err) throw err;
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
    const queryByName = { name: wallName };

    wall(wallName).frontLight = true;
    
    let newBackupValues = "";

    let str = 'light on ' + wallName + ':' + wallSide;
    console.log(str);

    //event.emit('print', str);

    //  Emit light:on event to execute in ioControl.js
    event.emit('light:on', lightApi.params);

    //ipc.of.gpio.emit('light:on', lightApi.params);

    socket.emit('lightOnConfirm', api.generateApi('lightOnConfirm', 'wallController', {wall: wallName}, wallKey));

    if(mongoEnable){
        mongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
            if (err) console.error(err);
            const db = client.db("wall");

            const updateBackupDb = function(db, callback) {

                const collection = db.collection('backup');

                if(wallSide == 'front'){
                    wall(wallName).frontLight = true;
                    newBackupValues = { $set: {frontLight: true}, $push: {importTote: importToteNow} };
                }
                else if(wallSide == 'back'){
                    wall(wallName).backLight = true;
                    newBackupValues = { $set: {backLight: true}};
                }
                else{}
                
                collection.updateOne(queryByName, newBackupValues, function(err, result) {
                    callback(result);
                });
            };

            const insertLightDb = function(db, callback){

                const collection = db.collection('light');

                const newLightValue = createDbSchema.lightSchema(wallName, wallSide, 'on', wallKeyNow);

                collection.insertOne(newLightValue , function(err, res){
                    if (err) throw err;
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
    const queryByName = { name: wallName };
    let newBackupValues = "";
    const str = 'light off at address ' + wallName + wallSide;

    console.log(str);
    //event.emit('print', str);

    //  Emit light:on event to execute in ioControl.js
    event.emit('light:off', lightApi.params);

    //wallStorage[lightApi.params.row - 1].backLightEnable = false;
    socket.emit('lightOffConfirm', api.generateApi('lightOffConfirm', 'wallController', {wall: wallName}, wallKey));
    
    if(mongoEnable){
        mongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
            if (err) console.error(err);
            const db = client.db("wall");

            const updateBackupDb = function(db, callback) {

                const collection = db.collection('backup');

                if(wallSide == 'front'){
                    wall(lightApi.params.wall).frontLight = false;
                    newBackupValues = { $set: {frontLight: false} };
                }
                else if(wallSide == 'back'){
                    wall(lightApi.params.wall).backLight = false;
                    newBackupValues = { $set: {backLight: false} };
                }
                
                collection.updateOne(queryByName, newBackupValues, function(err, res) {
                    callback(res);
                });
            };

            const insertLightDb = function(db, callback){

                const collection = db.collection('light');

                const newLightValue = createDbSchema.lightSchema(wallName, wallSide, 'off', wallKeyNow);

                collection.insertOne(newLightValue , function(err, res){
                    if (err) throw err;
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

//  handle
socket.on('db:clear', function(collectionName, query){
    console.log('Clear db request from user!');
    // mongoClient.connect(url, { useUnifiedTopology: true }, function(err, db) {
    //     if (err) throw err;
    //     const db = client.db("wall");
    //     if(query == '')
    //     db.collection(collectionName).drop(function(err, delOK) {
    //         if (err) throw err;
    //         if (delOK) console.log(`Collection ${collectionName} deleted`);
    //         client.close();
    //     });
    //     else
    //     db.collection(collectionName).deleteOne(query, function(err, obj) {
    //         if (err) throw err;
    //         console.log("1 document deleted");
    //         client.close();
    //     });
    // });
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