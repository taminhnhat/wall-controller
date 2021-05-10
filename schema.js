const historySchema = function(importTote, exportTote, name, key){
    const wallObj = {};
    wallObj.name = name
    wallObj.import = importTote
    wallObj.export = exportTote
    wallObj.key = key
    wallObj.date = Date(Date.now())
    return wallObj
}

const backupSchema = function(importTote, exportTote, name, key, frontLight, backLight, frozen, complete){
    const wallObj = {};
    wallObj.name = name;
    wallObj.importTote = importTote;
    wallObj.exportTote = exportTote;
    wallObj.frontLight = frontLight;
    wallObj.backLight = backLight;
    wallObj.frozen = frozen;
    wallObj.complete = complete;
    wallObj.key = key;
    wallObj.date = Date(Date.now());
    return wallObj;
}

const lightSchema = function(name, side, state, key){
    const lightObj = {};
    lightObj.name = name;
    lightObj.side = side;
    lightObj.state = state;
    lightObj.key = key;
    lightObj.date = Date(Date.now());
    return lightObj;
}

module.exports = {historySchema, backupSchema, lightSchema}