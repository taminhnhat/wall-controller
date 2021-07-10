/**
 * Run this script to create wall database
 * Edit 'WALL_TO_INIT' before running
 */

let MongoClient = require('mongodb').MongoClient;
let url = "mongodb://localhost:27017/";

const mongoClient = new MongoClient(url, { useUnifiedTopology: true })

const WALL_TO_INIT = require('./wallM1');

mongoClient.connect(function(err, db) {
  if (err) console.error(err);
  let dbo = db.db("Wall_M1", );

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

  dbo.collection("backup").insertMany(WALL_TO_INIT, function(err, res){
    if (err) throw err;
    console.log('Add pressButton event to Db', res.result);
    mongoClient.close();
  });
});