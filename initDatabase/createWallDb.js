/**
 * Run this script to create wall database
 * Edit 'WALL_TO_INIT' before running
 */
require('dotenv').config()
const prompt = require('prompt');
const MongoClient = require('mongodb').MongoClient;
const url = process.env.DATABASE_URL || "mongodb://localhost:27017/";

const mongoClient = new MongoClient(url, { useUnifiedTopology: true });

const walldata = require('./wall');

let WALL_NAME_TO_INIT = '';
let WALL_DATA_TO_INIT;

prompt.start();
console.log('Which Wall to create: M1|M2|M3|M4 ?');
prompt.get(['wall'], (err, res) => {
  if (err) console.log(err);
  //WALL_NAME_TO_RESET = res.wall;
  switch (res.wall) {
    case 'M1':
      WALL_NAME_TO_INIT = 'Wall_M1';
      WALL_DATA_TO_INIT = walldata.WAll_M1;
      break;
    case 'M2':
      WALL_NAME_TO_INIT = 'Wall_M2';
      WALL_DATA_TO_INIT = walldata.WAll_M2;
      break;
    case 'M3':
      WALL_NAME_TO_INIT = 'Wall_M3';
      WALL_DATA_TO_INIT = walldata.WAll_M3;
      break;
    case 'M4':
      WALL_NAME_TO_INIT = 'Wall_M4';
      WALL_DATA_TO_INIT = walldata.WAll_M4;
      break;
    default:
      WALL_NAME_TO_INIT = false;
      console.log('Not a valid wall!');
      break;
  }
  if (WALL_NAME_TO_INIT !== false) mongoClient.connect(handleConnection);
});

function handleConnection(err, db) {
  if (err) console.error(err);
  let dbo = db.db(WALL_NAME_TO_INIT);

  // dbo.collection("history").drop(function(err, delOK) {
  //   if (err) throw err;
  //   if (delOK) console.log("Collection deleted");
  //   mongoClient.close();
  // });

  // dbo.collection("backup").drop(function(err, delOK) {
  //   if (err) throw err;
  //   if (delOK) console.log("Collection deleted");
  //   mongoClient.close();
  // });

  dbo.collection("backup").insertMany(WALL_DATA_TO_INIT, function (err, res) {
    if (err) console.log(err);
    console.log('Successful', res);
    mongoClient.close();
  });
};