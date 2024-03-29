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
const rgbHubRFEnable = process.env.RGB_HUB_RF_ENABLE;
const multiUserMode = process.env.MULTI_USER_MODE;
const toggleLedStrip = process.env.TOGGLE_LED_STRIP;
const lightList = [{ color: '000000', index: 0 },
{ color: '00ff00', index: 1 },
{ color: '0000ff', index: 2 },
{ color: 'ffff00', index: 3 },
{ color: 'ff00ff', index: 4 },
{ color: '00ffff', index: 5 },
{ color: 'ff0000', index: 6 },
{ color: 'ffffff', index: 7 }];
//  db and collections name
const WALL_DB = process.env.DB_NAME;
const BACKUP_COLLECTION = 'backup';
const HISTORY_COLLECTION = 'history';
const LOG_COLLECTION = 'log';
const FILE_NAME = 'index.js   ';

//  WEB SOCKET____________________________________________________________________________
const io = require('socket.io-client');
const socket = io.connect(SERVER_URL);

socket.on('connect', handleSocketConnection);

socket.on('disconnect', handleSocketDisconnection);

socket.io.on('error', handleSocketError);


//  MONGODB_______________________________________________________________________________
const mongoClient = require('mongodb').MongoClient;
const url = GLOBAL.MONGO_DB_URL;


//  SERIAL PORT________________________________________________________________________________
require('./serial');

