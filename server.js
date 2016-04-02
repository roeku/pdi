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

var movement = null;
var size = 0;
var oldDistances = createArray(3,10);
var toFilterDataset = createArray(3,10);
var oldDistance;

// rotation
var droneLeft = false;
var droneRight = false;
var droneStraight = false;

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', function(socket) {
  console.log('new connection');
  socket.on('userchange', function(u) {
    console.log(u);
    console.log(oldDistances);
  })
  socket.on('values', function(p) {
    //console.log(p);
      arrayFunction(p.user, p.value);
  });
});

server.listen(serverPort, function() {
  console.log('server up and running at %s port', serverPort);
});

  function arrayFunction(userID, newValue) {
  // everytime you get in this function, shift the old array of userID to make place for the new value
     toFilterDataset[userID].shift();

  // function for Kalman filter; make a lineair algoritm to average the RSSI values
    toFilterDataset[userID].push(calculateDistance(newValue));
    oldDistances[userID] = toFilterDataset[userID].map(function(v) {
      return kf.filter(v,1);
    });
  // when it's not a duplicate value (because it's impossible to receive duplicates with floats, unless somethings wrong)
    if (oldDistance != newValue) {
      console.log(userID);
      //when the drone is close to both users, shutdown, cuz it should be impossible

      //when the drone is closer than or equal to 1 to user1 change bool
      if (oldDistances[userID].last() <= 1.5 && userID == 1) {
        movement = false;
        io.sockets.emit('droneMovement', {
          movement: movement
        });
        console.log(movement);

      }
      //when the drone is closer than or equal to 1 to user2 change bool
      else if (oldDistances[userID].last() <= 1 && userID == 2) {
        movement = true;
        io.sockets.emit('droneMovement', {
          movement: movement
        });
        console.log(movement);

      } else {
        io.sockets.emit('droneMovement',{
          movement: movement
        });
        console.log(movement);

      }
    }
      oldDistance = newValue;
}
// add new last() method:
if (!Array.prototype.last){
    Array.prototype.last = function(){
        return this[this.length - 1];
    };
};

// array generator
function createArray(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = createArray.apply(this, args);
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
