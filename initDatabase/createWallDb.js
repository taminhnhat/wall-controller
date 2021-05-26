var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";

const mongoClient = new MongoClient(url, { useUnifiedTopology: true })

const M = require('./walldb');

mongoClient.connect(function(err, db) {
  if (err) console.error(err);
  var dbo = db.db("Wall", );

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

  dbo.collection("backup").insertMany(M, function(err, res){
    if (err) throw err;
    console.log('Add pressButton event to Db', res.result);
    mongoClient.close();
  });
});