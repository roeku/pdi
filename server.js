var fs = require('fs');
var https = require('https');

var express = require('express');
var app = express();

var options = {
    key: fs.readFileSync('./donmezfurkan.com.key'),
    cert: fs.readFileSync('./donmezf.com.crt')
};
var serverPort = 3000;

var server = https.createServer(options, app);
var io = require('socket.io')(server);
// Kalman filter
var KalmanFilter = require('kalmanjs').default;

var kf = new KalmanFilter({
    R: 1,
    Q: 10
});
kf.filter(2);
///////////////////////////////////////////////

var tRarr = [];

var movement = null;
var size = 0;
var oldDistances = createArray(3, 15);
var toFilterDataset = createArray(3, 15);

var oldDistance;
var prevDroneMovement = null;
var move = false;

// rotation
var rotation = false;
var droneLeft = false;
var droneRight = false;
var droneStraight = true;

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', function(socket) {
    console.log('new connection');

    /////////////////////////////////////////////
    socket.on('userchange', function(u) {
        console.log(u);
        console.log(oldDistances);
    })
    socket.on('values', function(p) {
        //console.log(p);
        arrayFunction(p.user, p.value);
    });
    socket.on('move', function(mo) {
        console.log(mo);
        move = mo.move;
    });
    socket.on('launch', function(l) {
        io.sockets.emit('startDrone', {
            startDrone: true
        });
    });
    socket.on('emer', function(e) {
        io.sockets.emit('emergency', {
            emergency: true
        });
    });
    socket.on('beaconPositions', function(b) {
        var tArr = b.arr;
        var max = Object.keys(tArr).reduce(function(a, b) {
            return tArr[a] > tArr[b] ? a : b
        });
        var b0 = Object.keys(tArr[0][max]);

        for (var key in tArr[1]) {
            ///  console.log(Object.keys(key));
        }

        console.log(b0 + " " + Object.keys(tArr[1][0]));
    });
    socket.on('rotate', function(r) {

        gX = r.x;
        gY = r.y;


    });
});



server.listen(serverPort, function() {
    console.log('server up and running at %s port', serverPort);
});


/////////////////////////////////////////////////
function arrayFunction(userID, newValue) {
    // everytime you get in this function, shift the old array of userID to make place for the new value
    toFilterDataset[userID].shift();

    // function for Kalman filter; make a lineair algoritm to average the RSSI values
    toFilterDataset[userID].push(calculateDistance(newValue));
    oldDistances[userID] = toFilterDataset[userID].map(function(v) {
        return kf.filter(v, 1);
    });
    // when it's not a duplicate value (because it's impossible to receive duplicates with floats, unless somethings wrong)
    if (oldDistance != newValue && move) {
        //console.log(userID);
        //when the drone is close to both users, shutdown, cuz it should be impossible
        console.log(gX + " " + gY);
        //when the drone is closer than or equal to 1 to user1 change bool
        if (oldDistances[userID].last() <= 0.75 && userID == 1 && oldDistances[1].last() < oldDistances[2].last()) {
            if (movement != false) {

                console.log(movement);
                if (gX < 15 && movement) {
                    droneRight = false;
                    droneLeft = true;
                    console.log('left' + gX);
                } else if (gX > 85 && movement) {
                    droneRight = false;
                    droneLeft = true;
                    console.log('left' + gX);
                } else if (movement) {
                    droneRight = false;
                    droneLeft = false;
                    droneStraight = true;
                    console.log('straight' + gX);
                }
                move = false;
            }
            movement = false;
            io.sockets.emit('droneMovement', {
                movement: movement,
                value: newValue
            });
            console.log(movement);
        }
        //when the drone is closer than or equal to 1 to user2 change bool
        else if (oldDistances[userID].last() <= 0.75 && userID == 2 && oldDistances[1].last() > oldDistances[2].last()) {
            if (movement != true) {
                move = false;
            }
            movement = true;
            io.sockets.emit('droneMovement', {
                movement: movement,
                value: newValue
            });
            console.log(movement);

            //  } else if (oldDistances[userID].last() >= 5) {
            //  console.log('TOO FAR');
            //io.sockets.emit('emergency', {emergency: true});

        } else {
            io.sockets.emit('droneMovement', {
                movement: movement
            });
            //console.log(movement);

        }
        console.log(userID + ": " + oldDistances[userID].last() + " - " + movement);
        console.log();
        oldDistance = newValue;
        // rotate drone to the users chosen direction
        // } else if (rotation) {
        //     // turn drone left when drone was turned right
        //     if (droneLeft && droneRight) {
        //         // rotate 50 steps
        //         io.sockets.emit('rotation', {
        //             left: 25,
        //             right: -25,
        //         });
        //         droneRight = false;
        //     } else if (droneLeft) {
        //         console.log('ROTATE LEFT');
        //         io.sockets.emit('rotation', {
        //             left: 25,
        //             right: 0,
        //         });
        //     }
        //     // turn drone right
        //     else if (droneRight && droneLeft) {
        //         console.log('ROTATE LEFT');
        //         io.sockets.emit('rotation', {
        //             left: -25,
        //             right: 25,
        //         });
        //         droneLeft = false;
        //     } else if (droneRight) {
        //         console.log('ROTATE RIGHT');
        //         io.sockets.emit('rotation', {
        //             left: 0,
        //             right: 25,
        //         });
        //     } else if (droneRight && droneStraight) {
        //         console.log('ROTATE RIGHT');
        //         io.sockets.emit('rotation', {
        //             left: 0,
        //             right: -25,
        //         });
        //     } else if (droneLeft && droneStraight) {
        //         console.log('GO STRAIGHT');
        //         io.sockets.emit('rotation', {
        //             left: -25,
        //             right: 0,
        //         });
        //         // turn drone straight
        //     } else if (droneStraight) {
        //         console.log('GO STRAIGHT');
        //         io.sockets.emit('rotation', {
        //             left: 0,
        //             right: 0,
        //         });
    }
}


////////////////////////////////////////////////////
// add new last() method:
if (!Array.prototype.last) {
    Array.prototype.last = function() {
        return this[this.length - 1];
    };
};

// array generator
function createArray(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while (i--) arr[length - 1 - i] = createArray.apply(this, args);
    }

    return arr;
}

// function for conversion into meters (use of the standard values)
function calculateDistance(rssi) {

    var txPower = -59 //hard coded power value. Usually ranges between -59 to -65

    if (rssi == 0) {
        return -1.0;
    }

    var ratio = rssi * 1.0 / txPower;
    if (ratio < 1.0) {
        return Math.pow(ratio, 10);
    } else {
        var distance = (0.89976) * Math.pow(ratio, 7.7095) + 0.111;
        return distance;
    }
}

//TODO: function for angle change