//  NAMED PIPE____________________________________________________________________________
// IPC using named pipe, communicate between c++ side and nodejs side
require('./readPipe');
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
const { FILE } = require('dns');
const { eventNames } = require('process');
const { error } = require('console');
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
    if (err) logger.error({ message: 'mongo error', error: err });
    const db = client.db(WALL_DB);

    //  RESTORE WALL STATUS FROM BACKUP____________________________________________________________________________________________________
    let isRestoredWallDone = false;

    logger.info({ message: `=========== MERGEWALL GATEWAY STARTED ===========` });
    //  Run main process

    const projection = {
        projection: {
            _id: 0,
            name: 1,
            location: 1,
            lightColor: 1,
            lightArray: 1,
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
            rgbHubSetLight('1');
            rgbHubSetLight('2');
            rgbHubSetLight('3');
            rgbHubSetLight('4');
            rgbHubSetLight('5');
            return 'Restore from backup completed'
            // restoreLight();
            // return new Promise((resolve, reject) => {
            //     if (isRestoredWallDone) resolve('Restore from backup completed');
            //     else reject('Fail to restore from backup!');
            // });
        })
        .then(result => {
            logger.info({ message: result });

            event.emit('rgbHub:start');

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

            event.on('command:lightOn', handleLightOnFromServer);

            event.on('command:lightOff', handleLightOffFromServer);

            event.on('command:refresh', handleRefreshCommand);

            event.on('command:reset', handleResetButton);

            event.on('command:configRgbHub', handleConfigButton);

            event.on('command:testLight', handleTestLightButton);

            //  Handle event from websocket
            // socket.on('confirmWall', handleConfirmFromServer);

            socket.on('mergeWall/lightOn', handleLightOnFromServer);

            socket.on('mergeWall/lightOff', handleLightOffFromServer);

            socket.on('mergeWall/reset', handleResetFromServer);

            socket.on('mergeWall/reload', handleReloadFromServer);

            // socket.on('mergeWall/lightTest', handleLightTestFromServer);

            // socket.on('mergeWall/confirmPutToLight', handleConfirmPutToLightFromServer);

            // socket.on('mergeWall/confirmPickToLight', handleConfirmPickToLightFromServer);

            // socket.on('mergeWall/getWallStatus', handleGetWallStatusFromServer);

            socket.on('mergeWall/error', handleErrorFromServer);
        })
        .catch(error => logger.error({ message: error }));
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
     * Send light command to serial port
     * @param {String} rowOfLedStrip 1 to 5: row of led strip on wall
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
                lightArray: 1
            }
        };
        let sortDirection = 1;
        if (toggleLedStrip == 'true') sortDirection = -1;

        db.collection(BACKUP_COLLECTION)
            .find({ row: rowOfLedStrip }, rgbProjection)
            .sort({ col: sortDirection })
            .toArray()
            .then(result => {
                let mess = `R${rowOfLedStrip}`;
                if (rgbHubRFEnable == 'true') mess = 'W1:' + mess;
                if (multiUserMode == 'true') {
                    mess = `T${rowOfLedStrip}`;
                    for (col = 0; col < result.length; col++) {
                        mess = mess + ':';
                        result[col].lightArray.forEach(element => {
                            getLightIndexOf(element);
                            function getLightIndexOf(ele) {
                                lightList.forEach(light => {
                                    if (light.color == ele) {
                                        mess = mess + light.index;
                                    }
                                })
                            }
                        });
                    }
                    mess = mess + ':';
                }
                else {
                    for (col = 0; col < result.length; col++) {
                        mess = mess + ':' + result[col].lightColor;
                    }
                }
                mess = mess + '\n';
                event.emit('rgbHub:emit', { message: mess });
            });
    }

    function rgbHubSetFullRowEffect(rowOfLedStrip, lightColor) {
        const mess = `F${rowOfLedStrip}:${lightColor}\n`;
        if (rgbHubRFEnable == 'true') mess = 'W1:' + mess;
        event.emit('rgbHub:emit', { message: mess });
    }

    function rgbHubGetInfo() {
        const mess = 'GETINFO\n';
        if (rgbHubRFEnable == 'true') mess = 'W1:' + mess;
        event.emit('rgbHub:emit', { message: mess });
    }

    function rgbHubConfig(leds, cols, nodes) {
        const mess = `CFG:T${leds}.C${cols}.N${nodes}`;
        if (rgbHubRFEnable == 'true') mess = 'W1:' + mess;
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
            .catch(error => logger.error({ message: 'Error restore GPIO', error: error }));
    }

    function cancelAction() {
        socket.emit('mergeWall/cancelPuttoLight', message.generateApi('mergeWall/cancelPuttoLight', { wallIndex: WALL_INDEX, tote: importToteNow }, frontScanKey));
        //  Clear data from scanners
        importToteNow = null;
        //  Reset front lights
        db.collection(BACKUP_COLLECTION).updateMany({ frontLight: true }, { $set: { frontLight: false } }, (err, res) => {
            if (err) logger.error({ message: 'Fail to update database', error: err });
            else logger.info({ message: 'Reset front light', value: res });
            restoreLightFromDatabase();
        });
    }

    /**
     * Handle 'button:front' event from gpio
     * Emitted in 'gpio-ipc.js'
     */
    function handleFrontButtonFromGPIO(buttonParams) {
        logger.info({ message: 'button:front', value: buttonParams });
        dbLog({ level: 'DEBUG', message: 'button:front', value: buttonParams });
        const buttonLocation = buttonParams.button;

        // create query by wall location to access database
        const queryByLocation = { location: buttonLocation };
        const backupCollection = db.collection(BACKUP_COLLECTION);
        //  Get wall state from db
        backupCollection.findOne(queryByLocation, (err, res) => {
            if (err) logger.error({ message: 'mongodb error', error: err });
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
                logger.info({ message: 'Front button pressed, not valid button!!!' });
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
        logger.info({ message: 'button:back', value: buttonParams });
        dbLog({ level: 'DEBUG', message: 'button:back', value: buttonParams });
        const buttonLocation = buttonParams.button;

        // create query by wall location to access database
        const queryByLocation = { location: buttonLocation };

        //  Get wall state from db
        db.collection(BACKUP_COLLECTION).findOne(queryByLocation, (err, res) => {
            if (err) logger.error({ message: 'mongodb error', error: err });
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
                    if (err) logger.error({ message: 'Fail to insert to database', error: err });
                    const params = {
                        wall: wallName,
                        importTote: wallState.importTote,
                        exportTote: exportToteNow
                    };
                    const tempApi = message.generateApi('mergeWall/pickToLight', params, backScanKey);
                    logger.info({ message: `Wall ${wallName} pick to tote ${exportToteNow}, key: ${tempApi.key}` });
                    exportToteNow = null;
                    dbLog({ level: 'DEBUG', message: 'Pick to light', value: params });
                    socket.emit('mergeWall/pickToLight', tempApi);
                });

            } else {
                if (exportToteNow == null) {
                    logger.warn({ message: 'Back button pressed, scan tote first!!!' });
                    dbLog({ level: 'WARNING', message: 'Back button pressed, No tote was scanned!' });
                }
                else {
                    logger.warn({ message: 'Back button pressed, not valid button!!!' });
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
        logger.info({ message: 'button:user event', value: buttonParams });
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
                logger.warn({ message: `Bad params for 'button:user' event` });
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
                if (err) logger.error({ message: error });
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
                if (err) logger.error({ message: error });
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

        importToteNow = null;
        //  Reset front lights
        db.collection(BACKUP_COLLECTION).updateMany({ frontLight: true }, { $set: { frontLight: false } }, (err, res) => {
            if (err) logger.error({ message: 'Fail to update database', error: err });
            else logger.info({ message: 'Reset front light', value: res });
            restoreLightFromDatabase();
            frontScanKey = generateKey(3);

            //  Check if scanned tote a valid value
            if (isScannedToteValid(scanParams.value)) {
                const scanApi = message.generateApi('mergeWall/scanTotePutToLight', { wallIndex: WALL_INDEX, tote: scanParams.value }, frontScanKey);
                //
                socket.emit('mergeWall/scanTotePutToLight', scanApi);
                logger.info({ message: `Send 'mergeWall/scanTotePutToLight' message to server`, value: scanApi });

                importToteNow = scanParams.value;
                logger.info({ message: `Import tote: ${importToteNow}` });
            }
            //  If scanned tote not a valid value
            else {
                logger.warn({ message: `Unknown import tote: ${scanParams.value}` });
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

            logger.info({ message: `Export tote: ${exportToteNow}` });
        } else {
            logger.info({ message: `Unknown export tote:${scanParams.value}` });
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
        logger.info({ message: data.message });
        dbLog({ level: 'DEBUG', message: data.message });
    };

    function handleScannerCloseFromSerialPort(data) {
        logger.warn({ message: data.message });
        dbLog({ level: 'WARNING', message: data.message });
    };

    function handleScannerErrorFromSerialPort(data) {
        logger.error({ message: data.message, value: data.value });
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
        // logger.info({ message: data.message, value: data.value  });
        // dbLog({ level: 'DEBUG', message: data.message, value: data.value });
    }

    function handleRgbHubOpenFromSerialPort(data) {
        logger.info({ message: data.message });
        dbLog({ level: 'DEBUG', message: data.message });
    }

    function handleRgbHubCloseFromSerialPort(data) {
        logger.warn({ message: data.message });
        dbLog({ level: 'WARNING', message: data.message });
    }

    function handleRgbHubErrorFromSerialPort(data) {
        logger.error({ message: data.message, value: data.value });
        dbLog({ level: 'ERROR', message: data.message, value: data.value });
    }

    /**
     * Handle 'wall:completeOne' event
     * Emitted in 'index.js' when a merge completed on wall
     */
    function handleCompleteEvent(wallName) {
        // create query by wall name to access database
        logger.info({ message: 'wall complete!!!' });
        const queryByName = { name: wallName };
        const newBackupValues = {
            importTote: [],
            exportTote: null,
            lightColor: '000000',
            backLight: false,
            completed: false
        };

        db.collection(BACKUP_COLLECTION).updateOne(queryByName, { $set: newBackupValues }, function (err, res) {
            if (err) logger.error({ message: 'Fail to update database', error: err });
            logger.info({ message: `Empty wall ${wallName}` });
            dbLog({ level: 'DEBUG', message: `Empty wall ${wallName}` });
        });
    };

    function handleRefreshCommand() {
        logger.info({ message: 'Refresh wall!' });
        dbLog({ level: 'DEBUG', message: 'Refresh wall' });
        refreshWallLight();
    }

    function handleResetButton() {
        logger.info({ message: 'Reset wall!' });
        dbLog({ level: 'DEBUG', message: 'Reset wall' });
        resetWallLight();
    }

    function handleConfigButton(data) {
        logger.info({ message: 'Config rgb hub!' });
        const mess = `CFG:${data.mess}\n`;
        event.emit('rgbHub:emit', { message: mess });
    }

    function handleTestLightButton() {
        logger.info({ message: 'Test rgb hub' });
        event.emit('rgbHub:emit', { message: 'R1:00ff00:00ffff:0000ff:ffff00:ff00ff:ffffff\n' });
        event.emit('rgbHub:emit', { message: 'R2:00ff00:00ffff:0000ff:ffff00:ff00ff:ffffff\n' });
        event.emit('rgbHub:emit', { message: 'R3:00ff00:00ffff:0000ff:ffff00:ff00ff:ffffff\n' });
        event.emit('rgbHub:emit', { message: 'R4:00ff00:00ffff:0000ff:ffff00:ff00ff:ffffff\n' });
        event.emit('rgbHub:emit', { message: 'R5:00ff00:00ffff:0000ff:ffff00:ff00ff:ffffff\n' });
        setTimeout(() => {
            refreshWallLight();
        }, 2000);
    }

    // function handleConfirmFromServer(confirmApi) {
    //     const confirmKey = confirmApi.key;
    //     const confirmDate = confirmApi.date;
    //     logger.info({ message: 'Confirm from server' , value: { key: confirmKey } });

    //     //  Find pennding message match the key then clear interval and remove it from pendingMessage array
    //     for (let i = 0; i < pendingMessages.length; i++) {
    //         if (pendingMessages[i].key === confirmKey) {
    //             clearInterval(pendingMessages[i].interval);
    //             pendingMessages.splice(i, 1);
    //             logger.info({ pendingMessages  });
    //         }
    //     }
    // };

    // function handleLightOnFromServer(lightApi) {
    //     logger.info({ message: `Message from server` , value: lightApi });
    //     dbLog({ level: 'DEBUG', message: `Message from server`, value: lightApi });

    //     //  Get wall state from db
    //     const wallName = lightApi.params.wall;
    //     const wallSide = lightApi.params.side;
    //     const tempKey = lightApi.key;
    //     let lightColor = 'FFFFFF';
    //     if (lightApi.params.lightColor != undefined) {
    //         lightColor = lightApi.params.lightColor;
    //     }
    //     const queryByName = { name: wallName };
    //     db.collection(BACKUP_COLLECTION).findOne(queryByName, (err, res) => {
    //         if (err) logger.error({ message: 'Fail to find wall in database' ,  error: err });
    //         const wallState = res;
    //         const isWallNameValid = wallState != undefined;
    //         const isWallSideValid = wallSide === 'front' || wallSide === 'back';

    //         //  Check if wallName is valid
    //         if (!isWallNameValid) {
    //             //  Log error
    //             logger.error({ message: 'Not a valid message from server', value: { key: tempKey } });
    //         } else if (!isWallSideValid) {
    //             //  Log error
    //             logger.error({ message: 'Not a valid message from server', value: { key: tempKey } });
    //         } else {
    //             //  Emit light:on event to execute in ioControl.js

    //             //  Update states to database
    //             let newBackupValues = "";

    //             if (wallSide === 'front') {
    //                 newBackupValues = { $set: { frontLight: true, lightColor: lightColor, importTime: Date.now() } };
    //             } else if (wallSide === 'back') {
    //                 newBackupValues = { $set: { backLight: true, lightColor: lightColor, exportTime: Date.now() } };
    //             }

    //             db.collection(BACKUP_COLLECTION).updateOne(queryByName, newBackupValues, (err, res) => {
    //                 if (err) logger.error({ message: error  });
    //                 event.emit('light:on', {
    //                     wall: wallState.name,
    //                     location: wallState.location,
    //                     lightIndex: wallState.lightIndex,
    //                     lightColor: lightColor,
    //                     side: wallSide
    //                 });
    //                 const rowOfLedStrip = wallState.location.split('.')[2];
    //                 rgbHubSetLight(rowOfLedStrip);
    //             });
    //         }
    //     });

    // };

    // function handleLightOffFromServer(lightApi) {
    //     logger.info({ message: `Message from server` , value: lightApi });


    //     //  Get wall state from db
    //     const wallName = lightApi.params.wall;
    //     const wallSide = lightApi.params.side;
    //     const tempKey = lightApi.key;
    //     const queryByName = { name: wallName };
    //     db.collection(BACKUP_COLLECTION).findOne(queryByName, (err, res) => {
    //         if (err) logger.error({ message: 'Fail to find wall in database' ,  error: err });
    //         const wallState = res;
    //         const isWallNameValid = wallState != undefined;
    //         const isWallSideValid = wallSide === 'front' || wallSide === 'back';

    //         //  Check if wallName is valid
    //         if (!isWallNameValid) {
    //             //  Log error
    //             logger.error({ message: 'Not a valid message from server', value: { key: tempKey } });
    //         } else if (!isWallSideValid) {
    //             //  Log error
    //             logger.error({ message: 'Not a valid message from server', value: { key: tempKey } });
    //         } else {
    //             // if (wallSide === 'front') {
    //             //     const newBackupValues = {
    //             //         $set: {
    //             //             lightColor: '000000',
    //             //             frontLight: false,

    //             //         },
    //             //         $push: {
    //             //             importDuration: {
    //             //                 start: '$importTime',
    //             //                 end: Date.now(),
    //             //                 duration: { $concatArrays: [] }
    //             //             }
    //             //         }
    //             //     }
    //             // } else if (wallSide === 'back') {
    //             // create query by wall name to access database
    //             logger.info({ message: 'wall complete!!!'  })
    //             const newBackupValues = {
    //                 importTote: [],
    //                 exportTote: null,
    //                 lightColor: '000000',
    //                 backLight: false,
    //                 completed: false
    //             };

    //             db.collection(BACKUP_COLLECTION).updateOne(queryByName, { $set: newBackupValues }, function (err, res) {
    //                 if (err) logger.error({ message: 'Fail to update database',  error: err  });
    //                 logger.info({ message: `Empty wall ${wallName}`  });
    //                 dbLog({ level: 'DEBUG', message: `Empty wall ${wallName}` });
    //                 event.emit('light:off', {
    //                     wall: wallState.name,
    //                     location: wallState.location,
    //                     lightIndex: wallState.lightIndex,
    //                     lightColor: '000000',
    //                     side: wallSide
    //                 });
    //                 const rowOfLedStrip = wallState.location.split('.')[2];
    //                 rgbHubSetLight(rowOfLedStrip);
    //             });
    //             // }
    //         }
    //     });
    // };

    function handleLightOnFromServer(lightApi) {
        logger.info({ message: `mergeWall/lightOn`, value: lightApi });
        dbLog({ level: 'DEBUG', message: `Message from server`, value: lightApi });

        const wallName = lightApi.params.wall;
        const wallSide = lightApi.params.side;
        const tempKey = lightApi.key;
        const lightColor = lightApi.params.lightColor;

        const queryByName = { name: wallName };
        // Remove this light color on all bins
        db.collection(BACKUP_COLLECTION).find({}, projection)
            .sort({ location: 1 })
            .toArray()
            .then(res => {
                if (err) logger.error({ message: 'Fail to find wall in database', error: err });
                if (lightColor != 'ffffff') {
                    res.forEach(wallState => {
                        let lightArray = wallState.lightArray;
                        for (let i = 0; i < lightArray.length; i++) {
                            if (lightArray[i] === lightColor) {
                                lightArray.splice(i, 1);
                                db.collection(BACKUP_COLLECTION).updateOne({ name: wallState.name }, { $set: { lightArray: lightArray } }, (err, res) => {
                                    rgbHubSetLight(wallState.location.split('.')[2]);
                                });
                            }
                        }
                    });
                }
                // Update light color to input bin
                return db.collection(BACKUP_COLLECTION).findOne(queryByName);
            })
            .then(res => {
                if (err) logger.error({ message: 'Fail to find wall in database', error: err });
                const wallState = res;
                const isWallNameValid = wallState != undefined;
                const isWallSideValid = wallSide === 'front' || wallSide === 'back';

                //  Check if wallName is valid
                if (!isWallNameValid) {
                    //  Log error
                    logger.error({ message: 'Not a valid message from server', value: { wallName: wallName, key: tempKey } });
                }
                else {
                    let lightArray = wallState.lightArray;
                    let newBackupValues;
                    if (lightColor == 'ffffff') {
                        newBackupValues = {
                            $set: {
                                lightColor: lightColor,
                                lightArray: [lightColor]
                            }
                        };
                    }
                    else if (lightColor == 'ff0000') {
                        newBackupValues = {
                            $set: {
                                lightArray: []
                            }
                        }
                    }
                    else {
                        if (wallState.lightArray.includes(lightColor) === false) {
                            lightArray.push(lightColor);
                        }
                        const indexOfWhiteLight = wallState.lightArray.indexOf('ffffff');
                        if (indexOfWhiteLight != -1) {
                            lightArray.splice(indexOfWhiteLight, 1);
                        }
                        //  Update states to database
                        newBackupValues = {
                            $set: {
                                lightColor: lightColor,
                                lightArray: lightArray
                            }
                        };
                    }

                    db.collection(BACKUP_COLLECTION).updateOne(queryByName, newBackupValues, (err, res) => {
                        if (err) logger.error({ message: err });
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
            })
            .catch(err => {
                if (err) logger.error({ message: 'Light on error', error: err });
            });
    };

    function handleLightOffFromServer(lightApi) {
        logger.info({ message: `mergeWall/lightOff`, value: lightApi });
        dbLog({ level: 'DEBUG', message: `Message from server`, value: lightApi });

        const wallName = lightApi.params.wall;
        const wallSide = lightApi.params.side;
        const tempKey = lightApi.key;
        const lightColor = lightApi.params.lightColor;

        const queryByName = { name: wallName };
        db.collection(BACKUP_COLLECTION).findOne(queryByName, (err, res) => {
            if (err) logger.error({ message: 'Fail to find wall in database', error: err });
            const wallState = res;
            const isWallNameValid = wallState != undefined;
            const isWallSideValid = wallSide === 'front' || wallSide === 'back';

            //  Check if wallName is valid
            if (!isWallNameValid) {
                //  Log error
                logger.error({ message: 'Not a valid message from server', value: { wallName: wallName, key: tempKey } });
            }
            else {
                let lightArray = wallState.lightArray;
                for (let i = 0; i < lightArray.length; i++) {
                    if (lightArray[i] === lightColor) {
                        lightArray.splice(i, 1);
                    }
                }
                //  Update states to database
                const newBackupValues = {
                    $set: {
                        lightColor: lightColor,
                        lightArray: lightArray
                    }
                };

                db.collection(BACKUP_COLLECTION).updateOne(queryByName, newBackupValues, (err, res) => {
                    if (err) logger.error({ message: error });
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
            }
        });
    };

    function handleResetFromServer(resetApi) {
        logger.info({ message: `Message from server`, value: resetApi });
        dbLog({ level: 'DEBUG', message: `Message from server`, value: resetApi });
        resetWallLight();
    };

    function handleReloadFromServer(reloadApi) {
        logger.info({ message: `Message from server`, value: reloadApi });
        dbLog({ level: 'DEBUG', message: `Message from server`, value: reloadApi });
        refreshWallLight();
    }

    function handleLightTestFromServer(lightApi) {
        logger.info({ message: `Message from server`, value: lightApi });
        //
    };

    function handleConfirmPutToLightFromServer(confirmApi) {
        logger.info({ message: `Message from server`, value: confirmApi });
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
                logger.info({ message: 'change light state in database', value: result });

                event.emit('light:off', {
                    wall: wallState.name,
                    location: wallState.location,
                    lightIndex: wallState.lightIndex,
                    lightColor: [0, 0, 0],
                    side: 'front'
                });
                logger.info({ message: `Tote ${confirmApi.params.tote} put to wall ${wallName}, key: ${confirmApi.key}` });
            })
            .catch(err => {
                if (err) logger.error({ message: error });
            })

    }

    function handleConfirmPickToLightFromServer(confirmApi) {
        logger.info({ message: `Message from server`, value: confirmApi });
        dbLog({ level: 'DEBUG', message: `Message from server`, value: confirmApi });

        const wallName = confirmApi.params.wall;
        const queryByName = { name: wallName };
        let wallState;
        db.collection(BACKUP_COLLECTION).findOne(queryByName)
            .then(result => {
                // logger.info({ message: 'update to backup result' , value: result });
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
                // logger.info({ message: 'insert to history result' , value: result });
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
                logger.error({ message: 'Fail to insert to database', error: err });
            });
    }

    function handleGetWallStatusFromServer(d) {
        logger.info({ message: `Message from server`, value: d });
        db.collection(BACKUP_COLLECTION).find({})
            .then(res => {
                return res;
            })
            .catch(err => {
                logger.error({ message: 'Fail to find in database', error: err });
                return 'Not found';
            })
    };

    function handleErrorFromServer(errApi) {
        logger.info({ message: `Message from server`, error: errApi });
        dbLog({ level: 'ERROR', message: 'mergeWall/error', error: errApi });
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

    function dbLog({ level = 'INFO', message, value = null }) {
        const newLog = {
            level: level,
            message: message,
            value: value,
            dateCreated: new Date().toISOString()
        }
        db.collection(LOG_COLLECTION).insertOne(newLog)
            .then(result => {
                // logger.info({ message: 'New log to database' , value: result });
            })
            .catch(err => {
                if (err) logger.error({ message: err });
            });
    }

    function resetWallLight() {
        const newValues = {
            $set: {
                lightColor: '000000',
                lightArray: []
            }
        }
        db.collection(BACKUP_COLLECTION).updateMany({}, newValues, (err, res) => {
            if (err) logger.error({ message: error });
            rgbHubSetLight('1');
            rgbHubSetLight('2');
            rgbHubSetLight('3');
            rgbHubSetLight('4');
            rgbHubSetLight('5');
        });
    }

    function refreshWallLight() {
        rgbHubSetLight('1');
        rgbHubSetLight('2');
        rgbHubSetLight('3');
        rgbHubSetLight('4');
        rgbHubSetLight('5');
    }
});

function handleSocketConnection() {
    logger.info({ message: `Connected to web socket Server ${socket.id}` });

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

function handleSocketError(err) {
    logger.error({ message: 'socket error', error: err });


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
        code: 203,
        message: 'Loi ket noi SERVER'
    });
};
