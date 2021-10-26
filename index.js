/**
 * Main file
 * Pi connect to server via websocket
 * Access GPIO with pigpio
 */

//  CONFIGURATION_________________________________________________________________________
require('dotenv').config({ path: './.env' });
const SERVER_URL = process.env.SERVER_URL;
const GLOBAL = require('./CONFIGURATION');
//  System id
const WALL_ID = GLOBAL.WALL_ID;
const BOOKSTORE_ID = GLOBAL.BOOKSTORE_ID;
//  db and collections name
const WALL_DB = GLOBAL.DB_NAME;
const BACKUP_COLLECTION = 'backup';
const HISTORY_COLLECTION = 'history';
const ERROR_COLLECTION = 'error';
const WARNING_COLECTION = 'warning';
const RECEIVE_MESSAGE = 'received_messages';
const SEND_MESSAGE = 'sent_messages';
const SCANNER_COLLECTION = 'scanner';
const FRONT_BUTTON_COLLECTION = 'front_button';
const BACK_BUTTON_COLLECTION = 'back_button';
const FILE_NAME = 'index.js   ';


//  WEB SOCKET____________________________________________________________________________
const io = require('socket.io-client');
const socket = io.connect(SERVER_URL);


//  MONGODB_______________________________________________________________________________
const mongoClient = require('mongodb').MongoClient;
const url = GLOBAL.MONGO_DB_URL;


//  SERIAL PORT________________________________________________________________________________
require('./serial');


//  NAMED PIPE____________________________________________________________________________
// IPC using named pipe, communicate between c++ side and nodejs side
const platformOS = process.platform;
if (platformOS == 'linux' || platformOS == 'darwin') {
    require('./gpio-ipc');
} else {
    console.log('Platform does not support gpio-ipc');
}


//  EVENT EMITTER__________________________________________________________________________
const event = require('./event');

//  FILES__________________________________________________________________________________
const fs = require('fs');
const path = require('path');


//  LOGGER__________________________________________________________________________
const logger = require('./logger/logger');


//  WALL CLASS_____________________________________________________________________________
// require wall objects
const { accessWallByName, accessWallByLocation } = require('./wallApi');
//  Import API generator send to web socket server
const message = require('./message');


//  VARIABLES______________________________________________________________________________

//  enable mongodb
const mongoEnable = true;

//  Enable moggodb driver log
const mongodbLogEnable = true;

// pending messages sending to web socket server
let pendingMessages = [];
const MAX_RETRY_COUNT = 5;

//  temporary scan from scanners 
let exportToteNow = null;
let importToteNow = null;

//  Temporary key for every API send to sockert server
const generateKey = require('./keyGenarate');
let frontScanKey = generateKey(3);
let backScanKey = generateKey(3);


mongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
    /**
     * -----------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * -----------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * START MAIN SCOPE
     * -----------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * -----------------------------------------------------------------------------------------------------------------------------------------------------------------------
     */
    if (err) logger.error({ message: error, location: FILE_NAME });
    const db = client.db(WALL_DB);

    //  RESTORE WALL STATUS FROM BACKUP____________________________________________________________________________________________________
    let isRestoredWallDone = false;

    logger.debug({ message: 'Main process started', location: FILE_NAME });
    //  Run main process

    const projection = {
        projection: {
            _id: 0,
            name: 1,
            location: 1,
            frontLight: 1,
            backLight: 1,
            lightIndex: 1
        }
    };

    /**
     * Find all wall status in database
     *  https://docs.mongodb.com/realm/mongodb/actions/collection.find/
     */
    db.collection(BACKUP_COLLECTION)
        .find({}, projection)
        .sort({ location: 1 })
        .toArray()
        .then(result => {
            restoreFromBackupDb(result);
            return new Promise((resolve, reject) => {
                if (isRestoredWallDone) resolve('Restore from backup completed');
                else reject('Fail to restore from backup!');
            });
        })
        .then(result => {
            logger.debug({ message: result, location: FILE_NAME });
            // Handle internal event
            event.on('button:front', handleFrontButtonFromGPIO);

            event.on('button:back', handleBackButtonFromGPIO);

            event.on('button:user', handleUserButtonFromGPIO);

            event.on('scanner:front', handleFrontScannerFromSerialPort);

            event.on('scanner:back', handleBackScannerFromSerialPort);

            event.on('scanner:opened', handleScannerOpenFromSerialPort);

            event.on('scanner:closed', handleScannerCloseFromSerialPort);

            event.on('scanner:error', handleScannerErrorFromSerialPort);

            event.on('wall:completeOne', handleCompleteEvent);

            //  Handle event from websocket
            socket.on('confirmWall', handleConfirmFromServer);

            socket.on('lightOn', handleLightOnFromServer);

            socket.on('lightOff', handleLightOffFromServer);

            socket.on('lightTest', handleLightTestFromServer);

            socket.on('getWallStatus', handleGetWallStatusFromServer);

            socket.on('wallError', handleErrorFromServer);

            socket.on('connect', handleSocketConnection);

            socket.on('disconnect', handleSocketDisconnection);

            socket.on('error', handleSocketError);
        })
        .catch(error => logger.error({ message: error, location: FILE_NAME }));
    /**
     * -----------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * -----------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * END MAIN SCOPE
     * -----------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * -----------------------------------------------------------------------------------------------------------------------------------------------------------------------
     */


    /**
     * -----------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * -----------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * FUNCTIONS DEFINITION
     * -----------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * -----------------------------------------------------------------------------------------------------------------------------------------------------------------------
     */

    /**
     * Read and load all light state in database
     * @param {Array} backupState 
     */
    function restoreFromBackupDb(backupState) {
        let frontBitmap = 0;
        let backBitmap = 0;
        //  Check light state of wall
        for (idx in backupState) {
            const wallState = backupState[idx];

            //  Emit light event
            if (wallState.frontLight == true) {
                const bitmask = (1 << wallState.lightIndex >>> 0);
                frontBitmap |= bitmask;
                frontBitmap >>>= 0;
            }
            if (wallState.backLight == true) {
                const bitmask = (1 << wallState.lightIndex >>> 0);
                backBitmap |= bitmask;
                backBitmap >>>= 0;
            }
        }
        isRestoredWallDone = true;
        event.emit('light:set', { bitmap: frontBitmap, side: 'front' });
        setTimeout(function () {
            event.emit('light:set', { bitmap: backBitmap, side: 'back' });
        }, 500);
    }

    /**
     * Handle 'button:front' event from gpio
     * Emitted in 'gpio-ipc.js'
     */
    function handleFrontButtonFromGPIO(buttonParams) {
        logger.debug({ message: 'button:front event from gpio-ipc', location: FILE_NAME, value: buttonParams });
        const buttonLocation = buttonParams.button;

        // create query by wall location to access database
        const queryByLocation = { location: buttonLocation };
        const backupCollection = db.collection(BACKUP_COLLECTION);
        //  Get wall state from db
        backupCollection.findOne(queryByLocation, (err, res) => {
            if (err) console.log(err);
            const wallState = res;
            const wallName = wallState.name;
            const frontLightState = wallState.frontLight;

            const isWallReadyToPut = frontLightState == true && importToteNow != null;

            console.log(wallState);
            //  Check if wall is ready to put tote in (Light on wall is on and a tote was scanned)
            if (isWallReadyToPut) {
                event.emit('lcd:print', {
                    message: `Hang len:Khay ${importToteNow}:Nhap vao:Tuong ${wallName}`
                });
                buttonParams.tote = importToteNow;

                const tempApi = message.generateApi('mergeWall:putToLight', { wall: wallName }, frontScanKey);
                socket.emit('pushToWall', tempApi);
                importToteNow = null;

                let newBackupValues = { $set: { frontLight: false } };
                db.collection(BACKUP_COLLECTION).updateOne(queryByLocation, newBackupValues, function (err, res) {
                    if (err) logger.error({ message: error, location: FILE_NAME });
                    logger.debug({ message: 'change light state in database', location: FILE_NAME, value: res.result });

                    event.emit('light:off', {
                        wall: wallName,
                        location: wallState.location,
                        lightIndex: wallState.lightIndex,
                        side: 'front'
                    });
                });

                logger.debug({ message: `Tote ${buttonParams.tote} push to wall ${wallName}, key: ${tempApi.key}`, location: FILE_NAME });
            }
            else {
                logger.debug({ message: 'Front button pressed, not valid button!!!', location: FILE_NAME });
                event.emit('light:off', {
                    wall: wallName,
                    location: wallState.location,
                    lightIndex: wallState.lightIndex,
                    side: 'front'
                });    // This line just for local test run, disable this in production mode
            }
        });
    };

    /**
     * Handle 'button:back' event from gpio
     * Emitted in 'gpio-ipc.js'
     */
    function handleBackButtonFromGPIO(buttonParams) {
        logger.debug({ message: 'button:back event', location: FILE_NAME, value: buttonParams });
        const buttonLocation = buttonParams.button;

        // create query by wall location to access database
        const queryByLocation = { location: buttonLocation };
        const backupCollection = db.collection(BACKUP_COLLECTION);
        const historyColection = db.collection(HISTORY_COLLECTION);

        //  Get wall state from db
        backupCollection.findOne(queryByLocation, (err, res) => {
            if (err) console.log(err);
            const wallState = res;
            const wallName = wallState.name;
            const backLightState = wallState.backLight;

            // let str = `${wallName} => ${exportToteNow}`;
            // event.emit('print', str);
            // event.emit('print:action', `Hang xuong:\n   Tuong ${wallName}\nNhap vao\n   Khay ${exportToteNow}`);

            //  Check if wall is ready to pick tote (Light on wall is on and a tote was scanned)
            const isWallReadyToPick = (backLightState == true) && (exportToteNow != null);
            console.log(wallState);

            if (isWallReadyToPick) {
                let params = {
                    wall: wallName,
                    importTote: wallState.importTote,
                    exportTote: exportToteNow
                };

                let tempApi = message.generateApi('mergeWall:pickToLight', params, backScanKey);
                logger.debug({ message: `Wall ${wallName} pick to tote ${exportToteNow}, key: ${tempApi.key}`, location: FILE_NAME });
                socket.emit('pickToLight', tempApi);

                const newBackupValues = { $set: { exportTote: exportToteNow, completed: true, backLight: false } };
                backupCollection.updateOne(queryByLocation, newBackupValues)
                    // Update exportTote on wall to database
                    .then(result => {
                        logger.debug({ message: 'update to backup result', location: FILE_NAME, value: result });

                        const newHistoryValues = {
                            wall: wallState.name,
                            importTotes: wallState.importTote,
                            exportTote: exportToteNow,
                            timeComplete: Date(Date.now())
                        }
                        // Insert an history event(a complete merge on wall) to database
                        return historyColection.insertOne(newHistoryValues);
                    })
                    .then(result => {
                        logger.debug({ message: 'insert to history result', location: FILE_NAME, value: result });
                        event.emit('light:off', {
                            wall: wallName,
                            location: wallState.location,
                            lightIndex: wallState.lightIndex,
                            side: 'back'
                        });
                        // All things done, emit an complete event
                        event.emit('wall:completeOne', wallName);
                    })
                    .catch(err => {
                        logger.error({ message: 'Fail to insert to database', location: FILE_NAME, value: err });
                    });

            } else {
                if (exportToteNow != null)
                    logger.debug({ message: 'Back button pressed, scan container first!!!', location: FILE_NAME });
                event.emit('light:off', {
                    wall: wallName,
                    location: wallState.location,
                    lightIndex: wallState.lightIndex,
                    side: 'back'
                });    // This line just for local test run, disable this in production mode
            }
        });
    };

    /**
     * Handle 'button:user' event from gpio
     * Emitted in 'gpio-ipc.js'
     * These buttons locate on elecrical cabin
     */
    function handleUserButtonFromGPIO(buttonParams) {
        logger.debug({ message: 'button:user event', location: FILE_NAME, value: buttonParams });
        switch (buttonParams.button) {
            case 'U.1.1':
                //
                break;
            case 'U.2.1':
                //
                break;
            case 'U.3.1':
                runningLight();
                break;
            case 'U.4.1':
                cancelAction();
                break;
            case 'U.5.1':
                restoreLightFromDatabase();
                break;
            case 'U.6.1':
                testLightProgram();
                break;
            default:
                logger.waring({ message: `Bad params for 'button:user' event`, location: FILE_NAME });
        }

        function restoreLightFromDatabase() {
            db.collection(BACKUP_COLLECTION)
                .find({}, projection)
                .sort({ location: 1 })
                .toArray()
                .then(result => {
                    restoreFromBackupDb(result);
                })
                .catch(error => logger.error({ message: 'Error restore GPIO', location: FILE_NAME, value: error }));
        }

        function runningLight() {
            let lightBitmap = 1;
            let count = 0;
            const testLightInterval = setInterval(() => {
                lightBitmap = 1 << count >>> 0;
                event.emit('light:test', { bitmap: lightBitmap, side: 'front' });
                count++;
                if (count == 32) {
                    clearInterval(testLightInterval);
                    reloadLightFromMemory();
                }
            }, 500);
        }

        function reloadLightFromMemory() {
            // Reload light state
            event.emit('light:reload', { side: 'front' });
            setTimeout(function () {
                event.emit('light:reload', { side: 'back' });
            }, 500);
        }

        function cancelAction() {
            //  Clear data from scanners
            importToteNow = null;
            exportToteNow = null;
            //  Reset front lights
            db.collection(BACKUP_COLLECTION).updateMany({ frontLight: true }, { $set: { frontLight: false } }, (err, res) => {
                if (err) logger.error({ message: 'Fail to update database', location: FILE_NAME, value: err });
                else logger.debug({ message: 'Reset front light', location: FILE_NAME, value: res });
            });
        }

        function testLightProgram() {
            // Turn on all lights
            const bitmap = (2 ** 32 - 1) >>> 0;
            event.emit('light:test', { bitmap: bitmap, side: 'front' });
            setTimeout(() => {
                event.emit('light:test', { bitmap: bitmap, side: 'back' });
            }, 500);
            setTimeout(() => {
                reloadLightFromMemory();
            }, 10000);
        }
    };

    /**
     * Check if scanned tote is valid
     * @param {String} value Data from scanner
     */
    function isScannedToteValid(value) {
        let scanArray = value.split('-');
        let firstElementScan = scanArray[0];
        let sizeOfScan = value.split('-').length;

        //  Check if scanned tote a valid value
        if (sizeOfScan == 2 && (firstElementScan === "M" || firstElementScan === "L" || firstElementScan === "S")) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * Handle 'scanner:front' event from gpio
     * Emitted in 'gpio-ipc.js'
     */
    function handleFrontScannerFromSerialPort(scanParams) {
        //logger.debug({message: 'New front scan', location: FILE_NAME, value: scanParams});

        frontScanKey = generateKey(3);

        let scanApi = message.generateApi('mergeWall:scanToteToWall', { tote: scanParams.value }, frontScanKey);

        //  Check if scanned tote a valid value
        if (isScannedToteValid(scanParams.value)) {
            socket.emit('scanTotePushToWall', scanApi);
            logger.debug({ message: `Send 'scanTotePushToWall' message to server`, location: FILE_NAME, value: scanApi });

            function sendScanToServer(callback) {
                let tempMess = {};
                tempMess.count = 0;

                tempMess.interval = setInterval(function () {
                    logger.debug({ message: `Resend message with key #${frontScanKey}!`, location: FILE_NAME });
                    //socket.emit('scanTotePushToWall', scanApi);
                    tempMess.count++;
                    if (tempMess.count >= MAX_RETRY_COUNT) {
                        logger.debug({ message: `Message with key #${frontScanKey} has been called ${MAX_RETRY_COUNT} times and stopped!!!`, location: FILE_NAME });
                        //  Stop interval
                        clearInterval(tempMess.interval);
                    }
                }, 2000);

                tempMess.key = frontScanKey;
                pendingMessages.push(tempMess);

                if (pendingMessages.length > 10) {
                    logger.debug({ message: 'pending messages are larger than 10!!!', location: FILE_NAME });
                }

                callback();
            }

            importToteNow = scanParams.value;

        }
        //  If scanned tote not a valid value
        else {
            logger.waring({ message: `Scan unknown tote to put on wall: ${scanParams.val}` });
            //socket.emit('scanner:unknown', scanApi);
            const warningMess = `unknown front scan:${scanParams.val}`;
            const warningObj = message.generateWarning('wall-controller', warningMess);
            const collection = db.collection(WARNING_COLECTION);
            collection.insertOne(warningObj, function (err, res) {
                if (err) logger.error({ message: error, location: FILE_NAME });
            });
        }
    };

    /**
     * Handle 'scanner:front' event from gpio
     * Emitted in 'gpio-ipc.js'
     */
    function handleBackScannerFromSerialPort(scanParams) {

        backScanKey = generateKey(3);

        if (isScannedToteValid(scanParams.value)) {
            exportToteNow = scanParams.value;
        } else {
            logger.debug({ message: `Scan unknown tote to pick from wall:${scanParams.value}`, location: FILE_NAME });
        }
        // Insert new event to database
        const db = client.db(WALL_DB);
        let temp = {};
        temp.val = scanParams.value;
        temp.side = 'back';
        temp.date = Date(Date.now());

        db.collection("scanner").insertOne(temp, function (err, res) {
            if (err) logger.error({ message: error, location: FILE_NAME });
        });
    };

    function handleScannerOpenFromSerialPort(message) {
        logger.debug({ message: message, location: FILE_NAME });
    };

    function handleScannerCloseFromSerialPort(message) {
        logger.debug({ message: message, location: FILE_NAME });
    };
    function handleScannerErrorFromSerialPort(message) {
        logger.debug({ message: message, location: FILE_NAME });
    }


    /**
     * Handle 'wall:completeOne' event
     * Emitted in 'index.js' when a merge completed on wall
     */
    function handleCompleteEvent(wallName) {
        // create query by wall name to access database
        logger.debug({ message: 'wall complete!!!', location: FILE_NAME })
        const queryByName = { name: wallName }
        const newBackupValues = {
            importTote: [],
            exportTote: null,
            completed: false
        }

        const collection = db.collection(BACKUP_COLLECTION);
        // Update document where a is 2, set b equal to 1
        collection.updateOne(queryByName, { $set: newBackupValues }, function (err, res) {
            if (err) logger.error({ message: 'Fail to update database', location: FILE_NAME });
            logger.debug({ message: `Empty wall ${wallName}`, location: FILE_NAME, value: res });
        });
    };

    function handleConfirmFromServer(confirmApi) {
        const confirmKey = confirmApi.key;
        const confirmDate = confirmApi.date;
        logger.debug({ message: 'Confirm from server', location: FILE_NAME, value: { key: confirmKey } });

        //  Find pennding message match the key then clear interval and remove it from pendingMessage array
        for (let i = 0; i < pendingMessages.length; i++) {
            if (pendingMessages[i].key === confirmKey) {
                clearInterval(pendingMessages[i].interval);
                pendingMessages.splice(i, 1);
                logger.debug({ pendingMessages, location: FILE_NAME });
            }
        }

        //  Find and remove message match the key in database
        const queryByKey = { key: confirmKey, date: confirmDate };
        const updateFrontScanValue = { $set: { confirm: true } };
        db.collection("frontScan").updateOne(queryByKey, updateFrontScanValue, function (err, res) {
            if (err) logger.error({ message: error, location: FILE_NAME });
            logger.debug({ message: `Delete pending api with key:${confirmKey} from Db`, location: FILE_NAME, value: res.result });
        });
    };

    function handleLightOnFromServer(lightApi) {
        logger.debug({ message: `'lightOn' message from server`, location: FILE_NAME, value: lightApi });

        //  Insert message to database
        db.collection(RECEIVE_MESSAGE).insertOne(lightApi, (err, res) => {
            if (err) logger.error({ message: error, location: FILE_NAME });
            logger.debug({ message: 'insert lightOn event to \'received_messages\' collection', location: FILE_NAME, value: res.result });
        });

        //  Get wall state from db
        const wallName = lightApi.params.wall;
        const wallSide = lightApi.params.side;
        const tempKey = lightApi.key;
        const queryByName = { name: wallName };
        db.collection(BACKUP_COLLECTION).findOne(queryByName, (err, res) => {
            if (err) logger.error({ message: 'Fail to find wall in database', location: FILE_NAME, value: err });
            const wallState = res;
            const isWallNameValid = wallState != undefined;
            const isWallSideValid = wallSide === 'front' || wallSide === 'back';

            //  Check if wallName is valid
            if (!isWallNameValid) {
                //  Emit error message to server
                socket.emit('wallError', message.generateApi('mergeWall:error', { wall: wallName, message: 'Invalid wall' }, tempKey));
                //  Log error
                logger.error({ message: 'Not a valid message from server', value: { key: tempKey } });
            } else if (!isWallSideValid) {
                //  Emit error message to server
                socket.emit('wallError', message.generateApi('mergeWall:error', { wall: wallName, message: 'Invalid side' }, tempKey));
                //  Log error
                logger.error({ message: 'Not a valid message from server', value: { key: tempKey } });
            } else {
                //  Emit light:on event to execute in ioControl.js
                event.emit('light:on', {
                    wall: wallState.name,
                    location: wallState.location,
                    lightIndex: wallState.lightIndex,
                    side: wallSide
                });

                //  Emit confirm message to server
                socket.emit('lightOnConfirm', message.generateApi('mergeWall:lightOnConfirm', { wall: wallName }, tempKey));

                //  Update states to database
                const db = client.db(WALL_DB);
                const queryByName = { name: wallName };
                let newBackupValues = "";

                if (wallSide === 'front') {
                    newBackupValues = { $set: { frontLight: true }, $push: { importTote: importToteNow } };
                } else if (wallSide === 'back') {
                    newBackupValues = { $set: { backLight: true } };
                }

                db.collection(BACKUP_COLLECTION).updateOne(queryByName, newBackupValues, (err, res) => {
                    if (err) logger.error({ message: error, location: FILE_NAME });
                    logger.debug({ message: 'update light state to \'backup\' collection', location: FILE_NAME, value: res.result });
                });
            }
        });

    };

    function handleLightOffFromServer(lightApi) {
        logger.debug({ message: `'lightOff' message from server`, location: FILE_NAME, value: lightApi });

        //  Insert message to database
        db.collection(RECEIVE_MESSAGE).insertOne(lightApi, (err, res) => {
            if (err) logger.error({ message: error, location: FILE_NAME });
            logger.debug({ message: 'insert lightOff event to \'received_messages\' collection', location: FILE_NAME, value: res.result });
        });

        //  Get wall state from db
        const wallName = lightApi.params.wall;
        const wallSide = lightApi.params.side;
        const tempKey = lightApi.key;
        const queryByName = { name: wallName };
        db.collection(BACKUP_COLLECTION).findOne(queryByName, (err, res) => {
            if (err) logger.error({ message: 'Fail to find wall in database', location: FILE_NAME, value: err });
            const wallState = res;
            const isWallNameValid = wallState != undefined;
            const isWallSideValid = wallSide === 'front' || wallSide === 'back';

            //  Check if wallName is valid
            if (!isWallNameValid) {
                //  Emit error message to server
                socket.emit('wallError', message.generateApi('mergeWall:error', { wall: wallName, message: 'Invalid wall' }, tempKey));
                //  Log error
                logger.error({ message: 'Not a valid message from server', value: { key: tempKey } });
            } else if (!isWallSideValid) {
                //  Emit error message to server
                socket.emit('wallError', message.generateApi('mergeWall:error', { wall: wallName, message: 'Invalid side' }, tempKey));
                //  Log error
                logger.error({ message: 'Not a valid message from server', value: { key: tempKey } });
            } else {
                //  Emit light:off event to execute in ioControl.js
                event.emit('light:off', {
                    wall: wallState.name,
                    location: wallState.location,
                    lightIndex: wallState.lightIndex,
                    side: wallSide
                });

                //  Emit confirm message to server
                socket.emit('lightOffConfirm', message.generateApi('mergeWall:lightOnConfirm', { wall: wallName }, tempKey));

                //  Update states to database
                const db = client.db(WALL_DB);
                const queryByName = { name: wallName };
                let newBackupValues = "";

                if (wallSide === 'front') {
                    newBackupValues = { $set: { frontLight: false } };
                } else if (wallSide === 'back') {
                    newBackupValues = { $set: { backLight: false } };
                }

                db.collection(BACKUP_COLLECTION).updateOne(queryByName, newBackupValues, (err, res) => {
                    if (err) logger.error({ message: error, location: FILE_NAME });
                    logger.debug({ message: 'update light state to \'backup\' collection', location: FILE_NAME, value: res.result });
                });
            }
        });
    };

    function handleLightTestFromServer(lightApi) {
        logger.debug({ message: `'LightTest' message from server`, location: FILE_NAME, value: lightApi });
        //
    };

    function handleGetWallStatusFromServer(d) {
        logger.debug({ message: 'request wall status FROM SERVER', value: d });
        return;
    };

    function handleErrorFromServer(errApi) {
        logger.debug({ message: `'wallError' message from server`, location: FILE_NAME, value: errApi });
        let str = '';
        let arr = errApi.params.message.split(' ');
        //  screen have 4 row and 16 digits each row, add '\n' at the end of a row and '\r' at the end of message

        event.emit('towerlight:set', {
            status: 'warning',
            side: 'front',
            redLight: true,
            greenLight: false
        });
        setTimeout(function () {
            event.emit('towerlight:set', {
                status: 'warning',
                side: 'back',
                redLight: true,
                greenLight: false
            });
        }, 500);

        //  emit event to print error message on screen
        event.emit('lcd:print', {
            code: 101,
            message: errApi.params.message
        });
    };

    function handleSocketConnection() {
        logger.debug({ message: 'Connected to web socket Server!', location: FILE_NAME });


        event.emit('towerlight:set', {
            status: 'normal',
            side: 'front',
            redLight: false,
            greenLight: true
        });
        setTimeout(function () {
            event.emit('towerlight:set', {
                status: 'normal',
                side: 'back',
                redLight: false,
                greenLight: true
            });
        }, 500);

        //  emit event to print error message on screen
        event.emit('lcd:print', {
            code: 201,
            message: 'Da ket noi SERVER!'
        });
    };

    function handleSocketDisconnection() {
        logger.fatal({ message: 'disconnected from socketServer!' });


        event.emit('towerlight:set', {
            status: 'error',
            side: 'front',
            redLight: true,
            greenLight: false
        });
        setTimeout(function () {
            event.emit('towerlight:set', {
                status: 'error',
                side: 'back',
                redLight: true,
                greenLight: false
            });
        }, 500);

        //  emit event to print error message on screen
        event.emit('lcd:print', {
            code: 202,
            message: 'Mat ket noi SERVER'
        });
    };

    function handleSocketError() {
        logger.error({ message: error, location: FILE_NAME });


        event.emit('towerlight:set', {
            status: 'error',
            side: 'front',
            redLight: true,
            greenLight: flase
        });
        setTimeout(function () {
            event.emit('towerlight:set', {
                status: 'error',
                side: 'back',
                redLight: true,
                greenLight: false
            });
        }, 500);

        //  emit event to print error message on screen
        event.emit('lcd:print', {
            code: 203,
            message: 'Loi ket noi SERVER'
        });
    };

});
