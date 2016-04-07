# pdi

Node.js server for PDI

- Receives data (userID, rssiValues) from multiple devices(Android, iPhone)
- Converts the RSSI to meters
- Pushes it into an array
- Filters the data using a Kalman filter
- Emits a movement bool to the drone control
