#include "application.h"
#include "carloop/carloop.h"

// Don't block the main program while connecting to WiFi/cellular.
// This way the main program runs on the Carloop even outside of WiFi range.
SYSTEM_THREAD(ENABLED);

// Tell the program which revision of Carloop you are using.
Carloop<CarloopRevision2> carloop;

void setup() {
  // Configure the CAN bus speed for 500 kbps, the standard speed for the OBD-II port.
  // Other common speeds are 250 kbps and 1 Mbps.
  // If you don't call setCANSpeed, 500 kbps is used.
  carloop.setCANSpeed(500000);

  // Connect to the CAN bus
  carloop.begin();
}

// All the parameter for transmitting the message
uint32_t transmitInterval = 100; /* ms */
  
void loop() {
  // Send a message at a regular time interval
  static uint32_t lastTransmitTime = 0;
  uint32_t now = millis();
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
    message.data[4] = 50;
    message.data[5] = 60;
    message.data[6] = 70;
    message.data[7] = 80;

    // Send the message on the bus!
    carloop.can().transmit(message);

    lastTransmitTime = now;
  }
}
