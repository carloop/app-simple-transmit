#include "application.h"
#include "carloop/carloop.h"

// Don't block the main program while connecting to WiFi/cellular.
// This way the main program runs on the Carloop even outside of WiFi range.
SYSTEM_THREAD(ENABLED);

Carloop<CarloopRevision2> carloop;

void setup() {
  // Configure the CAN bus speed for 500 kbps, the standard speed for the OBD-II port.
  // Other common speeds are 250 kbps and 1 Mbps.
  // If you don't call setCANSpeed, 500 kbps is used.
  carloop.setCANSpeed(500000);

  // Connect to the CAN bus
  carloop.begin();
}

unsigned long lastTransmitTime = 0;
const unsigned long transmitInterval = 100; /* ms */
  
void loop() {
  // Send a message at a regular time interval
  unsigned long now = millis();
  if (now - lastTransmitTime > transmitInterval) {
    CANMessage message;

    // A CAN message has an ID that identifies the content inside
    message.id = 0x123;

    // It can have from 0 to 8 data bytes
    message.len = 8;

    // Pass the data to be transmitted in the data array
    message.data[0] = 10;
    message.data[1] = 20;
    message.data[2] = 30;
    message.data[3] = 40;

    // You can of course pass dynamic data
    message.data[4] = (uint8_t)(now >> 24);
    message.data[5] = (uint8_t)(now >> 16);
    message.data[6] = (uint8_t)(now >> 8);
    message.data[7] = (uint8_t)(now);

    // Send the message on the bus!
    carloop.can().transmit(message);

    lastTransmitTime = now;
  }
}
