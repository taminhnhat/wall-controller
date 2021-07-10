let MongoClient = require('mongodb').MongoClient;
let url = "mongodb://localhost:27017/";

const mongoClient = new MongoClient(url, { useUnifiedTopology: true })


function createWallMap(name, position){
  return {name: name, position: position};
}

const W11 = createWallMap('M-1-1', 'W.1.1');
const W21 = createWallMap('M-1-2', 'W.2.1');
const W31 = createWallMap('M-1-3', 'W.3.1');
const W41 = createWallMap('M-1-4', 'W.4.1');
const W51 = createWallMap('M-1-5', 'W.5.1');
const W61 = createWallMap('M-1-6', 'W.6.1');

const W12 = createWallMap('M-1-7', 'W.1.2');
const W22 = createWallMap('M-1-8', 'W.2.2');
const W32 = createWallMap('M-1-9', 'W.3.2');
const W42 = createWallMap('M-1-10', 'W.4.2');
const W52 = createWallMap('M-1-11', 'W.5.2');
const W62 = createWallMap('M-1-12', 'W.6.2');

const W13 = createWallMap('M-1-13', 'W.1.3');
const W23 = createWallMap('M-1-14', 'W.2.3');
const W33 = createWallMap('M-1-15', 'W.3.3');
const W43 = createWallMap('M-1-16', 'W.4.3');
const W53 = createWallMap('M-1-17', 'W.5.3');
const W63 = createWallMap('M-1-18', 'W.6.3');

const W14 = createWallMap('M-1-19', 'W.1.4');
const W24 = createWallMap('M-1-20', 'W.2.4');
const W34 = createWallMap('M-1-21', 'W.3.4');
const W44 = createWallMap('M-1-22', 'W.4.4');
const W54 = createWallMap('M-1-23', 'W.5.4');
const W64 = createWallMap('M-1-24', 'W.6.4');

const W15 = createWallMap('M-1-25', 'W.1.5');
const W25 = createWallMap('M-1-26', 'W.2.5');
const W35 = createWallMap('M-1-27', 'W.3.5');
const W45 = createWallMap('M-1-28', 'W.4.5');
const W55 = createWallMap('M-1-29', 'W.5.5');
const W65 = createWallMap('M-1-30', 'W.6.5');

const wallMapping = [W11, W21, W31, W41, W51, W61,
W12, W22, W32, W42, W52, W62,
W13, W23, W33, W43, W53, W63,
W14, W24, W34, W44, W54, W64,
W15, W25, W35, W45, W55, W65];

console.log(wallMapping)


mongoClient.connect(function(err, client) {
  if (err) console.error(err);
  let db = client.db("Wall");

  async function updateWallName(wall){
    const collection = db.collection("backup");
    for(i in wallMapping){
      const filterValue = {position: wallMapping[i].position};
  
      const updateValue = {name: wallMapping[i].name};

      let res = await collection.updateOne(filterValue, {$set: updateValue});
      console.log(filterValue, updateValue);
    }
    console.log('closing');
    client.close();
  }
  updateWallName();
});