const io = require('socket.io-client');
const socket = io.connect('wss://nodeops-socket.fahasa.com');

socket.on("connect", () => {
    console.log(`Connected to server id:${socket.id}`); // x8WIv7-mJelg7on_ALbx
});

socket.on("disconnect", () => {
    console.log(socket.id); // undefined
});

socket.io.once("error", (error) => {
    console.log('socket error', error);
});