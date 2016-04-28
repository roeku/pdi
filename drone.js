'use strict';
var Bleacon = require('bleacon');

var keypress = require('keypress');
var Drone = require('rolling-spider');

var ACTIVE = true;
var STEPS = 20;
var firstPlayer;
var secondPlayer;
var closeToUser = false;
var farFromUser = false;
var motion = true;
var stop = false;
var movement = true;
var prevMovement = false;
var move = false;
var leftTurn = 0;
var rightTurn = 0;

var io = require('socket.io-client'),
    socket = io.connect('https://donmezfurkan.com:3000');
process.setMaxListeners(0);
// make `process.stdin` begin emitting 'keypress' events
keypress(process.stdin);
// listen for the 'keypress' event

process.stdin.setRawMode(true);
process.stdin.resume();

Bleacon.on('discover', function(bleacon) {
    console.log(bleacon.major);
    var BLEdistance = bleacon.accuracy + "m";
    console.log(BLEdistance);
});

socket.on('connect', function() {
    console.log("socket connected");

});

socket.on('startDrone', function(l) {
    if (l.startDrone) {
        d.takeOff();
    }
});

socket.on('emergency', function(l) {
    if (l.emergency) {
        d.land();
    }
});

socket.on('droneShutdown', function(shutdown) {
    if (shutdown.shutdown) {
        console.log("shutdown");
        //cooldown();
        d.land();
    }
});

// adjust movement bool to correct value
socket.on('droneMovement', function(s) {
    //
    // if (prevMovement != s.movement) {
    //     move = false;
    //     socket.emit('move', {
    //         move: move
    //     });
    // }
    movement = s.movement;

    // keep the drone moving in a certain direction until the bool changes. Only move the drone afer activation
    if (movement == "forward" && ACTIVE) {
        // TODO: incremental increase of steps and speed
        d.forward({
            speed: 100,
            steps: 20
        });
        console.log('forward');
    } else if (movement == "backward" && ACTIVE) {
        d.backward({
            speed: 100,
            steps: 20
        });
        console.log('backward');
    } else if (movement == "rotation" && s.rotateDirection == "left" && ACTIVE) {
        d.turnRight({
            speed: 100,
            steps: s.rotateValue
        });
        rightTurn++;
        console.log('rotate right' + rightTurn);
        //cooldown();
    } else if (movement == "rotation" && s.rotateDirection == "right" && ACTIVE) {
        d.turnLeft({
            speed: 100,
            steps: s.rotateValue
        });
        leftTurn++;
        console.log('rotate left' + leftTurn);
    }
    prevMovement = movement;
});


var ACTIVE = true;
var STEPS = 20;


function cooldown() {
    ACTIVE = false;
    setTimeout(function() {
        ACTIVE = true;
    }, STEPS * 12);
}

if (process.env.UUID) {
    console.log('Searching for ', process.env.UUID);
}

var d = new Drone(process.env.UUID);

d.connect(function() {
    d.setup(function() {
        console.log('Configured for Rolling Spider! ', d.name);
        d.flatTrim();
        d.startPing();
        d.flatTrim();

        d.on('battery', function() {
            console.log('Battery: ' + d.status.battery + '%');
            d.signalStrength(function(err, val) {
                console.log('Signal: ' + val + 'dBm');
            });

        });

        d.on('stateChange', function() {
            console.log(d.status.flying ? "-- flying" : "-- down");
        })
        setTimeout(function() {
            console.log('ready for flight');
            ACTIVE = true;
        }, 1000);

    });
});

process.stdin.on('keypress', function(ch, key) {
    if (ACTIVE && key) {
        if (key.name === 'm') {
            d.emergency();
            setTimeout(function() {
                process.exit();
            }, 3000);
        } else if (key.name === 'p') {
            //  stopDrone = false;
        } else if (key.name === 't') {
            console.log('takeoff');
            d.takeOff();

        } else if (key.name === 'z') {
            d.forward({
                steps: STEPS
            });
            cooldown();
        } else if (key.name === 's') {
            d.backward({
                steps: STEPS
            });
            cooldown();
        } else if (key.name === 'left') {
            d.turnLeft({
                steps: STEPS
            });
            cooldown();
        } else if (key.name === 'q') {
            d.tiltLeft({
                steps: STEPS
            });
            cooldown();
        } else if (key.name === 'd') {
            d.tiltRight({
                steps: STEPS
            });
            cooldown();
        } else if (key.name === 'right') {
            d.turnRight({
                steps: STEPS
            });
            cooldown();
        } else if (key.name === 'up') {
            d.up({
                steps: STEPS * 2.5
            });
            cooldown();
        } else if (key.name === 'down') {
            d.down({
                steps: STEPS * 2.5
            });
            cooldown();
        } else if (key.name === 'i' || key.name === 'f') {
            d.frontFlip({
                steps: STEPS
            });
            cooldown();
        } else if (key.name === 'j') {
            d.leftFlip({
                steps: STEPS
            });
            cooldown();
        } else if (key.name === 'h') {
            d.rightFlip({
                steps: STEPS
            });
            cooldown();
        } else if (key.name === 'k') {
            d.backFlip({
                steps: STEPS
            });
            cooldown();
        } else if (key.name === 'l') {
            console.log('Initiated Landing Sequence...');
            d.land();
            //      setTimeout(function () {
            //        process.exit();
            //      }, 3000);
        }
    }
    if (key && key.ctrl && key.name === 'c') {
        process.stdin.pause();
        process.exit();
    }
});



//launch();
