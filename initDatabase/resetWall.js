/**
 * Run this script to reset wall state in database
 * Edit 'WALL_NAME_TO_RESET' constance before running
 */

const WALL_NAME_TO_RESET = 'Wall_M1';

let MongoClient = require('mongodb').MongoClient;
let url = "mongodb://localhost:27017/";

const mongoClient = new MongoClient(url, { useUnifiedTopology: true });

mongoClient.connect(function(err, client) {
    if (err) console.error(err);
    let db = client.db(WALL_NAME_TO_RESET);
    const collection = db.collection("backup");

    async function resetWallState(){
        // const wallState = await collection.updateMany({}, {$set: {
        //     importTote: [],
        //     exportTote: null,
        //     frontLight: false,
        //     backLight: false
        // }});
        // console.log(typeOf(wallState));
        collection.updateMany({}, {$set: {
            importTote: [],
            exportTote: null,
            frontLight: false,
            backLight: false
        }}, function(err, res){
            if(err) console.log(err);
            console.log(res.result);
            client.close();
        });
    }

    resetWallState();
});