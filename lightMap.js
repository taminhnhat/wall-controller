const logger = require('./logger/logger')
const lightList = [
    { color: '000000', colorId: '0' },
    { color: '00ff00', colorId: '1' },
    { color: '0000ff', colorId: '2' },
    { color: 'ffff00', colorId: '3' },
    { color: 'ff00ff', colorId: '4' },
    { color: '00ffff', colorId: '5' },
    { color: 'ff0000', colorId: '6' },
    { color: 'ffffff', colorId: '7' }
];

function getId(lightColor) {
    const tmp = lightList.find(ob => {
        return ob.color == lightColor
    })
    if (tmp != undefined) {
        return tmp.colorId;
    }
    else {
        logger.warn({
            message: 'Light color not found', value: {
                lightColor: lightColor,
                lightList: list()
            }
        });
        return '';
    }
}

function list() {
    return lightList.map(ob => { return ob.color })
}

module.exports = { getId, list }