class wallState {
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
    constructor(location, name, lightIndex) {
        this.location = location;
        this.name = name;
        const temp = location.split('.');
        this.col = temp[1];
        this.row = temp[2];
        this.lightIndex = lightIndex;
        this.frontLight = false;
        this.backLight = false;
        this.importTote = [];
        this.exportTote = null;
        this.frozen = false;
        this.lastLog = null;
    }
}
//////////////////////////////////////////////////////////////////////////////
//////              WALL M1             //////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//
let M_1_1 = new wallState('W.6.5', 'M-1-1', 2);
let M_1_2 = new wallState('W.5.5', 'M-1-2', 3);
let M_1_3 = new wallState('W.4.5', 'M-1-3', 4);
let M_1_4 = new wallState('W.3.5', 'M-1-4', 5);
let M_1_5 = new wallState('W.2.5', 'M-1-5', 6);
let M_1_6 = new wallState('W.1.5', 'M-1-6', 7);
//
let M_1_7 = new wallState('W.6.4', 'M-1-7', 8);
let M_1_8 = new wallState('W.5.4', 'M-1-8', 9);
let M_1_9 = new wallState('W.4.4', 'M-1-9', 10);
let M_1_10 = new wallState('W.3.4', 'M-1-10', 11);
let M_1_11 = new wallState('W.2.4', 'M-1-11', 12);
let M_1_12 = new wallState('W.1.4', 'M-1-12', 13);
//
let M_1_13 = new wallState('W.6.3', 'M-1-13', 14);
let M_1_14 = new wallState('W.5.3', 'M-1-14', 15);
let M_1_15 = new wallState('W.4.3', 'M-1-15', 16);
let M_1_16 = new wallState('W.3.3', 'M-1-16', 17);
let M_1_17 = new wallState('W.2.3', 'M-1-17', 18);
let M_1_18 = new wallState('W.1.3', 'M-1-18', 19);
//
let M_1_19 = new wallState('W.6.2', 'M-1-19', 20);
let M_1_20 = new wallState('W.5.2', 'M-1-20', 21);
let M_1_21 = new wallState('W.4.2', 'M-1-21', 22);
let M_1_22 = new wallState('W.3.2', 'M-1-22', 23);
let M_1_23 = new wallState('W.2.2', 'M-1-23', 24);
let M_1_24 = new wallState('W.1.2', 'M-1-24', 25);
//
let M_1_25 = new wallState('W.6.1', 'M-1-25', 26);
let M_1_26 = new wallState('W.5.1', 'M-1-26', 27);
let M_1_27 = new wallState('W.4.1', 'M-1-27', 28);
let M_1_28 = new wallState('W.3.1', 'M-1-28', 29);
let M_1_29 = new wallState('W.2.1', 'M-1-29', 30);
let M_1_30 = new wallState('W.1.1', 'M-1-30', 31);
//
//////////////////////////////////////////////////////////////////////////////
//////              WALL M2             //////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//
let M_2_1 = new wallState('W.6.5', 'M-2-1', 2);
let M_2_2 = new wallState('W.5.5', 'M-2-2', 3);
let M_2_3 = new wallState('W.4.5', 'M-2-3', 4);
let M_2_4 = new wallState('W.3.5', 'M-2-4', 5);
let M_2_5 = new wallState('W.2.5', 'M-2-5', 6);
let M_2_6 = new wallState('W.1.5', 'M-2-6', 7);
//
let M_2_7 = new wallState('W.6.4', 'M-2-7', 8);
let M_2_8 = new wallState('W.5.4', 'M-2-8', 9);
let M_2_9 = new wallState('W.4.4', 'M-2-9', 10);
let M_2_10 = new wallState('W.3.4', 'M-2-10', 11);
let M_2_11 = new wallState('W.2.4', 'M-2-11', 12);
let M_2_12 = new wallState('W.1.4', 'M-2-12', 13);
//
let M_2_13 = new wallState('W.6.3', 'M-2-13', 14);
let M_2_14 = new wallState('W.5.3', 'M-2-14', 15);
let M_2_15 = new wallState('W.4.3', 'M-2-15', 16);
let M_2_16 = new wallState('W.3.3', 'M-2-16', 17);
let M_2_17 = new wallState('W.2.3', 'M-2-17', 18);
let M_2_18 = new wallState('W.1.3', 'M-2-18', 19);
//
let M_2_19 = new wallState('W.6.2', 'M-2-19', 20);
let M_2_20 = new wallState('W.5.2', 'M-2-20', 21);
let M_2_21 = new wallState('W.4.2', 'M-2-21', 22);
let M_2_22 = new wallState('W.3.2', 'M-2-22', 23);
let M_2_23 = new wallState('W.2.2', 'M-2-23', 24);
let M_2_24 = new wallState('W.1.2', 'M-2-24', 25);
//
let M_2_25 = new wallState('W.6.1', 'M-2-25', 26);
let M_2_26 = new wallState('W.5.1', 'M-2-26', 27);
let M_2_27 = new wallState('W.4.1', 'M-2-27', 28);
let M_2_28 = new wallState('W.3.1', 'M-2-28', 29);
let M_2_29 = new wallState('W.2.1', 'M-2-29', 30);
let M_2_30 = new wallState('W.1.1', 'M-2-30', 31);
//
//////////////////////////////////////////////////////////////////////////////
//////              WALL M3             //////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//
let M_3_1 = new wallState('W.6.5', 'M-3-1', 2);
let M_3_2 = new wallState('W.5.5', 'M-3-2', 3);
let M_3_3 = new wallState('W.4.5', 'M-3-3', 4);
let M_3_4 = new wallState('W.3.5', 'M-3-4', 5);
let M_3_5 = new wallState('W.2.5', 'M-3-5', 6);
let M_3_6 = new wallState('W.1.5', 'M-3-6', 7);
//
let M_3_7 = new wallState('W.6.4', 'M-3-7', 8);
let M_3_8 = new wallState('W.5.4', 'M-3-8', 9);
let M_3_9 = new wallState('W.4.4', 'M-3-9', 10);
let M_3_10 = new wallState('W.3.4', 'M-3-10', 11);
let M_3_11 = new wallState('W.2.4', 'M-3-11', 12);
let M_3_12 = new wallState('W.1.4', 'M-3-12', 13);
//
let M_3_13 = new wallState('W.6.3', 'M-3-13', 14);
let M_3_14 = new wallState('W.5.3', 'M-3-14', 15);
let M_3_15 = new wallState('W.4.3', 'M-3-15', 16);
let M_3_16 = new wallState('W.3.3', 'M-3-16', 17);
let M_3_17 = new wallState('W.2.3', 'M-3-17', 18);
let M_3_18 = new wallState('W.1.3', 'M-3-18', 19);
//
let M_3_19 = new wallState('W.6.2', 'M-3-19', 20);
let M_3_20 = new wallState('W.5.2', 'M-3-20', 21);
let M_3_21 = new wallState('W.4.2', 'M-3-21', 22);
let M_3_22 = new wallState('W.3.2', 'M-3-22', 23);
let M_3_23 = new wallState('W.2.2', 'M-3-23', 24);
let M_3_24 = new wallState('W.1.2', 'M-3-24', 25);
//
let M_3_25 = new wallState('W.6.1', 'M-3-25', 26);
let M_3_26 = new wallState('W.5.1', 'M-3-26', 27);
let M_3_27 = new wallState('W.4.1', 'M-3-27', 28);
let M_3_28 = new wallState('W.3.1', 'M-3-28', 29);
let M_3_29 = new wallState('W.2.1', 'M-3-29', 30);
let M_3_30 = new wallState('W.1.1', 'M-3-30', 31);
//
//////////////////////////////////////////////////////////////////////////////
//////              WALL M4             //////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//
let M_4_1 = new wallState('W.6.5', 'M-4-1', 2);
let M_4_2 = new wallState('W.5.5', 'M-4-2', 3);
let M_4_3 = new wallState('W.4.5', 'M-4-3', 4);
let M_4_4 = new wallState('W.3.5', 'M-4-4', 5);
let M_4_5 = new wallState('W.2.5', 'M-4-5', 6);
let M_4_6 = new wallState('W.1.5', 'M-4-6', 7);
//
let M_4_7 = new wallState('W.6.4', 'M-4-7', 8);
let M_4_8 = new wallState('W.5.4', 'M-4-8', 9);
let M_4_9 = new wallState('W.4.4', 'M-4-9', 10);
let M_4_10 = new wallState('W.3.4', 'M-4-10', 11);
let M_4_11 = new wallState('W.2.4', 'M-4-11', 12);
let M_4_12 = new wallState('W.1.4', 'M-4-12', 13);
//
let M_4_13 = new wallState('W.6.3', 'M-4-13', 14);
let M_4_14 = new wallState('W.5.3', 'M-4-14', 15);
let M_4_15 = new wallState('W.4.3', 'M-4-15', 16);
let M_4_16 = new wallState('W.3.3', 'M-4-16', 17);
let M_4_17 = new wallState('W.2.3', 'M-4-17', 18);
let M_4_18 = new wallState('W.1.3', 'M-4-18', 19);
//
let M_4_19 = new wallState('W.6.2', 'M-4-19', 20);
let M_4_20 = new wallState('W.5.2', 'M-4-20', 21);
let M_4_21 = new wallState('W.4.2', 'M-4-21', 22);
let M_4_22 = new wallState('W.3.2', 'M-4-22', 23);
let M_4_23 = new wallState('W.2.2', 'M-4-23', 24);
let M_4_24 = new wallState('W.1.2', 'M-4-24', 25);
//
let M_4_25 = new wallState('W.6.1', 'M-4-25', 26);
let M_4_26 = new wallState('W.5.1', 'M-4-26', 27);
let M_4_27 = new wallState('W.4.1', 'M-4-27', 28);
let M_4_28 = new wallState('W.3.1', 'M-4-28', 29);
let M_4_29 = new wallState('W.2.1', 'M-4-29', 30);
let M_4_30 = new wallState('W.1.1', 'M-4-30', 31);

