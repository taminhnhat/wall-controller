/**
 * 
 */

require('dotenv').config({path: './CONFIGURATIONS.env'});

const version = process.env.VERSION;
const clientId = process.env.WALL_ID;
const bookstoreId = process.env.BOOKSTORE_ID;

const message = {
    /**
     * 
     * @param {*} name name of api
     * @param {*} clientId id of client sending
     * @param {*} params params of api
     * @returns an object
     */
    generateApi: function(name, params, key){
        return {
            name: name,
            clientId: clientId,
            bookstoreId: bookstoreId,
            version: version,
            params: params,
            date: Date(Date.now()),
            key: key
        }
    },

    /**
     * 
     * @param {String} wall 
     * @returns object
     */
    generateButtonParams: function(buttonLocation, buttonSide){
        return {
            button: buttonLocation,
            side: buttonSide
        };
    },

    /**
     * 
     * @param {*} type type of wall
     * @param {*} val value from scanner
     * @returns object
     */
    generateScannerParams: function(val){
        return {
            wall: 'M-1',
            value: val
        };
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