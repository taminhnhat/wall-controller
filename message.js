/**
 * 
 */
const version = '0.0.1';
const bookstoreId = 67;

const message = {
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
        apiObj.date = Date.now();
        apiObj.key = key;
        return apiObj;
    },

    /**
     * 
     * @param {String} wall 
     * @returns object
     */
    generateButtonParams: function(buttonCoordinate){
        let buttonObj = {};
        buttonObj.button = buttonCoordinate;
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
    },

    generateWarning: function(auth, mess){
        let warningObj;
        warningObj.createdBy = auth;
        warningObj.message = mess;
        warningObj.date = Date(Date.now());
        return warningObj;
    }
}


module.exports = message;