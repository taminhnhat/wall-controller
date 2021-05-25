const wall = require('./wallApi');
const full32bits = 2**32 - 1;

class gpioMap{
    #frontBitmap
    #backBitmap
    constructor(){
        this.#frontBitmap = 0;
        this.#backBitmap = 0;
    }

    /**
     * Generate bitmap when a light state changed
     * @param {Number} lightIndex 
     * @param {String} wallSide 
     * @param {String} lightState 
     */
    bitmapGenerate(lightIndex, wallSide, lightState){
        let bitmask;

        if(wallSide == 'front'){
            if(lightState == 'on'){
                bitmask = (1 << lightIndex >>> 0);
                this.#frontBitmap |= bitmask;
                this.#frontBitmap >>>= 0;
            }
            else if(lightState == 'off'){
                bitmask = ((1 << lightIndex) ^ full32bits) >>> 0;
                this.#frontBitmap &= bitmask;
                this.#frontBitmap >>>= 0;
            }
            console.log(`generate index ${lightIndex}, bitmask ${bitmask.toString(2)}, bitmap ${this.#frontBitmap.toString(2)}`);
        }
        else if(wallSide == 'back'){
            if(lightState == 'on'){
                bitmask = (1 << lightIndex >>> 0);
                this.#backBitmap |= bitmask;
                this.#backBitmap >>>= 0;
            }
            else if(lightState == 'off'){
                bitmask = ((1 << lightIndex) ^ full32bits) >>> 0;
                this.#backBitmap &= bitmask;
                this.#backBitmap >>>= 0;
            }
            console.log(bitmask, this.#backBitmap);
        }
    }

    /**
     * Set bitmap
     * @param {Number} bitmap from 0 to 2^32-1
     * @param {String} wallSide 'front'|'back'
     */
    bitmapSet(bitmap, wallSide){
        if(wallSide == 'front'){
            this.#frontBitmap = bitmap;
        }
        else if(wallSide == 'back'){
            this.#backBitmap = bitmap;
        }
    }

    /**
     * Get light bitmap on the front of the wall
     * @returns front light bitmap of the wall
     */
    getFrontBitmap(){
        return this.#frontBitmap;
    }

    /**
     * Get light bitmap on the back of the wall
     * @returns back light bitmap of the wall
     */
    getBackBitmap(){
        return this.#backBitmap
    }

    getBitmap(wallSide){
        if(wallSide == 'front') return this.#frontBitmap;
        else if(wallSide == 'back') return this.#backBitmap;
    }
}

let gpioBitmap = new gpioMap();

module.exports = gpioBitmap;