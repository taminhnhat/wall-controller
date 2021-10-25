const historySchema = function (importTote, exportTote, name) {
    return {
        wall: name,
        importTotes: importTote,
        exportTote: exportTote,
        timeComplete: Date(Date.now())
    }
}

const backupSchema = function (importTote, exportTote, key, frontLight, backLight) {
    const wallObj = {};
    wallObj.importTote = importTote;
    wallObj.exportTote = exportTote;
    wallObj.frontLight = frontLight;
    wallObj.backLight = backLight;
    wallObj.key = key;
    wallObj.date = Date(Date.now());
    return wallObj;
}

const lightSchema = function (name, side, state, key) {
    const lightObj = {};
    lightObj.name = name;
    lightObj.side = side;
    lightObj.state = state;
    lightObj.key = key;
    lightObj.dateComplete = Date(Date.now());
    return lightObj;
}

module.exports = { historySchema, backupSchema, lightSchema }