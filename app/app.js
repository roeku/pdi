// JavaScript code for the BLE Scan example app.

// Application object.
var app = {};
var user = 0;
var move = false;
var arrLocation = [];
var arrLocation0 = [];
var arrLocation1 = [];
var N = 0;
var arrPosition = 0;
var arraPosition = 0;
var readBeacon = false;
var obj = [];
var prevX = 0;
var prevY = 0;
var rotation = false;
var droneLeft = false;
var droneRight = false;
var droneStraight = true;
var rssiV = 10;

function beacon() {
    $('.beaconNumber').html(JSON.stringify(data));
};

function add(address, rssi, array) {
    var found = arrLocation.some(function(el) {
        return el.address === address;
    });
    if (!found) {
        arrLocation.push({
            [address]: rssi
        });
    }
    var t0 = arrLocation[0];
    var t1 = arrLocation[1];
    var t2 = arrLocation[2];
    obj = Object.assign(t0, t1, t2);

}
// Globals.
var sprite = null
var shouldVibrate = false
var blockVibrate = false


function initialise() {
    initialiseAccelerometer()
}

function initialiseAccelerometer() {
    function onSuccess(acceleration) {
        accelerometerHandler(acceleration.x, acceleration.y)
    }

    function onError(error) {
        $('.spriteValue').html('Accelerometer error: ' + error)
    }
    navigator.accelerometer.watchAcceleration(
        onSuccess,
        onError, {
            frequency: 50
        })
}

function accelerometerHandler(accelerationX, accelerationY) {
    var dx = accelerationX * -10
    var dy = accelerationY * -10

    var x = 100 + dx
    var y = 50 - dy
    x = Math.min(x, 200)
    x = Math.max(x, 0)
    y = Math.min(y, 100)
    y = Math.max(y, 0)

    newMovement(x, y)
        //$('.spriteValue').html(x + " " + y);
}

function newMovement(x, y) {

    socket.emit('rotate', {
        user: user,
        x: x,
        y: y
    });

}

document.addEventListener(
    'deviceready',
    function() {
        evothings.scriptsLoaded(initialise)
    },
    false);

// Device list.
app.devices = {};

// UI methods.
app.ui = {};

// Timer that updates the device list and removes inactive
// devices in case no devices are found by scan.
app.ui.updateTimer = null;

app.initialize = function() {
    document.addEventListener(
        'deviceready',
        function() {
            evothings.scriptsLoaded(app.onDeviceReady)
        },
        false);
};

app.onDeviceReady = function() {

    // Not used.
    // Here you can update the UI to say that
    // the device (the phone/tablet) is ready
    // to use BLE and other Cordova functions.
};

// Start the scan. Call the callback function when a device is found.
// Format:
//   callbackFun(deviceInfo, errorCode)
//   deviceInfo: address, rssi, name
//   errorCode: String
app.startScan = function(callbackFun) {
    app.stopScan();

    evothings.ble.startScan(
        function(device) {
            // Report success. Sometimes an RSSI of +127 is reported.
            // We filter out these values here.
            if (device.rssi <= 0) {
                callbackFun(device, null);

            }
        },
        function(errorCode) {
            // Report error.
            callbackFun(null, errorCode);
        }
    );
};

// Stop scanning for devices.
app.stopScan = function() {
    evothings.ble.stopScan();
};

// Called when Start Scan button is selected.
app.ui.onStartScanButton = function() {
    app.startScan(app.ui.deviceFound);
    app.ui.displayStatus('Scanning...');
    app.ui.updateTimer = setInterval(app.ui.displayDeviceList, 250);
};

// Called when Stop Scan button is selected.
app.ui.onStopScanButton = function() {
    app.stopScan();
    app.devices = {};
    app.ui.displayStatus('Scan Paused');
    app.ui.displayDeviceList();
    clearInterval(app.ui.updateTimer);
};

// Called when a device is found.
app.ui.deviceFound = function(device, errorCode) {
    if (device) {
        // Set timestamp for device (this is used to remove
        // inactive devices).
        device.timeStamp = Date.now();

        // Insert the device into table of found devices.
        app.devices[device.address] = device;

    } else if (errorCode) {
        app.ui.displayStatus('Scan Error: ' + errorCode);
    }
};

// Display the device list.
app.ui.displayDeviceList = function() {
    // Clear device list.
    $('#found-devices').empty();

    var timeNow = Date.now();

    $.each(app.devices, function(key, device) {
        // Only show devices that are updated during the last 10 seconds.
        if (device.timeStamp + 10000 > timeNow) {

            // Map the RSSI value to a width in percent for the indicator.
            var rssiWidth = 100; // Used when RSSI is zero or greater.
            if (device.rssi < -100) {
                rssiWidth = 0;
            } else if (device.rssi < 0) {
                rssiWidth = 100 + device.rssi;
            }

            // Create tag for device data.
            var element = $(
                '<li>' + '<strong>' + device.name + '</strong><br />'
                // Do not show address on iOS since it can be confused
                // with an iBeacon UUID.
                + (evothings.os.isIOS() ? '' : device.address + '<br />') + device.rssi + '<br />' + '<div style="background:rgb(225,0,0);height:20px;width:' + rssiWidth + '%;"></div>' + '</li>'
            );

            //var arrLocationN = arrLocation[N];
            if (readBeacon && arrLocation.length < 4 && N < 4) {

                add(device.address, device.rssi, N);

                $('.beaconNumber').html(obj + JSON.stringify(arrLocation));
                socket.emit('beaconPositions', {
                    arr: obj
                });
                //readBeacon = false;
            } else if (arrLocation.length >= 3) {
                N++;
                $('.beaconNumber').html(JSON.stringify(obj));
                readBeacon = false;
            } else if (readBeacon && N == 4) {
                $('.beaconNumber').html("Completed");
                socket.emit('beaconPositions', {
                    arr: arrLocation
                });
                readBeacon = false;
            } else {
                $('.beaconNumber').html(obj);

            }

            if (device.name == "Mars_141305") {
                socket.emit('values', {
                    user: user,
                    value: device.rssi
                });
                rssiV = Math.abs(device.rssi);

                var canvas = document.getElementById('myCanvas');
                var context = canvas.getContext('2d');
                var centerX = canvas.width / 2;
                var centerY = canvas.height / 2;
                var radius = rssiV;

                context.clearRect(0, 0, canvas.width, canvas.height);
                context.beginPath();
                context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
                context.fillStyle = 'red';
                context.fill();

            }
            $('#found-devices').append(element);

        }
    });
};

// Display a status message
app.ui.displayStatus = function(message) {
    $('#scan-status').html(message);
};

// add new last() method:
if (!Array.prototype.last) {
    Array.prototype.last = function() {
        return this[this.length - 1];
    };


    app.initialize();

};