const WAll_M1 = [M_1_1, M_1_2, M_1_3, M_1_4, M_1_5, M_1_6,
    M_1_7, M_1_8, M_1_9, M_1_10, M_1_11, M_1_12,
    M_1_13, M_1_14, M_1_15, M_1_16, M_1_17, M_1_18,
    M_1_19, M_1_20, M_1_21, M_1_22, M_1_23, M_1_24,
    M_1_25, M_1_26, M_1_27, M_1_28, M_1_29, M_1_30];

const WAll_M2 = [M_2_1, M_2_2, M_2_3, M_2_4, M_2_5, M_2_6,
    M_2_7, M_2_8, M_2_9, M_2_10, M_2_11, M_2_12,
    M_2_13, M_2_14, M_2_15, M_2_16, M_2_17, M_2_18,
    M_2_19, M_2_20, M_2_21, M_2_22, M_2_23, M_2_24,
    M_2_25, M_2_26, M_2_27, M_2_28, M_2_29, M_2_30];

const WAll_M3 = [M_3_1, M_3_2, M_3_3, M_3_4, M_3_5, M_3_6,
    M_3_7, M_3_8, M_3_9, M_3_10, M_3_11, M_3_12,
    M_3_13, M_3_14, M_3_15, M_3_16, M_3_17, M_3_18,
    M_3_19, M_3_20, M_3_21, M_3_22, M_3_23, M_3_24,
    M_3_25, M_3_26, M_3_27, M_3_28, M_3_29, M_3_30];

const WAll_M4 = [M_4_1, M_4_2, M_4_3, M_4_4, M_4_5, M_4_6,
    M_4_7, M_4_8, M_4_9, M_4_10, M_4_11, M_4_12,
    M_4_13, M_4_14, M_4_15, M_4_16, M_4_17, M_4_18,
    M_4_19, M_4_20, M_4_21, M_4_22, M_4_23, M_4_24,
    M_4_25, M_4_26, M_4_27, M_4_28, M_4_29, M_4_30];

module.exports = { WAll_M1, WAll_M2, WAll_M3, WAll_M4 };