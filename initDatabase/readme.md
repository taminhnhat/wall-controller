Create database
```sh
$ cd ~/wall-controller
$ node ./initDatabase/createWallDb.js
Which Wall to create: M1|M2|M3|M4 ?
prompt: wall:  M2
Complete!
```
Check database
```sh
# Access mongo shell
$ mongo
$ show dbs
# Check if database created, then check collections
$ use Wall_M1
$ show collections
```
[HOME](../README.md)