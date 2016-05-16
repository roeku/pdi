var fs = require('fs');
var https = require('https');

var express = require('express');
var app = express();
var values = require('object.values');
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
    Q: 3
});
kf.filter(2);
///////////////////////////////////////////////

var tRarr = [];

var movement = null;
var bubbleRange = 0.2;
var playerBubble1 = false,
    playerBubble2 = false;
var size = 0;
var oldDistances = createArray(3, 15);
var toFilterDataset = createArray(3, 15);

var oldDistance;
var prevMovement;
var prevDroneMovement = null;
var move = false;

// rotation
var rotation = false;
var prevAngle = 0;
var angle1 = 0;
var angle2 = 0;
var prevX = 0;
var g2X = 0;
var g2Y = 0;

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
        io.sockets.emit('user', {
            u: u.user
        })
    })
    socket.on('values', function(p) {
        //console.log(p);
        if (oldDistances[1].last() <= bubbleRange) {
            playerBubble1 = true;
            playerBubble2 = false;
        } else if (oldDistances[2].last() <= bubbleRange) {
            playerBubble1 = false;
            playerBubble2 = true;
        } else {
            playerBubble2 = false;
            playerBubble1 = false;
        }
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
        console.log(tArr);
        var smallestValue = -60;
        var closestKey = "";
        for (var key of tArr[0])  {


            console.log(key + " -- " + Object.values(key))
        }
        var max = Object.keys(tArr[1]).reduce(function(a, b) {
            return tArr[1][a] > tArr[1][b] ? a : b
        });
        var b0 = Object.keys(tArr[0][max]);
        //console.log(max);
        //console.log(JSON.stringify(tArr[0][max]) + " -- " + JSON.stringify(tArr[1][max]) + " -- " + JSON.stringify(tArr[2][max]));
        for (var key in tArr) {
            //  console.log(key + ' -- ' + Object.keys(key));
        }

        //console.log(b0 + " " + Object.keys(tArr[1][0]));
    });

    socket.on('rotateBitch', function(rot) {
        console.log('rotateBitch');
        if (rot.user == 1) {
            angle1 = rot.angle;
            //direction(rot.user, angle);
        } else if (rot.user == 2) {
            angle2 = rot.angle;
            //direction(rot.user, angle);
        }

    });
});



server.listen(serverPort, function() {
    console.log('server up and running at %s port', serverPort);
});


/////////////////////////////////////////////////
function arrayFunction(userID, newValue, angle) {
    // everytime you get in this function, shift the old array of userID to make place for the new value
    toFilterDataset[userID].shift();

    // function for Kalman filter; make a lineair algoritm to average the RSSI values
    toFilterDataset[userID].push(calculateDistance(newValue));
    oldDistances[userID] = toFilterDataset[userID].map(function(v) {
        return kf.filter(v, 1);
    });
    //console.log(oldDistances[1]);
    io.sockets.emit('value', {
            movement: userID,
            value: oldDistances[userID].last()
        })
        // when it's not a duplicate value (because it's impossible to receive duplicates with floats, unless somethings wrong)
    if (oldDistance != newValue) {
        if (move) {
            //when the drone is close to both users, shutdown, cuz it should be impossible
            //when the drone is closer than or equal to 1 to user1 change bool
            //  console.log("inside move");
            if (playerBubble1 && oldDistances[1].last() < oldDistances[2].last()) {
                if (movement == "player2") {
                    move = false;
                    console.log("inside player1 stop - " + movement)
                    direction(userID, angle1);
                }
                movement = "player1";
                //  console.log("inside player1 move - " + movement)

                io.sockets.emit('droneMovement', {
                    movement: movement
                });
            }
            //when the drone is closer than or equal to 1 to user2 change bool
            else if (playerBubble2 && oldDistances[1].last() > oldDistances[2].last()) {
                if (movement == "player1") {
                    move = false;
                    console.log("inside player2 stop - " + movement)
                    direction(userID, angle2);
                }
                //console.log("inside player2 move - " + movement)

                movement = "player2";

                io.sockets.emit('droneMovement', {
                    movement: movement
                });
            }
            //            console.log("end of move")

            oldDistance = newValue;
            prevMovement = movement;

        } else {
            //  console.log("inside else")
            if (movement == "player1") {
                direction(userID, angle1);
            } else if (movement == "player2") {
                direction(userID, angle2);
            }

        }
    }
}
////////////////////////////////////////////////////
function direction(userID, angle) {
    var r = 3;
    console.log(angle);
    var threeSix = 18;
    if (angle1 != prevAngle &&  angle2 != prevAngle) {
        if (angle >= 30 && angle <= 180) {
            console.log('ROTATE ' + angle + " - " + userID + "left");
            io.sockets.emit('droneMovement', {
                movement: "rotation",
                rotateDirection: threeSix + r
            });
            move = true;
        } else if (angle <= 340 && angle > 200) {
            console.log('ROTATE ' + angle + " - " + userID + "right");

            io.sockets.emit('droneMovement', {
                movement: "rotation",
                rotateDirection: threeSix - r
            });
            move = true;
        } else if (angle < 30 || angle > 340) {
            console.log('ROTATE ' + angle + " - " + userID + "straight");

            io.sockets.emit('droneMovement', {
                movement: "rotation",
                rotateDirection: threeSix
            });
            move = true;
        }
    }
    prevAngle = angle;
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

    var txPower = -58 //hard coded power value. Usually ranges between -59 to -65

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
