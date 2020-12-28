var express = require('express');            //Require express.
var app     = express();                     //Create express object.
var server  = require('http').Server(app);   //Require http server.
var port    = process.env.PORT || 3000;      //Use environment port, otherwise use port 3000.
var io      = require('socket.io')(server);  // Socket.io

//Declare directory with static files.
app.use(express.static(__dirname + '/public'));

//Socket.io for game.
io.on('connection', (socket) => {

    //Send that you have joined.
    socket.broadcast.emit('playerJoined', {'firstToJoin': false, 'id': socket.id});

    //Player who first joined acknowledges other player joined.
    socket.on('playerJoined', (params) => {
        socket.broadcast.emit('playerJoined', params);
    });

    //Send tank move to the other player.
    socket.on('sendTankMove', (params) => {
        socket.broadcast.emit('sendTankMove', params);
    });

    //Send the angle and power for firing to the other player.
    socket.on('fireTankShell', (params1, params2) => {
        socket.broadcast.emit('fireTankShell', params1, params2);
    });

    socket.on('shellSwitch', (params) => {
        socket.broadcast.emit('shellSwitch', params);
    });
});

server.listen(port, () => {
    console.log(`Listening on port ${port}`);
})