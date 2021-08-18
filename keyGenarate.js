/**
 * Generate a random key string
 * @param {Number} size 
 * @returns key string
 */
 function generateKey(size){
    let val = '';
    for(let i = 0; i < size; i ++){
        val += String.fromCharCode(Math.floor(Math.random()*26) + 97);
        val += String.fromCharCode(Math.floor(Math.random()*10) + 48);
    }
    return `${Date.now()}-${val}`;
}

module.exports = generateKey;