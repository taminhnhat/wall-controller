/**
 * Reset wall state (all light set to "000000") on everyday first startup
 */
const fs = require('fs');
const logger = require('./logger/logger');

const filePath = './.tmp'

// fs.open(filePath, 'w', err => {
//     if (err) logger.error('Cannot open .tmp file', { error: err })
// })
let para = fs.readFileSync(filePath)
let ob = JSON.parse(para.toString())
console.log(ob)
// try {
// }
// catch (err) {
//     if (err) logger.error('Cannot open .tmp file', { error: err })
// }