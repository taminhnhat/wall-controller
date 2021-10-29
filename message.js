/**
 * 
 */
require('dotenv').config({ path: './.env' });
const GLOBAL = require('./CONFIGURATION');
const TOKEN = process.env.TOKEN;
const version = GLOBAL.VERSION;
const clientId = process.env.WALL_ID;
const bookstoreId = process.env.BOOKSTORE_ID;

const message = {
    /**
     * 
     * @param {*} name name of api
     * @param {*} params params of api
     * @param {*} key 
     * @returns an object
     */
    generateApi: function (name, params, key) {
        return {
            name: name,
            clientId: clientId,
            bookstoreId: bookstoreId,
            version: version,
            params: params,
            date: new Date().toISOString(),
            key: key,
            token: TOKEN
        }
    },

    /**
     * 
     * @param {String} wall 
     * @returns object
     */
    generateButtonParams: function (buttonLocation, buttonSide) {
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
    generateScannerParams: function (val) {
        return {
            wall: 'M-1',
            value: val
        };
    },

    generateWarning: function (auth, mess) {
        return {
            createdBy: auth,
            message: mess,
            date: new Date().toISOString()
        }
    }
}


module.exports = message;