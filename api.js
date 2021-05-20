/**
 * 
 */
const version = '0.0.1';
const bookstoreId = 67;

const api = {
    /**
     * 
     * @param {*} name name of api
     * @param {*} clientId id of client sending
     * @param {*} params params of api
     * @returns an object
     */
    generateApi: function(name, clientId, params, key){
        let apiObj = {};
        apiObj.name = name;
        apiObj.clientId = clientId;
        apiObj.bookstoreId = bookstoreId;
        apiObj.version = version;
        apiObj.params = params;
        apiObj.key = key;
        return apiObj;
    },

    /**
     * 
     * @param {String} wall 
     * @returns object
     */
    generateButtonParams: function(wall){
        let buttonObj = {};
        buttonObj.wall = wall;
        return buttonObj;
    },

    /**
     * 
     * @param {*} type type of wall
     * @param {*} val value from scanner
     * @returns object
     */
    generateScannerParams: function(val){
        let scanObj = {};
        scanObj.fromColumn = 1;
        scanObj.toColumn = 6;
        scanObj.val = val;
        return scanObj;
    }
}


module.exports = api;