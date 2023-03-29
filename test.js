const io = require('socket.io-client');
require('dotenv').config();
const SERVER_URL = process.env.SERVER_URL;
const socket = io.connect(SERVER_URL);
console.log(`Connecting to ${SERVER_URL}`)

socket.on("connect", () => {
    console.log(`Connected to id ${socket.id}`); // x8WIv7-mJelg7on_ALbx
});

socket.on("disconnect", () => {
    console.log(`Disconnected from id ${socket.id}`); // undefined
});

socket.io.once("error", (error) => {
    console.log('socket error', error);
});