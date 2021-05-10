/**
 * Create wall object
 * 
 */
// class wallState{
//     #name;
//     #complete;
//     #locked;
//     #log;
//     #key;
//     importTote;
//     exportTote;
//     frontLight;
//     backLight;
//     row;
//     col;
//     /**
//      * 
//      * @param {String} name {'M-1-1'}
//      */
//     constructor(name){
//         this.#name = name;
//         this.importTote = [];
//         this.exportTote = null;
//         this.#complete = false;
//         this.#locked = false;
//         this.#key = null;
//         this.frontLight = false;
//         this.backLight = false;
//         let temp = name.split('-');
//         this.row = temp[1];
//         this.col = temp[2];
//         this.#log = 'null';
//     }
//     /**
//      * Create a log object that save 1 complete action on wall include: wall name, import totes, export tote, key. Return private #log property
//      */
//     combine(){
//         let temp = new Object;
//         temp.wall = this.#name;
//         temp.importTote = this.importTote;
//         temp.exportTote = this.exportTote;
//         temp.key = this.#key;
//         this.#log = temp;
//     }
    

//     /**
//      * Turn on light on 1 side of wall
//      * @param {String} side {'front', 'back'}
//      * @returns 
//      */
//     lightOn(side){
//         if(this.#locked) return 'this wall locked';
//         if(side == 'front'){
//             this.frontLight = true;
//         }
//         else if (side == 'back'){
//             this.backLight = true;
//         }
//         console.log(`Light ${this.name} on`, this);
//         return 'light on completed';
//     }

//     /**
//      * Turn off light on 1 side of wall
//      * @param {*} side side of wall
//      * @returns 
//      */
//     lightOff(side){
//         if(this.#locked) return 'this wall locked';
//         if(side == 'front'){
//             this.frontLight = false;
//         }
//         else if (side == 'back'){
//             this.backLight = false;
//         }
//         console.log(`Light ${this.name} off`, this);
//         return 'light off completed';
//     }

//     /**
//      * Add import tote to wall
//      * @param {String} tote import tote
//      * @returns 
//      */
//     import(tote){
//         if(this.#locked) return 'this wall locked';
//         this.importTote.push(tote);
//         return 'import tote completed';
//     }

//     /**
//      * Add export tote to wall
//      * @param {String} tote export tote
//      * @returns
//      */
//     export(tote){
//         if(this.#locked) return 'this wall locked';
//         this.exportTote = tote;
//         this.#complete = true;
//         return 'export tote completed';
//     }

//     /**
//      * Add key to wall
//      * @param {Number} key 
//      * @returns 
//      */
//     addKey(key){
//         this.#key = key;
//         return 1;
//     }

//     /**
//      * Clear wall data
//      * @returns 
//      */
//     clear(){
//         this.importTote = [];
//         this.exportTote = null;
//         this.key = null;
//         this.#complete = false;
//         return 'clear completed';
//     }

//     /**
//      * Log wall history {import totes, export tote, wall name, key, time}
//      * @returns {String} log
//      */
//     log(){
//         this.combine();
//         return this.#log;
//     }

//     /**
//      * 
//      * @returns 
//      */
//     getLock(){
//         return this.#locked;
//     }

//     /**
//      * 
//      * @returns 
//      */
//     lock(){
//         this.#locked = true;
//         return this.#locked;
//     }

//     /**
//      * 
//      * @returns 
//      */
//     unlock(){
//         this.#locked = false;
//         return this.#locked;
//     }

//     /**
//      * 
//      * @returns name of wall object
//      */
//     getName(){
//         return this.#name;
//     }
// }

function createWall(name){
    let wallObj = {};
    wallObj.name = name;
    wallObj.frontLight = false;
    wallObj.backLight = false;
    wallObj.importTote = [];
    wallObj.exportTote = null;
    wallObj.key = null;
    wallObj.complete = false;
    return wallObj;
}

//
let M11 = new createWall('M-1-1');
let M12 = new createWall('M-1-2');
let M13 = new createWall('M-1-3');
let M14 = new createWall('M-1-4');
let M15 = new createWall('M-1-5');
//
let M21 = new createWall('M-2-1');
let M22 = new createWall('M-2-2');
let M23 = new createWall('M-2-3');
let M24 = new createWall('M-2-4');
let M25 = new createWall('M-2-5');
//
let M31 = new createWall('M-3-1');
let M32 = new createWall('M-3-2');
let M33 = new createWall('M-3-3');
let M34 = new createWall('M-3-4');
let M35 = new createWall('M-3-5');
//
let M41 = new createWall('M-4-1');
let M42 = new createWall('M-4-2');
let M43 = new createWall('M-4-3');
let M44 = new createWall('M-4-4');
let M45 = new createWall('M-4-5');
//
let M51 = new createWall('M-5-1');
let M52 = new createWall('M-5-2');
let M53 = new createWall('M-5-3');
let M54 = new createWall('M-5-4');
let M55 = new createWall('M-5-5');
//
let M61 = new createWall('M-6-1');
let M62 = new createWall('M-6-2');
let M63 = new createWall('M-6-3');
let M64 = new createWall('M-6-4');
let M65 = new createWall('M-6-5');
//


// console.log(typeof(M11), M11)
// M12.lightOn('front');
// M12.lightOff('front');
// M12.lightOn('back');
// M12.lightOff('back');
// let start = new Date();
// console.log(M12.log());
// console.log(start.getTime());

const M = [M11, M12, M13, M14, M15,
                M21, M22, M23, M24, M25,
                M31, M32, M33, M34, M35,
                M41, M42, M43, M44, M45,
                M51, M52, M53, M54, M55,
                M61, M62, M63, M64, M65]

/**
 * 
 * @param {string} name 
 * @returns wall object with input name
 */
function accessWall(name){
    for(let i = 0; i < M.length; i ++){
        if(M[i].getName() == name) return M[i];
    }
    return 'invalid wall name';
}




module.exports = accessWall;
