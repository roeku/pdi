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
var bubbleRange = 1;
var size = 0;
var oldDistances = createArray(3, 15);
var toFilterDataset = createArray(3, 15);

var oldDistance;
var prevMovement;
var prevDroneMovement = null;
var move = false;

// rotation
var rotation = false;
var g1X = 0;
var g1Y = 0;
var prevX = 0;
var g2X = 0;

var droneLeft1 = false;
var droneRight1 = false;
var droneStraight1 = true;

var droneLeft2 = false;
var droneRight2 = false;
var droneStraight2 = true;

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
        //console.log(mo);
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
        //console.log(r.user);
        if (r.user == 1) {
            g1X = r.x;
            g1Y = r.y;
        } else if (r.user == 2) {
            g2X = r.x;
            g2Y = r.y;
        }

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
        //console.log(gX + " " + gY);
        //when the drone is closer than or equal to 1 to user1 change bool
        if (oldDistances[1].last() <= bubbleRange && oldDistances[1].last() < oldDistances[2].last()) {
            if (movement == "backward") {
                move = false;
                console.log("BACKWARD - 1");
                //console.log(movement);
            } else {
                console.log("FORWARD - 1");
                //move = false;
            }
            console.log('FORWARD EMIT');
            movement = "forward";
            io.sockets.emit('droneMovement', {
                movement: movement,
                value: newValue
            });
            //console.log(movement);
        }
        //when the drone is closer than or equal to 1 to user2 change bool
        else if (oldDistances[2].last() <= bubbleRange && oldDistances[1].last() > oldDistances[2].last()) {
            if (movement == "forward") {
                move = false;
                console.log("FORWARD - 2");
            } else {
                console.log('BACKWARD - 2');
                //move = false;
            }
            movement = "backward";
            io.sockets.emit('droneMovement', {
                movement: movement,
                value: newValue
            });
            //console.log(movement);

        } else {
            console.log('NOË');
            // io.sockets.emit('droneMovement', {
            //     movement: movement
            // });
            //console.log(movement);

        }
    } else if (!move && prevMovement != "rotation") {
        direction(userID, g1X, g1Y);
        //console.log('ROTATION');
    } else {
        movement = "same";
    }
    //  console.log(userID + ": " + oldDistances[userID].last() + " - " + movement);
    //console.log("1: " + g1X + " 2: " + g2X)

    oldDistance = newValue;
    prevMovement = movement;

}
////////////////////////////////////////////////////
function direction(userID, x, y) {
    movement = "rotation";
    if (userID == 1) {
        if (x < 60) {
            console.log('ROTATE ' + x);
            io.sockets.emit('droneMovement', {
                movement: movement,
                rotateDirection: "left",
                rotateValue: 3
            });
            //move = true;
        } else if (x > 150) {
            console.log('ROTATE ' + x);

            io.sockets.emit('droneMovement', {
                movement: movement,
                rotateDirection: "right",
                rotateValue: 3
            });
            //move = true;
        } else if (y < 60) {
            move = true;
            console.log(y + " MOVE")
        }
    } else {
        if (x < 60) {
            console.log('ROTATE ' + x);
            io.sockets.emit('droneMovement', {
                movement: movement,
                rotateDirection: "left",
                rotateValue: 3
            });
            //move = true;
        } else if (x > 150) {
            console.log('ROTATE ' + x);

            io.sockets.emit('droneMovement', {
                movement: movement,
                rotateDirection: "right",
                rotateValue: 3
            });
            //move = true;
        } else if (y < 60) {
            move = true;
            console.log(y + " MOVE")
        }
    }
    prevX = x;
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