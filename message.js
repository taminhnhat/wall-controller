/**
 * 
 */
const version = '0.0.1';

const message = {
    /**
     * 
     * @param {*} name name of api
     * @param {*} clientId id of client sending
     * @param {*} params params of api
     * @returns an object
     */
    generateApi: function(name, clientId, bookstoreId, params, key){
        return {
            name: name,
            clientId: clientId,
            bookstoreId: bookstoreId,
            version: version,
            params: params,
            date: Date.now(),
            key: key
        }
    },

    /**
     * 
     * @param {String} wall 
     * @returns object
     */
    generateButtonParams: function(buttonPosition){
        return {button: buttonPosition};
    },

    /**
     * 
     * @param {*} type type of wall
     * @param {*} val value from scanner
     * @returns object
     */
    generateScannerParams: function(val){
        return {wall: 'M-1', value: val};
    },

    generateWarning: function(auth, mess){
        return {
            createdBy: auth,
            message: mess,
            date: Date(Date.now())
        }
    }
}


module.exports = message;