class wallState{
    name
    location
    col
    row
    lightIndex
    frontLight
    backLight
    importTote
    exportTote
    frozen
    lastLog
    constructor(location, name){
        this.location = location;
        this.name = name;
        const temp = location.split('.');
        this.col = temp[1];
        this.row = temp[2];
        this.lightIndex = Number(this.col) + 1 + Number(this.row - 1)*6;
        this.frontLight = false;
        this.backLight = false;
        this.importTote = [];
        this.exportTote = null;
        this.frozen = false;
        this.lastLog = null;
    }
}

//
let M11 = new wallState('W.1.1', 'M-3-1');
let M12 = new wallState('W.1.2', 'M-3-7');
let M13 = new wallState('W.1.3', 'M-3-13');
let M14 = new wallState('W.1.4', 'M-3-19');
let M15 = new wallState('W.1.5', 'M-3-25');
//
let M21 = new wallState('W.2.1', 'M-3-2');
let M22 = new wallState('W.2.2', 'M-3-8');
let M23 = new wallState('W.2.3', 'M-3-14');
let M24 = new wallState('W.2.4', 'M-3-20');
let M25 = new wallState('W.2.5', 'M-3-26');
//
let M31 = new wallState('W.3.1', 'M-3-3');
let M32 = new wallState('W.3.2', 'M-3-9');
let M33 = new wallState('W.3.3', 'M-3-15');
let M34 = new wallState('W.3.4', 'M-3-21');
let M35 = new wallState('W.3.5', 'M-3-27');
//
let M41 = new wallState('W.4.1', 'M-3-4');
let M42 = new wallState('W.4.2', 'M-3-10');
let M43 = new wallState('W.4.3', 'M-3-16');
let M44 = new wallState('W.4.4', 'M-3-22');
let M45 = new wallState('W.4.5', 'M-3-28');
//
let M51 = new wallState('W.5.1', 'M-3-5');
let M52 = new wallState('W.5.2', 'M-3-11');
let M53 = new wallState('W.5.3', 'M-3-17');
let M54 = new wallState('W.5.4', 'M-3-23');
let M55 = new wallState('W.5.5', 'M-3-29');
//
let M61 = new wallState('W.6.1', 'M-3-6');
let M62 = new wallState('W.6.2', 'M-3-12');
let M63 = new wallState('W.6.3', 'M-3-18');
let M64 = new wallState('W.6.4', 'M-3-24');
let M65 = new wallState('W.6.5', 'M-3-30');
//

const M = [M11, M12, M13, M14, M15,
                M21, M22, M23, M24, M25,
                M31, M32, M33, M34, M35,
                M41, M42, M43, M44, M45,
                M51, M52, M53, M54, M55,
                M61, M62, M63, M64, M65]

module.exports = M;