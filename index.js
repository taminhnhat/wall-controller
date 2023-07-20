/**
 * Main file
 * Pi connect to server via websocket
 * Access GPIO with pigpio
 */

//  CONFIGURATION_________________________________________________________________________
require('dotenv').config({ path: './.env' });
const SERVER_URL = process.env.SERVER_URL;
const rgbHubRFEnable = process.env.RGB_HUB_RF_ENABLE;
const multiUserMode = process.env.MULTI_USER_MODE;
const toggleLedStrip = process.env.TOGGLE_LED_STRIP;

const lightMap = require('./lightMap');

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
const databaseUrl = process.env.DATABASE_URL;


//  SERIAL PORT________________________________________________________________________________
const rgbHub = require('./rgbHub');

//  LOGGER__________________________________________________________________________
const logger = require('./logger/logger');
const date = require('./timeDate');

//  NAMED PIPE____________________________________________________________________________
// IPC using named pipe, communicate between c++ side and nodejs side
const platformOS = process.platform;
if (platformOS == 'linux' || platformOS == 'darwin') {
    require('./readPipe');
} else {
    logger.warn('Platform does not support gpio-ipc');
}

//  EVENT EMITTER__________________________________________________________________________
const event = require('./event');

mongoClient.connect(databaseUrl, { useUnifiedTopology: true }, function (err, client) {
    /**
     * -----------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * -----------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * START MAIN SCOPE
     * -----------------------------------------------------------------------------------------------------------------------------------------------------------------------
     * -----------------------------------------------------------------------------------------------------------------------------------------------------------------------
     */
    if (err) logger.error({ message: 'Connection to mongo was failed', error: err });
    const db = client.db(WALL_DB);

    //  RESTORE WALL STATUS FROM BACKUP____________________________________________________________________________________________________

    logger.info({ message: `MERGEWALL GATEWAY STARTED` });

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
    db.collection(HISTORY_COLLECTION)
        .find({})
        .sort({ location: 1 })
        .toArray()
        .then(history => {
            let lastDate;
            let thisCount = 1;
            let thisTime = date('seconds');
            const [lastStartup] = history.slice(-1);

            if (lastStartup != undefined) {
                lastDate = Number(lastStartup.startOn.substring(0, 2));
                thisCount = lastStartup.count + 1;
            }
            const thisDate = Number(thisTime.substring(0, 2));

            if (lastDate != thisDate) {
                resetWallLight();
                db.collection(HISTORY_COLLECTION).insertOne({ startOn: thisTime, count: thisCount })
                    .then(result => {
                        logger.info({ message: 'Updated new startup', value: result });
                    })
                    .catch(err => {
                        if (err) logger.error({ message: err });
                    });
            }
            else {
                rgbHubLightGenerate('1');
                rgbHubLightGenerate('2');
                rgbHubLightGenerate('3');
                rgbHubLightGenerate('4');
                rgbHubLightGenerate('5');
            }
            return 'Restore from backup completed'
        })
        .then(result => {
            logger.info({ message: result });

            event.emit('rgbHub:start');

            // Handle internal event`

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

            socket.on('mergeWall/lightOn', handleLightOnFromServer);

            socket.on('mergeWall/lightOff', handleLightOffFromServer);

            socket.on('mergeWall/reset', handleResetFromServer);

            socket.on('mergeWall/reload', handleReloadFromServer);

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
        event.emit('light:set', { bitmap: frontBitmap, side: 'front' });
        setTimeout(function () {
            event.emit('light:set', { bitmap: backBitmap, side: 'back' });
        }, 500);
    }

    /**
     * Send light command to serial port
     * @param {String} rowOfLedStrip 1 to 5: row of led strip on wall
     */
    function rgbHubLightGenerate(rowOfLedStrip) {
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
            .then(bins => {
                let mess = `R${rowOfLedStrip}`;
                if (rgbHubRFEnable == 'true') mess = 'W1:' + mess;
                if (multiUserMode == 'true') {
                    mess = `T${rowOfLedStrip}:`;
                    bins.forEach((bin, binIdx) => {
                        bin.lightArray.forEach((lightColor, lightIdx) => {
                            // find colorId of input color
                            mess += lightMap.getId(lightColor);
                        })
                        mess += ':';
                    })
                }
                else {
                    bins.forEach(bin => {
                        mess = mess + ':' + bin.lightColor
                    })
                }
                mess = mess + '\r\n';
                rgbHub.write(mess);
            });
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

    function handleRgbHubFromSerialPort(data) {
        if (data == 'RGB Hub start') {
            rgbHubLightGenerate('1');
            rgbHubLightGenerate('2');
            rgbHubLightGenerate('3');
            rgbHubLightGenerate('4');
            rgbHubLightGenerate('5');
        }
    }

    function handleRgbHubOpenFromSerialPort(data) {
        logger.info({ message: data.message });
    }

    function handleRgbHubCloseFromSerialPort(data) {
        logger.warn({ message: data.message });
    }

    function handleRgbHubErrorFromSerialPort(data) {
        logger.error({ message: data.message, value: data.value });
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
        });
    };

    function handleRefreshCommand() {
        refreshWallLight();
    }

    function handleResetButton() {
        resetWallLight();
    }

    function handleConfigButton(data) {
        logger.info({ message: 'Config rgb hub!' });
        const mess = `CFG:${data.mess}\n`;
        rgbHub.write(mess);
    }

    function handleTestLightButton() {
        logger.info({ message: 'Test rgb hub' });
        rgbHub.write('R1:00ff00:00ffff:0000ff:ffff00:ff00ff:ffffff\n');
        rgbHub.write('R2:00ff00:00ffff:0000ff:ffff00:ff00ff:ffffff\n');
        rgbHub.write('R3:00ff00:00ffff:0000ff:ffff00:ff00ff:ffffff\n');
        rgbHub.write('R4:00ff00:00ffff:0000ff:ffff00:ff00ff:ffffff\n');
        rgbHub.write('R5:00ff00:00ffff:0000ff:ffff00:ff00ff:ffffff\n');
        setTimeout(() => {
            refreshWallLight();
        }, 2000);
    }

    function handleLightOnFromServer(lightApi) {
        logger.info({ message: `mergeWall/lightOn`, value: lightApi });

        const wallName = lightApi.params.wall;
        const wallSide = lightApi.params.side;
        const tempKey = lightApi.key;
        let lightColor = lightApi.params.lightColor;
        if (lightColor == undefined || lightColor == null) {
            logger.error('Invalid lightColor from server', { value: lightColor });
            return;
        }
        else lightColor = lightColor.toLowerCase();

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
                                    rgbHubLightGenerate(wallState.location.split('.')[2]);
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

                //  Check if wallName is valid
                if (!isWallNameValid) {
                    //  Log error
                    logger.error({ message: 'Not a valid message from server', value: { wallName: wallName, key: tempKey } });
                }
                else {
                    let lightArray = wallState.lightArray;
                    let newBackupValues;
                    if (lightColor == 'ffffff') {
                        // if light is white, clear other light color then set only white light
                        newBackupValues = {
                            $set: {
                                lightColor: lightColor,
                                lightArray: [lightColor]
                            }
                        };
                    }
                    else if (lightColor == 'ff0000') {
                        // if light is red, clear all light color
                        newBackupValues = {
                            $set: {
                                lightArray: []
                            }
                        }
                    }
                    else {
                        // add new light color to this bin
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
                        const rowOfLedStrip = wallState.location.split('.')[2];
                        rgbHubLightGenerate(rowOfLedStrip);
                    });
                }
            })
            .catch(err => {
                if (err) logger.error({ message: 'Light on error', error: err });
            });
    };

    function handleLightOffFromServer(lightApi) {
        logger.info({ message: `mergeWall/lightOff`, value: lightApi });

        const wallName = lightApi.params.wall;
        const wallSide = lightApi.params.side;
        const tempKey = lightApi.key;
        const lightColor = lightApi.params.lightColor;

        const queryByName = { name: wallName };
        db.collection(BACKUP_COLLECTION).findOne(queryByName, (err, res) => {
            if (err) logger.error({ message: 'Fail to find wall in database', error: err });
            const wallState = res;
            const isWallNameValid = wallState != undefined;

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
                    rgbHubLightGenerate(rowOfLedStrip);
                });
            }
        });
    };

    function handleResetFromServer(resetApi) {
        logger.info({ message: 'WS-INBOX: mergeWall/reset', value: resetApi });
        resetWallLight();
    };

    function handleReloadFromServer(reloadApi) {
        logger.info({ message: 'WS-INBOX: mergeWall/reload', value: reloadApi });
        refreshWallLight();
    }

    function handleErrorFromServer(errApi) {
        logger.info({ message: 'WS-INBOX: mergeWall/error', error: errApi });
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

    function resetWallLight() {
        const newValues = {
            $set: {
                lightColor: '000000',
                lightArray: []
            }
        }
        db.collection(BACKUP_COLLECTION).updateMany({}, newValues, (err, res) => {
            if (err) logger.error({ message: error });
            logger.info('Reset wall!');
            rgbHubLightGenerate('1');
            rgbHubLightGenerate('2');
            rgbHubLightGenerate('3');
            rgbHubLightGenerate('4');
            rgbHubLightGenerate('5');
        });
    }

    function refreshWallLight() {
        logger.info('Refresh light!');
        rgbHubLightGenerate('1');
        rgbHubLightGenerate('2');
        rgbHubLightGenerate('3');
        rgbHubLightGenerate('4');
        rgbHubLightGenerate('5');
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

    rgbHub.write('F6:00ff00\r\n');

    //  emit event to print error message on screen
    event.emit('lcd:print', {
        code: 201,
        message: 'Da ket noi SERVER!'
    });
};

function handleSocketDisconnection() {
    logger.error({ message: 'disconnected from socketServer!' });


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

    rgbHub.write('F6:ff0000\r\n');

    //  emit event to print error message on screen
    event.emit('lcd:print', {
        code: 203,
        message: 'Loi ket noi SERVER'
    });
};
