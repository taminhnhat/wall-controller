const wall = require('./wallApi');
const full32bits = 2**32;

class gpioMap{
    #frontBitmap
    #backBitmap
    constructor(){
        this.#frontBitmap = 0;
        this.#backBitmap = 0;
    }

    
    bitmapGenerate(bitIndex, wallSide, lightState){
        let bitmask;

        if(wallSide == 'front'){
            if(lightState == 'on'){
                bitmask = (1 << bitDes);
                this.#frontBitmap |= bitmask;
            }
            else if(lightState == 'off'){
                bitmask = (1 << bitDes) ^ full32bits;
                this.#frontBitmap &= bitmask;
            }
        }
        else if(wallSide == 'back'){
            if(lightState == 'on'){
                bitmask = (1 << bitDes);
                this.#backBitmap |= bitmask;
            }
            else if(lightState == 'off'){
                bitmask = (1 << bitDes) ^ full32bits;
                this.#backBitmap &= bitmask;
            }
            console.log(bitmask, this.#backBitmap);
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
}

let lightBitmap = new gpioMap();

module.exports = lightBitmap;