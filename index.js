/**
 * Main file
 * Pi connect to server via websocket
 * Access GPIO with pigpio
 */

//  CONFIGURATION_________________________________________________________________________
require('dotenv').config({ path: './.env' });
const SERVER_URL = process.env.SERVER_URL;
const WALL_INDEX = Number(process.env.WALL_INDEX);
const GLOBAL = require('./CONFIGURATION');
//  db and collections name
const WALL_DB = process.env.DB_NAME;
const BACKUP_COLLECTION = 'backup';
const HISTORY_COLLECTION = 'history';
const LOG_COLLECTION = 'log';
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
    // require('./gpio-ipc');
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
//  Import API generator send to web socket server
const message = require('./message');


//  VARIABLES______________________________________________________________________________

//  Enable moggodb driver log
const mongodbLogEnable = true;

// pending messages sending to web socket server
let pendingMessages = [];

//  temporary scan from scanners 
let exportToteNow = null;
let importToteNow = null;
let exportTote_timeOut = null;

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

    logger.debug({ message: `${Date(Date.now())} Gateway process started`, location: FILE_NAME });
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
            restoreLight(result);
            rgbHubSetLight('1');
            rgbHubSetLight('2');
            rgbHubSetLight('3');
            rgbHubSetLight('4');
            rgbHubSetLight('5');
            return new Promise((resolve, reject) => {
                if (isRestoredWallDone) resolve('Restore from backup completed');
                else reject('Fail to restore from backup!');
            });
        })
        .then(result => {
            logger.debug({ message: result, location: FILE_NAME });

            //  Reload light state on wall (Dit me den tren mach nhieu nhu lone)
            // setInterval(restoreLightFromDatabase, 5000);

            // Handle internal event`
            event.on('button:front', handleFrontButtonFromGPIO);

            event.on('button:back', handleBackButtonFromGPIO);

            event.on('button:user', handleUserButtonFromGPIO);

            event.on('buttonFromScanner:front', handleFrontButtonFromScanner);

            event.on('buttonFromScanner:back', handleBackButtonFromScanner);

            // event.on('scanner:front', handleFrontScannerFromSerialPort);

            // event.on('scanner:back', handleBackScannerFromSerialPort);

            // event.on('scanner:opened', handleScannerOpenFromSerialPort);

            // event.on('scanner:closed', handleScannerCloseFromSerialPort);

            // event.on('scanner:error', handleScannerErrorFromSerialPort);

            event.on('rgbHub:data', handleRgbHubFromSerialPort);

            event.on('rgbHub:opened', handleRgbHubOpenFromSerialPort);

            event.on('rgbHub:closed', handleRgbHubCloseFromSerialPort);

            event.on('rgbHub:error', handleRgbHubErrorFromSerialPort);

            event.on('wall:completeOne', handleCompleteEvent);

            //  Handle event from websocket
            socket.on('confirmWall', handleConfirmFromServer);

            socket.on('mergeWall/lightOn', handleLightOnFromServer);

            socket.on('mergeWall/lightOff', handleLightOffFromServer);

            socket.on('mergeWall/reset', handleResetFromServer);

            socket.on('mergeWall/reload', handleReloadFromServer);

            // socket.on('mergeWall/lightTest', handleLightTestFromServer);

            // socket.on('mergeWall/confirmPutToLight', handleConfirmPutToLightFromServer);

            // socket.on('mergeWall/confirmPickToLight', handleConfirmPickToLightFromServer);

            // socket.on('mergeWall/getWallStatus', handleGetWallStatusFromServer);

            socket.on('mergeWall/error', handleErrorFromServer);

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
     * Reload all light state
     * @param {Array} backupState 
     */
    function restoreLight(backupState) {
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
     * 
     * @param {String} rowOfLedStrip 
     */
    function rgbHubSetLight(rowOfLedStrip) {
        const rgbProjection = {
            projection: {
                _id: 0,
                name: 1,
                location: 1,
                row: 1,
                col: 1,
                lightColor: 1,
                frontLight: 1,
                backLight: 1,
                lightIndex: 1
            }
        };
        db.collection(BACKUP_COLLECTION)
            .find({ row: rowOfLedStrip }, rgbProjection)
            .sort({ col: 1 })
            .toArray()
            .then(result => {
                let mess = `R${rowOfLedStrip}`;
                for (col = 0; col < result.length; col++) {
                    mess = mess + ':' + result[col].lightColor;
                }
                mess = mess + '\n';
                console.log(mess);
                event.emit('rgbHub:emit', { message: mess });
            });
    }

    function rgbHubSetFullRowEffect(rowOfLedStrip, lightColor) {
        const mess = `H${rowOfLedStrip}:${lightColor}\n`;
        event.emit('rgbHub:emit', { message: mess });
    }

    function rgbHubGetInfo() {
        const mess = 'GETINFO\n';
        event.emit('rgbHub:emit', { message: mess });
    }

    function rgbHubConfig(leds, cols, nodes) {
        const mess = `CFG:T${leds}.C${cols}.N${nodes}`;
        event.emit('rgbHub:emit', { message: mess });
    }

    /**
     * Read and load all light state from database
     * 
     */
    function restoreLightFromDatabase() {
        db.collection(BACKUP_COLLECTION)
            .find({}, projection)
            .sort({ location: 1 })
            .toArray()
            .then(result => {
                restoreLight(result);
            })
            .catch(error => logger.error({ message: 'Error restore GPIO', location: FILE_NAME, value: error }));
    }

    function cancelAction() {
        socket.emit('mergeWall/cancelPuttoLight', message.generateApi('mergeWall/cancelPuttoLight', { wallIndex: WALL_INDEX, tote: importToteNow }, frontScanKey));
        //  Clear data from scanners
        importToteNow = null;
        //  Reset front lights
        db.collection(BACKUP_COLLECTION).updateMany({ frontLight: true }, { $set: { frontLight: false } }, (err, res) => {
            if (err) logger.error({ message: 'Fail to update database', location: FILE_NAME, value: err });
            else logger.debug({ message: 'Reset front light', location: FILE_NAME, value: res });
            restoreLightFromDatabase();
        });
    }

    /**
     * Handle 'button:front' event from gpio
     * Emitted in 'gpio-ipc.js'
     */
    function handleFrontButtonFromGPIO(buttonParams) {
        logger.debug({ message: 'button:front', location: FILE_NAME, value: buttonParams });
        dbLog({ level: 'DEBUG', message: 'button:front', value: buttonParams });
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

            //  Check if wall is ready to put tote in (Light on wall is on and a tote was scanned)
            const isWallReadyToPut = frontLightState == true && importToteNow != null;
            if (isWallReadyToPut) {
                event.emit('lcd:print', {
                    message: `Hang len:Khay ${importToteNow}:Nhap vao:Tuong ${wallName}`
                });

                const tempApi = message.generateApi('mergeWall/putToLight', { tote: importToteNow, wall: wallName }, frontScanKey);
                socket.emit('mergeWall/putToLight', tempApi);
                importToteNow = null;
            }
            else {
                logger.debug({ message: 'Front button pressed, not valid button!!!', location: FILE_NAME });
                dbLog({ level: 'ERROR', message: 'Front button pressed, not valid button!' });
                restoreLightFromDatabase();
            }
        });
    };

    /**
     * Handle 'button:back' event from gpio
     * Emitted in 'gpio-ipc.js'
     */
    function handleBackButtonFromGPIO(buttonParams) {
        logger.debug({ message: 'button:back', location: FILE_NAME, value: buttonParams });
        dbLog({ level: 'DEBUG', message: 'button:back', value: buttonParams });
        const buttonLocation = buttonParams.button;

        // create query by wall location to access database
        const queryByLocation = { location: buttonLocation };

        //  Get wall state from db
        db.collection(BACKUP_COLLECTION).findOne(queryByLocation, (err, res) => {
            if (err) console.log(err);
            const wallState = res;
            const wallName = wallState.name;
            const backLightState = wallState.backLight;

            // let str = `${wallName} => ${exportToteNow}`;
            // event.emit('print', str);
            // event.emit('print:action', `Hang xuong:\n   Tuong ${wallName}\nNhap vao\n   Khay ${exportToteNow}`);

            //  Check if wall is ready to pick tote (Light on wall is on and a tote was scanned)
            const isWallReadyToPick = (backLightState == true) && (exportToteNow != null);
            if (isWallReadyToPick) {
                const newUpdatevalue = { exportTote: exportToteNow, completed: true };
                db.collection(BACKUP_COLLECTION).updateOne(queryByLocation, { $set: newUpdatevalue }, (err, res) => {
                    if (err) logger.error({ message: 'Fail to insert to database', location: FILE_NAME, value: err });
                    const params = {
                        wall: wallName,
                        importTote: wallState.importTote,
                        exportTote: exportToteNow
                    };
                    const tempApi = message.generateApi('mergeWall/pickToLight', params, backScanKey);
                    logger.debug({ message: `Wall ${wallName} pick to tote ${exportToteNow}, key: ${tempApi.key}`, location: FILE_NAME });
                    exportToteNow = null;
                    dbLog({ level: 'DEBUG', message: 'Pick to light', value: params });
                    socket.emit('mergeWall/pickToLight', tempApi);
                });

            } else {
                if (exportToteNow == null) {
                    logger.waring({ message: 'Back button pressed, scan tote first!!!', location: FILE_NAME });
                    dbLog({ level: 'WARNING', message: 'Back button pressed, No tote was scanned!' });
                }
                else {
                    logger.waring({ message: 'Back button pressed, not valid button!!!', location: FILE_NAME });
                    dbLog({ level: 'WARNING', message: 'Back button pressed, not valid button!', value: { wall: wallName } });
                }
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
        dbLog({ level: 'DEBUG', message: 'button:user', value: buttonParams });
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
                testLightProgram();
                break;
            case 'U.5.1':
                restoreLightFromDatabase();
                break;
            case 'U.6.1':
                cancelAction();
                break;
            default:
                logger.waring({ message: `Bad params for 'button:user' event`, location: FILE_NAME });
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

    function handleFrontButtonFromScanner(data) {
        db.collection(BACKUP_COLLECTION).findOne({ name: data.wall })
            .then(result => {
                const buttonLocation = result.location;
                event.emit('button:front', {
                    button: buttonLocation
                });
            })
            .catch(err => {
                if (err) logger.error({ message: error, location: FILE_NAME });
            })
    }

    function handleBackButtonFromScanner(data) {
        db.collection(BACKUP_COLLECTION).findOne({ name: data.wall })
            .then(result => {
                const buttonLocation = result.location;
                event.emit('button:back', {
                    button: buttonLocation
                });
            })
            .catch(err => {
                if (err) logger.error({ message: error, location: FILE_NAME });
            })
    }

    /**
     * Check if scanned tote is valid
     * @param {String} value Data from scanner
     */
    function isScannedToteValid(value) {
        const scanArray = value.split('-');
        const firstElementScan = scanArray[0];
        const sizeOfScan = value.split('-').length;

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

        importToteNow = null;
        //  Reset front lights
        db.collection(BACKUP_COLLECTION).updateMany({ frontLight: true }, { $set: { frontLight: false } }, (err, res) => {
            if (err) logger.error({ message: 'Fail to update database', location: FILE_NAME, value: err });
            else logger.debug({ message: 'Reset front light', location: FILE_NAME, value: res });
            restoreLightFromDatabase();
            frontScanKey = generateKey(3);

            //  Check if scanned tote a valid value
            if (isScannedToteValid(scanParams.value)) {
                const scanApi = message.generateApi('mergeWall/scanTotePutToLight', { wallIndex: WALL_INDEX, tote: scanParams.value }, frontScanKey);
                //
                socket.emit('mergeWall/scanTotePutToLight', scanApi);
                logger.debug({ message: `Send 'mergeWall/scanTotePutToLight' message to server`, location: FILE_NAME, value: scanApi });

                importToteNow = scanParams.value;
                logger.debug({ message: `Import tote: ${importToteNow}` });
            }
            //  If scanned tote not a valid value
            else {
                logger.waring({ message: `Unknown import tote: ${scanParams.value}` });
                dbLog({ level: 'DEBUG', message: 'Unknown import tote', value: scanParams });
            }
        });

        event.emit('towerlight:set', {
            status: 'warning',
            side: 'front',
            redLight: false,
            greenLight: 'ignore'
        });

    };

    /**
     * Handle 'scanner:front' event from gpio
     * Emitted in 'gpio-ipc.js'
     */
    function handleBackScannerFromSerialPort(scanParams) {

        backScanKey = generateKey(3);

        if (isScannedToteValid(scanParams.value)) {
            exportToteNow = scanParams.value;
            clearTimeout(exportTote_timeOut);
            exportTote_timeOut = setTimeout(() => {
                exportToteNow = null
            }, 10000);

            logger.debug({ message: `Export tote: ${exportToteNow}` });
        } else {
            logger.debug({ message: `Unknown export tote:${scanParams.value}`, location: FILE_NAME });
            dbLog({ level: 'WARNING', message: 'Unknown export tote', value: scanParams });
        }
        // Insert new event to database
        const db = client.db(WALL_DB);
        const temp = {
            value: scanParams.value,
            side: 'back',
            date: new Date().toISOString()
        };
    };

    function handleScannerOpenFromSerialPort(data) {
        logger.debug({ message: data.message, location: FILE_NAME });
        dbLog({ level: 'DEBUG', message: data.message });
    };

    function handleScannerCloseFromSerialPort(data) {
        logger.waring({ message: data.message, location: FILE_NAME });
        dbLog({ level: 'WARNING', message: data.message });
    };

    function handleScannerErrorFromSerialPort(data) {
        logger.error({ message: data.message, value: data.value, location: FILE_NAME });
        dbLog({ level: 'ERROR', message: data.message, value: data.value });
    }

    function handleRgbHubFromSerialPort(data) {
        if (data == 'RGB Hub start') {
            rgbHubSetLight('1');
            rgbHubSetLight('2');
            rgbHubSetLight('3');
            rgbHubSetLight('4');
            rgbHubSetLight('5');
        }
        logger.debug({ message: data.message, value: data.value, location: FILE_NAME });
        dbLog({ level: 'DEBUG', message: data.message });
    }

    function handleRgbHubOpenFromSerialPort(data) {
        logger.debug({ message: data.message, location: FILE_NAME });
        dbLog({ level: 'DEBUG', message: data.message });
    }

    function handleRgbHubCloseFromSerialPort(data) {
        logger.waring({ message: data.message, location: FILE_NAME });
        dbLog({ level: 'WARNING', message: data.message });
    }

    function handleRgbHubErrorFromSerialPort(data) {
        console.log('rgb hub error:', data);
        logger.error({ message: data.message, value: data.value, location: FILE_NAME });
        dbLog({ level: 'ERROR', message: data.message, value: data.value });
    }

    /**
     * Handle 'wall:completeOne' event
     * Emitted in 'index.js' when a merge completed on wall
     */
    function handleCompleteEvent(wallName) {
        // create query by wall name to access database
        logger.debug({ message: 'wall complete!!!', location: FILE_NAME });
        const queryByName = { name: wallName };
        const newBackupValues = {
            importTote: [],
            exportTote: null,
            lightColor: '000000',
            backLight: false,
            completed: false
        };

        db.collection(BACKUP_COLLECTION).updateOne(queryByName, { $set: newBackupValues }, function (err, res) {
            if (err) logger.error({ message: 'Fail to update database', value: err, location: FILE_NAME });
            logger.debug({ message: `Empty wall ${wallName}`, location: FILE_NAME });
            dbLog({ level: 'DEBUG', message: `Empty wall ${wallName}` });
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
    };

    function handleLightOnFromServer(lightApi) {
        logger.debug({ message: `Message from server`, location: FILE_NAME, value: lightApi });
        dbLog({ level: 'DEBUG', message: `Message from server`, value: lightApi });

        //  Get wall state from db
        const wallName = lightApi.params.wall;
        const wallSide = lightApi.params.side;
        const tempKey = lightApi.key;
        let lightColor = 'FFFFFF';
        if (lightApi.params.lightColor != undefined) {
            lightColor = lightApi.params.lightColor;
        }
        const queryByName = { name: wallName };
        db.collection(BACKUP_COLLECTION).findOne(queryByName, (err, res) => {
            if (err) logger.error({ message: 'Fail to find wall in database', location: FILE_NAME, value: err });
            const wallState = res;
            const isWallNameValid = wallState != undefined;
            const isWallSideValid = wallSide === 'front' || wallSide === 'back';

            //  Check if wallName is valid
            if (!isWallNameValid) {
                //  Log error
                logger.error({ message: 'Not a valid message from server', value: { key: tempKey } });
            } else if (!isWallSideValid) {
                //  Log error
                logger.error({ message: 'Not a valid message from server', value: { key: tempKey } });
            } else {
                //  Emit light:on event to execute in ioControl.js

                //  Update states to database
                let newBackupValues = "";

                if (wallSide === 'front') {
                    newBackupValues = { $set: { frontLight: true, lightColor: lightColor, importTime: Date.now() } };
                } else if (wallSide === 'back') {
                    newBackupValues = { $set: { backLight: true, lightColor: lightColor, exportTime: Date.now() } };
                }

                db.collection(BACKUP_COLLECTION).updateOne(queryByName, newBackupValues, (err, res) => {
                    if (err) logger.error({ message: error, location: FILE_NAME });
                    event.emit('light:on', {
                        wall: wallState.name,
                        location: wallState.location,
                        lightIndex: wallState.lightIndex,
                        lightColor: lightColor,
                        side: wallSide
                    });
                    const rowOfLedStrip = wallState.location.split('.')[2];
                    rgbHubSetLight(rowOfLedStrip);
                });
            }
        });

    };

    function handleLightOffFromServer(lightApi) {
        logger.debug({ message: `Message from server`, location: FILE_NAME, value: lightApi });


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
                //  Log error
                logger.error({ message: 'Not a valid message from server', value: { key: tempKey } });
            } else if (!isWallSideValid) {
                //  Log error
                logger.error({ message: 'Not a valid message from server', value: { key: tempKey } });
            } else {
                // if (wallSide === 'front') {
                //     const newBackupValues = {
                //         $set: {
                //             lightColor: '000000',
                //             frontLight: false,

                //         },
                //         $push: {
                //             importDuration: {
                //                 start: '$importTime',
                //                 end: Date.now(),
                //                 duration: { $concatArrays: [] }
                //             }
                //         }
                //     }
                // } else if (wallSide === 'back') {
                // create query by wall name to access database
                logger.debug({ message: 'wall complete!!!', location: FILE_NAME })
                const newBackupValues = {
                    importTote: [],
                    exportTote: null,
                    lightColor: '000000',
                    backLight: false,
                    completed: false
                };

                db.collection(BACKUP_COLLECTION).updateOne(queryByName, { $set: newBackupValues }, function (err, res) {
                    if (err) logger.error({ message: 'Fail to update database', value: err, location: FILE_NAME });
                    logger.debug({ message: `Empty wall ${wallName}`, location: FILE_NAME });
                    dbLog({ level: 'DEBUG', message: `Empty wall ${wallName}` });
                    event.emit('light:off', {
                        wall: wallState.name,
                        location: wallState.location,
                        lightIndex: wallState.lightIndex,
                        lightColor: '000000',
                        side: wallSide
                    });
                    const rowOfLedStrip = wallState.location.split('.')[2];
                    rgbHubSetLight(rowOfLedStrip);
                });
                // }
            }
        });
    };

    function handleResetFromServer(resetApi) {
        logger.debug({ message: `Message from server`, location: FILE_NAME, value: resetApi });
        dbLog({ level: 'DEBUG', message: `Message from server`, value: resetApi });
        const newValues = {
            $set: {
                lightColor: '000000'
            }
        }
        db.collection(BACKUP_COLLECTION).updateMany({}, newValues, (err, res) => {
            if (err) logger.error({ message: error, location: FILE_NAME });
            rgbHubSetLight('1');
            rgbHubSetLight('2');
            rgbHubSetLight('3');
            rgbHubSetLight('4');
            rgbHubSetLight('5');
        });
    };

    function handleReloadFromServer(reloadApi) {
        logger.debug({ message: `Message from server`, location: FILE_NAME, value: reloadApi });
        dbLog({ level: 'DEBUG', message: `Message from server`, value: reloadApi });
        rgbHubSetLight('1');
        rgbHubSetLight('2');
        rgbHubSetLight('3');
        rgbHubSetLight('4');
        rgbHubSetLight('5');
    }

    function handleLightTestFromServer(lightApi) {
        logger.debug({ message: `Message from server`, location: FILE_NAME, value: lightApi });
        //
    };

    function handleConfirmPutToLightFromServer(confirmApi) {
        logger.debug({ message: `Message from server`, location: FILE_NAME, value: confirmApi });
        dbLog({ level: 'DEBUG', message: `Message from server`, value: confirmApi });
        const wallName = confirmApi.params.wall;
        const querybyName = { name: wallName };
        let wallState;
        db.collection(BACKUP_COLLECTION).findOne(querybyName)
            .then(result => {
                wallState = result;
                const newBackupValues = { $set: { frontLight: false }, $push: { importTote: confirmApi.params.tote } };
                return db.collection(BACKUP_COLLECTION).updateOne(querybyName, newBackupValues)
            })
            .then(result => {
                logger.debug({ message: 'change light state in database', location: FILE_NAME, value: result });

                event.emit('light:off', {
                    wall: wallState.name,
                    location: wallState.location,
                    lightIndex: wallState.lightIndex,
                    lightColor: [0, 0, 0],
                    side: 'front'
                });
                logger.debug({ message: `Tote ${confirmApi.params.tote} put to wall ${wallName}, key: ${confirmApi.key}`, location: FILE_NAME });
            })
            .catch(err => {
                if (err) logger.error({ message: error, location: FILE_NAME });
            })

    }

    function handleConfirmPickToLightFromServer(confirmApi) {
        logger.debug({ message: `Message from server`, location: FILE_NAME, value: confirmApi });
        dbLog({ level: 'DEBUG', message: `Message from server`, value: confirmApi });

        const wallName = confirmApi.params.wall;
        const queryByName = { name: wallName };
        let wallState;
        db.collection(BACKUP_COLLECTION).findOne(queryByName)
            .then(result => {
                // logger.debug({ message: 'update to backup result', location: FILE_NAME, value: result });
                wallState = result;

                const newHistoryValues = {
                    wall: wallState.name,
                    importTote: wallState.importTote,
                    exportTote: wallState.exportTote,
                    timeComplete: new Date().toISOString()
                }
                // Insert an history event(a complete merge on wall) to database
                return db.collection(HISTORY_COLLECTION).insertOne(newHistoryValues);
            })
            .then(result => {
                // Update exportTote on wall to database
                // logger.debug({ message: 'insert to history result', location: FILE_NAME, value: result });
                event.emit('light:off', {
                    wall: wallName,
                    location: wallState.location,
                    lightIndex: wallState.lightIndex,
                    lightColor: [0, 0, 0],
                    side: 'back'
                });
                // All things done, emit an complete event
                event.emit('wall:completeOne', wallName);
            })
            .catch(err => {
                logger.error({ message: 'Fail to insert to database', location: FILE_NAME, value: err });
            });
    }

    function handleGetWallStatusFromServer(d) {
        logger.debug({ message: `Message from server`, value: d });
        return;
    };

    function handleErrorFromServer(errApi) {
        logger.debug({ message: `Message from server`, location: FILE_NAME, value: errApi });
        dbLog({ level: 'ERROR', message: 'mergeWall/error', value: errApi });
        event.emit('towerlight:set', {
            status: 'warning',
            side: 'front',
            redLight: true,
            greenLight: 'ignore'
        });

        // let flashCount = 0;
        // const flashLight = setInterval(() => {
        //     if (flashCount == 3) {
        //         clearInterval(flashLight);
        //     }
        //     event.emit('towerlight:set', {
        //         status: 'warning',
        //         side: 'front',
        //         redLight: true,
        //         greenLight: false
        //     });
        //     setTimeout(function () {
        //         event.emit('towerlight:set', {
        //             status: 'warning',
        //             side: 'back',
        //             redLight: true,
        //             greenLight: false
        //         });
        //     }, 500);
        //     flashCount++;
        // }, 1000);

        //  emit event to print error message on screen
        event.emit('lcd:print', {
            code: 101,
            message: errApi.message
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
        }, 200);

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
        }, 200);

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

    function dbLog({ level = 'INFO', message, value = null }) {
        const newLog = {
            level: level,
            message: message,
            value: value,
            dateCreated: new Date().toISOString()
        }
        db.collection(LOG_COLLECTION).insertOne(newLog)
            .then(result => {
                // logger.debug({ message: 'New log to database', location: FILE_NAME, value: result });
            })
            .catch(err => {
                if (err) logger.error({ message: err, location: FILE_NAME });
            });
    }

});
