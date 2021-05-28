/**
 * Create wall object
 * 
 */
class wallState{
    #name;
    #map;
    #complete;
    #locked;
    #log;
    #key;
    #importTote;
    #exportTote;
    #frontLight;
    #backLight;
    #row;
    #col;
    #bitIndex;

    /**
     * 
     * @param {String} map {'W-1-1'}
     * @param {String} name {'M-1-1'}
     */
    constructor(map, name){
        this.#name = name;
        this.#map = map;
        this.#importTote = [];
        this.#exportTote = null;
        this.#complete = false;
        this.#locked = false;
        this.#key = null;
        this.#frontLight = false;
        this.#backLight = false;
        let temp = map.split('.');
        this.#col = temp[1];
        this.#row = temp[2];
        this.#log = 'null';
        this.#bitIndex = Number(this.#col) + (Number(this.#row) - 1)*6 - 1;
    }
    /**
     * Create a log object that save 1 complete action on wall include: wall name, import totes, export tote, key. Return private #log property
     */
    combine(){
        let temp = new Object;
        temp.wall = this.#name;
        temp.importTote = this.#importTote;
        temp.exportTote = this.#exportTote;
        temp.key = this.#key;
        this.#log = temp;
    }
    

    /**
     * Turn on light on 1 side of wall
     * @param {String} side {'front', 'back'}
     * @returns 
     */
    lightOn(wallSide){
        if(this.#locked) return 'this wall locked';
        if(wallSide == 'front'){
            this.#frontLight = true;
        }
        else if (wallSide == 'back'){
            this.#backLight = true;
        }
        return 'light on completed';
    }

    /**
     * Turn off light on 1 side of wall
     * @param {*} side side of wall
     * @returns 
     */
    lightOff(wallSide){
        if(this.#locked) return 'this wall locked';
        if(wallSide == 'front'){
            this.#frontLight = false;
        }
        else if (wallSide == 'back'){
            this.#backLight = false;
        }
        return 'light off completed';
    }

    /**
     * Add import tote to wall
     * @param {String} tote import tote
     * @returns 
     */
    import(tote){
        if(this.#locked) return 'this wall locked';
        this.#importTote.push(tote);
        return 'import tote completed';
    }

    /**
     * Add export tote to wall
     * @param {String} tote export tote
     * @returns
     */
    export(tote){
        if(this.#locked) return 'this wall locked';
        this.#exportTote = tote;
        this.#complete = true;
        return 'export tote completed';
    }

    /**
     * Add key to wall
     * @param {Number} key 
     * @returns 
     */
    addKey(key){
        this.#key = key;
        return 1;
    }

    /**
     * Clear wall data
     * @returns 
     */
    clear(){
        this.#importTote = [];
        this.#exportTote = null;
        this.#key = null;
        this.#complete = false;
        return 'clear completed';
    }

    /**
     * Log wall history {import totes, export tote, wall name, key, time}
     * @returns {String} log
     */
    log(){
        this.combine();
        return this.#log;
    }

    /**
     * 
     * @returns 
     */
    getLock(){
        return this.#locked;
    }

    /**
     * 
     * @returns 
     */
    lock(){
        this.#locked = true;
        return this.#locked;
    }

    /**
     * 
     * @returns 
     */
    unlock(){
        this.#locked = false;
        return this.#locked;
    }

    /**
     * 
     * @returns name of wall object
     */
    getName(){
        return this.#name;
    }

    getCoordinate(){
        return this.#map;
    }

    getInfo(){
        return {name:this.#name,
                map: this.#map,
                col: this.#col,
                row: this.#row,
                importTote: this.#importTote,
                exportTote: this.#exportTote,
                frontLight: this.#frontLight,
                backLight: this.#backLight,
                bitIndex: this.#bitIndex,
                lastLog: this.#log
            }
    }

    getIndex(){
        return this.#bitIndex;
    }
}

//
let M11 = new wallState('W.1.1', 'M-1-1');
let M12 = new wallState('W.1.2', 'M-1-7');
let M13 = new wallState('W.1.3', 'M-1-13');
let M14 = new wallState('W.1.4', 'M-1-19');
let M15 = new wallState('W.1.5', 'M-1-25');
//
let M21 = new wallState('W.2.1', 'M-1-2');
let M22 = new wallState('W.2.2', 'M-1-8');
let M23 = new wallState('W.2.3', 'M-1-14');
let M24 = new wallState('W.2.4', 'M-1-20');
let M25 = new wallState('W.2.5', 'M-1-26');
//
let M31 = new wallState('W.3.1', 'M-1-3');
let M32 = new wallState('W.3.2', 'M-1-9');
let M33 = new wallState('W.3.3', 'M-1-15');
let M34 = new wallState('W.3.4', 'M-1-21');
let M35 = new wallState('W.3.5', 'M-1-27');
//
let M41 = new wallState('W.4.1', 'M-1-4');
let M42 = new wallState('W.4.2', 'M-1-10');
let M43 = new wallState('W.4.3', 'M-1-16');
let M44 = new wallState('W.4.4', 'M-1-22');
let M45 = new wallState('W.4.5', 'M-1-28');
//
let M51 = new wallState('W.5.1', 'M-1-5');
let M52 = new wallState('W.5.2', 'M-1-11');
let M53 = new wallState('W.5.3', 'M-1-17');
let M54 = new wallState('W.5.4', 'M-1-23');
let M55 = new wallState('W.5.5', 'M-1-29');
//
let M61 = new wallState('W.6.1', 'M-1-6');
let M62 = new wallState('W.6.2', 'M-1-12');
let M63 = new wallState('W.6.3', 'M-1-18');
let M64 = new wallState('W.6.4', 'M-1-24');
let M65 = new wallState('W.6.5', 'M-1-30');
//

const M = [M11, M12, M13, M14, M15,
                M21, M22, M23, M24, M25,
                M31, M32, M33, M34, M35,
                M41, M42, M43, M44, M45,
                M51, M52, M53, M54, M55,
                M61, M62, M63, M64, M65]

for(let i = 0; i < M.length; i ++){
    console.log(M[i].getName(), M[i].getIndex())
}
/**
 * 
 * @param {string} name 
 * @returns wall object with input name
 */
function accessWallByName(name){
    for(let i = 0; i < M.length; i ++){
        if(M[i].getName() == name) return M[i];
    }
    return 'invalid wall name';
}

function accessWallByCoor(coordinate){
    for(let i = 0; i < M.length; i ++){
        if(M[i].getCoordinate() == coordinate) return M[i];
    }
    return 'invalid wall coordinate';
}

module.exports = {accessWallByName, accessWallByCoor};
