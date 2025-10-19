# Miles Booking ESP32 Smart Display - Implementation Guide

This guide provides a complete implementation plan for ESP32-based smart displays that show meeting room status and allow booking directly from the room.

## 🎯 Features

### Display Modes
- **Available**: Green screen with QR code for quick booking
- **Occupied**: Red screen with current meeting details and countdown
- **Upcoming**: Yellow screen showing next meeting
- **Touch Interface**: Simple booking interface

### Core Functionality
- Real-time room status updates
- Current booking display with countdown timer
- Next meeting preview
- QR code for mobile booking
- Touch-to-book interface
- WiFi configuration portal
- OTA (Over-the-Air) updates

### Hardware Support
- TFT displays (ILI9341, ST7789)
- Touch screen support
- RGB LED status indicator
- Buzzer for notifications
- Low power mode

## 🔧 Hardware Requirements

### Minimum Setup (~$15 total)
- ESP32 DevKit (NodeMCU-32S or similar) - $5
- 2.8" TFT LCD ILI9341 with touch - $8
- USB cable and 5V power supply - $2

### Recommended Setup (~$25 total)
- ESP32-WROVER with more RAM - $8
- 3.5" TFT LCD ILI9341 with touch - $12
- WS2812B RGB LED ring - $2
- 3D printed enclosure - $3

### Professional Setup (~$50 total)
- ESP32-S3 with WiFi 6 - $12
- 4.3" Capacitive touch display - $25
- Custom PCB - $8
- Laser-cut acrylic enclosure - $5

## 🔒 Type Safety

Generate C++ types from OpenAPI using a Python script:

```
Backend OpenAPI Spec → Python Generator → C++ Headers
     (api/openapi.yaml)    (codegen.py)       (types.h)
```

## 📦 Project Structure

```
display/
├── src/
│   ├── main.cpp              # Main application
│   ├── api/
│   │   ├── client.h          # HTTP client
│   │   ├── client.cpp
│   │   └── types.h           # ⭐ Generated types
│   ├── ui/
│   │   ├── screens.h         # UI screens
│   │   ├── screens.cpp
│   │   └── touch.cpp         # Touch handling
│   ├── config/
│   │   ├── wifi.h
│   │   └── wifi.cpp
│   └── utils/
│       ├── qrcode.h
│       └── qrcode.cpp
├── scripts/
│   ├── generate_types.py     # OpenAPI → C++ generator
│   └── flash.sh
├── lib/                      # Dependencies
│   ├── TFT_eSPI/
│   ├── ArduinoJson/
│   └── QRCode/
├── platformio.ini            # PlatformIO configuration
└── README.md
```

## 🚀 Step-by-Step Implementation

### Step 1: Setup PlatformIO

```bash
# Install PlatformIO
pip install platformio

# Create project
mkdir display && cd display
pio init --board esp32dev
```

### Step 2: Configure platformio.ini

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino

lib_deps =
    bodmer/TFT_eSPI@^2.5.0
    bblanchon/ArduinoJson@^6.21.0
    ricmoo/QRCode@^0.0.1
    tzapu/WiFiManager@^2.0.16

build_flags =
    -DUSER_SETUP_LOADED=1
    -DILI9341_DRIVER=1
    -DTFT_WIDTH=240
    -DTFT_HEIGHT=320
    -DTFT_MISO=19
    -DTFT_MOSI=23
    -DTFT_SCLK=18
    -DTFT_CS=15
    -DTFT_DC=2
    -DTFT_RST=4
    -DTOUCH_CS=21
    -DLOAD_GLCD=1
    -DLOAD_FONT2=1
    -DLOAD_FONT4=1
    -DLOAD_FONT6=1
    -DLOAD_FONT7=1
    -DLOAD_FONT8=1
    -DSPI_FREQUENCY=40000000
    -DSPI_READ_FREQUENCY=20000000

monitor_speed = 115200
```

### Step 3: Generate C++ Types from OpenAPI

`scripts/generate_types.py`:

```python
#!/usr/bin/env python3
import yaml
import sys
from datetime import datetime

def convert_type(openapi_type: str, format: str = None) -> str:
    """Convert OpenAPI type to C++ type"""
    type_map = {
        'string': 'String',
        'integer': 'int',
        'number': 'float',
        'boolean': 'bool',
    }

    if format == 'date-time':
        return 'time_t'

    return type_map.get(openapi_type, 'String')

def generate_struct(name: str, properties: dict) -> str:
    """Generate C++ struct from OpenAPI schema"""
    cpp = f"struct {name} {{\n"

    for prop_name, prop_def in properties.items():
        cpp_type = convert_type(
            prop_def.get('type', 'string'),
            prop_def.get('format')
        )
        cpp += f"    {cpp_type} {prop_name};\n"

    cpp += "};\n\n"
    return cpp

def main():
    # Load OpenAPI spec
    with open('../api/openapi.yaml', 'r') as f:
        spec = yaml.safe_load(f)

    # Generate header file
    output = f"""// Generated from OpenAPI spec - DO NOT EDIT
// Generated at {datetime.now().isoformat()}

#ifndef MILES_API_TYPES_H
#define MILES_API_TYPES_H

#include <Arduino.h>

namespace miles {{

"""

    # Generate structs for main types
    schemas = spec['components']['schemas']

    for schema_name in ['Booking', 'Room', 'Location']:
        if schema_name in schemas:
            schema = schemas[schema_name]
            if 'properties' in schema:
                output += generate_struct(schema_name, schema['properties'])

    # Generate enums
    if 'BookingStatus' in schemas:
        output += """enum class BookingStatus {
    PENDING,
    CONFIRMED,
    CANCELLED
};

"""

    output += """} // namespace miles

#endif // MILES_API_TYPES_H
"""

    # Write output
    with open('src/api/types.h', 'w') as f:
        f.write(output)

    print("✓ Generated src/api/types.h")

if __name__ == '__main__':
    main()
```

Make it executable and run:

```bash
chmod +x scripts/generate_types.py
pip install pyyaml
python scripts/generate_types.py
```

### Step 4: Implement API Client

`src/api/client.h`:

```cpp
#ifndef MILES_API_CLIENT_H
#define MILES_API_CLIENT_H

#include <Arduino.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "types.h"

namespace miles {

class ApiClient {
public:
    ApiClient(const String& baseURL);

    // Get current booking for room
    bool getCurrentBooking(const String& roomId, Booking& booking);

    // Get upcoming bookings
    bool getUpcomingBookings(const String& roomId, Booking bookings[], int& count);

    // Create booking (simple version)
    bool createBooking(
        const String& roomId,
        const String& title,
        time_t startTime,
        time_t endTime
    );

private:
    String baseURL;
    HTTPClient http;

    bool sendRequest(
        const String& method,
        const String& path,
        const String& body,
        String& response
    );
};

} // namespace miles

#endif
```

`src/api/client.cpp`:

```cpp
#include "client.h"

namespace miles {

ApiClient::ApiClient(const String& baseURL) : baseURL(baseURL) {}

bool ApiClient::getCurrentBooking(const String& roomId, Booking& booking) {
    String response;
    String path = "/api/rooms/" + roomId + "/current-booking";

    if (!sendRequest("GET", path, "", response)) {
        return false;
    }

    // Parse JSON using ArduinoJson
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, response);

    if (error) {
        Serial.println("Failed to parse booking JSON");
        return false;
    }

    // Map JSON to Booking struct
    booking.id = doc["id"].as<String>();
    booking.title = doc["title"].as<String>();
    booking.startTime = doc["startTime"].as<time_t>();
    booking.endTime = doc["endTime"].as<time_t>();
    booking.userId = doc["userId"].as<String>();

    return true;
}

bool ApiClient::createBooking(
    const String& roomId,
    const String& title,
    time_t startTime,
    time_t endTime
) {
    // Create JSON body
    StaticJsonDocument<512> doc;
    doc["roomId"] = roomId;
    doc["title"] = title;
    doc["startTime"] = startTime;
    doc["endTime"] = endTime;

    String body;
    serializeJson(doc, body);

    String response;
    return sendRequest("POST", "/api/bookings", body, response);
}

bool ApiClient::sendRequest(
    const String& method,
    const String& path,
    const String& body,
    String& response
) {
    http.begin(baseURL + path);
    http.addHeader("Content-Type", "application/json");

    int httpCode = -1;

    if (method == "GET") {
        httpCode = http.GET();
    } else if (method == "POST") {
        httpCode = http.POST(body);
    }

    if (httpCode > 0) {
        response = http.getString();
        http.end();
        return httpCode == 200 || httpCode == 201;
    }

    http.end();
    return false;
}

} // namespace miles
```

### Step 5: Implement UI Screens

`src/ui/screens.h`:

```cpp
#ifndef MILES_UI_SCREENS_H
#define MILES_UI_SCREENS_H

#include <TFT_eSPI.h>
#include "../api/types.h"

namespace miles {
namespace ui {

// Color scheme
const uint16_t COLOR_AVAILABLE = TFT_GREEN;
const uint16_t COLOR_OCCUPIED = TFT_RED;
const uint16_t COLOR_UPCOMING = TFT_YELLOW;
const uint16_t COLOR_TEXT = TFT_WHITE;
const uint16_t COLOR_BG = TFT_BLACK;

class Display {
public:
    Display(TFT_eSPI& tft);

    void init();
    void showAvailable(const String& roomName);
    void showOccupied(const Booking& booking, int minutesLeft);
    void showUpcoming(const Booking& booking, int minutesUntil);
    void showQRCode(const String& url);
    void showError(const String& message);

private:
    TFT_eSPI& tft;

    void clearScreen(uint16_t color);
    void drawCenteredText(const String& text, int y, int size, uint16_t color);
    void drawCountdown(int minutes);
};

}} // namespace miles::ui

#endif
```

`src/ui/screens.cpp`:

```cpp
#include "screens.h"
#include <qrcode.h>

namespace miles {
namespace ui {

Display::Display(TFT_eSPI& tft) : tft(tft) {}

void Display::init() {
    tft.init();
    tft.setRotation(1);  // Landscape
    tft.fillScreen(TFT_BLACK);
}

void Display::showAvailable(const String& roomName) {
    clearScreen(COLOR_AVAILABLE);

    // Room name
    tft.setTextColor(COLOR_TEXT);
    tft.setTextSize(3);
    tft.setCursor(10, 20);
    tft.println(roomName);

    // Status
    tft.setTextSize(4);
    drawCenteredText("AVAILABLE", 100, 4, COLOR_TEXT);

    // Instructions
    tft.setTextSize(2);
    drawCenteredText("Touch to book", 180, 2, COLOR_TEXT);
    drawCenteredText("or scan QR code", 210, 2, COLOR_TEXT);
}

void Display::showOccupied(const Booking& booking, int minutesLeft) {
    clearScreen(COLOR_OCCUPIED);

    // Status
    tft.setTextSize(3);
    drawCenteredText("OCCUPIED", 20, 3, COLOR_TEXT);

    // Meeting title
    tft.setTextSize(2);
    drawCenteredText(booking.title, 80, 2, COLOR_TEXT);

    // Countdown
    drawCountdown(minutesLeft);

    // End time
    char timeStr[20];
    struct tm* timeinfo = localtime(&booking.endTime);
    strftime(timeStr, sizeof(timeStr), "Until %H:%M", timeinfo);
    drawCenteredText(String(timeStr), 200, 2, COLOR_TEXT);
}

void Display::showUpcoming(const Booking& booking, int minutesUntil) {
    clearScreen(COLOR_UPCOMING);

    tft.setTextSize(3);
    drawCenteredText("UPCOMING", 20, 3, COLOR_TEXT);

    tft.setTextSize(2);
    drawCenteredText(booking.title, 80, 2, COLOR_TEXT);

    String startMsg = "Starts in " + String(minutesUntil) + " min";
    drawCenteredText(startMsg, 140, 2, COLOR_TEXT);
}

void Display::showQRCode(const String& url) {
    // Generate QR code
    QRCode qrcode;
    uint8_t qrcodeData[qrcode_getBufferSize(3)];
    qrcode_initText(&qrcode, qrcodeData, 3, 0, url.c_str());

    // Draw QR code
    int scale = 8;
    int offsetX = (tft.width() - qrcode.size * scale) / 2;
    int offsetY = 250;

    for (uint8_t y = 0; y < qrcode.size; y++) {
        for (uint8_t x = 0; x < qrcode.size; x++) {
            if (qrcode_getModule(&qrcode, x, y)) {
                tft.fillRect(
                    offsetX + x * scale,
                    offsetY + y * scale,
                    scale,
                    scale,
                    TFT_BLACK
                );
            }
        }
    }
}

void Display::drawCountdown(int minutes) {
    // Large countdown timer
    tft.setTextSize(6);

    String timeStr;
    if (minutes >= 60) {
        int hours = minutes / 60;
        int mins = minutes % 60;
        timeStr = String(hours) + "h " + String(mins) + "m";
    } else {
        timeStr = String(minutes) + " min";
    }

    drawCenteredText(timeStr, 120, 6, COLOR_TEXT);
}

void Display::clearScreen(uint16_t color) {
    tft.fillScreen(color);
}

void Display::drawCenteredText(
    const String& text,
    int y,
    int size,
    uint16_t color
) {
    tft.setTextSize(size);
    tft.setTextColor(color);

    int16_t x1, y1;
    uint16_t w, h;
    tft.getTextBounds(text, 0, 0, &x1, &y1, &w, &h);

    int x = (tft.width() - w) / 2;
    tft.setCursor(x, y);
    tft.println(text);
}

void Display::showError(const String& message) {
    clearScreen(TFT_RED);
    tft.setTextSize(2);
    drawCenteredText("ERROR", 100, 3, COLOR_TEXT);
    drawCenteredText(message, 150, 2, COLOR_TEXT);
}

}} // namespace miles::ui
```

### Step 6: Main Application Logic

`src/main.cpp`:

```cpp
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <TFT_eSPI.h>
#include "api/client.h"
#include "ui/screens.h"

// Configuration
const String API_URL = "http://192.168.1.100:3000";  // Change to your API
const String ROOM_ID = "ROOM_ESP32_01";  // Set unique ID per device

// Globals
TFT_eSPI tft = TFT_eSPI();
miles::ApiClient* apiClient;
miles::ui::Display* display;

// State
miles::Booking currentBooking;
bool hasCurrentBooking = false;
unsigned long lastUpdate = 0;
const unsigned long UPDATE_INTERVAL = 30000;  // 30 seconds

void setup() {
    Serial.begin(115200);
    Serial.println("Miles Room Display Starting...");

    // Initialize display
    display = new miles::ui::Display(tft);
    display->init();
    display->showError("Connecting to WiFi...");

    // Setup WiFi
    WiFiManager wifiManager;
    wifiManager.setAPCallback([](WiFiManager* mgr) {
        Serial.println("Entered config mode");
        display->showError("Connect to WiFi: MilesDisplay");
    });

    if (!wifiManager.autoConnect("MilesDisplay")) {
        Serial.println("Failed to connect");
        ESP.restart();
    }

    Serial.println("Connected to WiFi");
    display->showError("Connected! Loading...");

    // Initialize API client
    apiClient = new miles::ApiClient(API_URL);

    // Initial update
    updateRoomStatus();
}

void loop() {
    unsigned long now = millis();

    // Update room status periodically
    if (now - lastUpdate > UPDATE_INTERVAL) {
        updateRoomStatus();
        lastUpdate = now;
    }

    // Check for touch input
    handleTouch();

    delay(100);
}

void updateRoomStatus() {
    Serial.println("Updating room status...");

    // Get current booking
    hasCurrentBooking = apiClient->getCurrentBooking(ROOM_ID, currentBooking);

    if (hasCurrentBooking) {
        // Calculate time left
        time_t now = time(nullptr);
        int minutesLeft = (currentBooking.endTime - now) / 60;

        if (minutesLeft > 0) {
            display->showOccupied(currentBooking, minutesLeft);
        } else {
            hasCurrentBooking = false;
            showAvailableScreen();
        }
    } else {
        showAvailableScreen();
    }
}

void showAvailableScreen() {
    display->showAvailable("Conference Room A");
    String qrUrl = API_URL + "/book?room=" + ROOM_ID;
    display->showQRCode(qrUrl);
}

void handleTouch() {
    uint16_t x, y;
    if (tft.getTouch(&x, &y)) {
        Serial.printf("Touch at: %d, %d\n", x, y);

        if (!hasCurrentBooking) {
            // Quick book for 30 minutes
            time_t now = time(nullptr);
            time_t endTime = now + (30 * 60);

            display->showError("Creating booking...");

            if (apiClient->createBooking(ROOM_ID, "Ad-hoc Meeting", now, endTime)) {
                display->showError("Booked!");
                delay(2000);
                updateRoomStatus();
            } else {
                display->showError("Booking failed!");
                delay(2000);
                showAvailableScreen();
            }
        }

        delay(300);  // Debounce
    }
}
```

### Step 7: WiFi Configuration

Add captive portal for easy WiFi setup:

```cpp
void setupWiFiConfig() {
    WiFiManager wifiManager;

    // Set custom parameters
    WiFiManagerParameter custom_api_url(
        "api_url",
        "API URL",
        API_URL.c_str(),
        40
    );
    WiFiManagerParameter custom_room_id(
        "room_id",
        "Room ID",
        ROOM_ID.c_str(),
        20
    );

    wifiManager.addParameter(&custom_api_url);
    wifiManager.addParameter(&custom_room_id);

    // Start config portal
    wifiManager.startConfigPortal("MilesDisplay");

    // Save custom parameters
    // TODO: Save to SPIFFS/preferences
}
```

### Step 8: Build and Flash

```bash
# Build
pio run

# Flash to ESP32
pio run --target upload

# Monitor serial output
pio device monitor
```

## 🎨 Advanced Features

### 1. RGB LED Status Indicator

```cpp
#include <Adafruit_NeoPixel.h>

Adafruit_NeoPixel pixels(1, LED_PIN, NEO_GRB + NEO_KHZ800);

void setStatusLED(uint32_t color) {
    pixels.setPixelColor(0, color);
    pixels.show();
}

// In updateRoomStatus():
if (hasCurrentBooking) {
    setStatusLED(pixels.Color(255, 0, 0));  // Red
} else {
    setStatusLED(pixels.Color(0, 255, 0));  // Green
}
```

### 2. OTA Updates

```cpp
#include <ArduinoOTA.h>

void setupOTA() {
    ArduinoOTA.setHostname("miles-display");

    ArduinoOTA.onStart([]() {
        display->showError("Updating firmware...");
    });

    ArduinoOTA.onEnd([]() {
        display->showError("Update complete!");
    });

    ArduinoOTA.onError([](ota_error_t error) {
        display->showError("Update failed!");
    });

    ArduinoOTA.begin();
}

// In loop():
ArduinoOTA.handle();
```

### 3. Deep Sleep Mode

```cpp
void enterSleepMode() {
    // Turn off display
    tft.writecommand(ILI9341_DISPOFF);

    // Set wake up timer for 5 minutes
    esp_sleep_enable_timer_wakeup(5 * 60 * 1000000);

    // Enter deep sleep
    esp_deep_sleep_start();
}
```

### 4. NFC/RFID Integration

```cpp
#include <MFRC522.h>

MFRC522 rfid(SS_PIN, RST_PIN);

void checkRFID() {
    if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
        String uid = getCardUID();
        String username = getUserFromRFID(uid);

        // Quick book for this user
        quickBook(username);
    }
}
```

## 📊 Power Consumption

- **Active display**: ~200mA @ 5V = 1W
- **Sleep mode**: ~10mA @ 5V = 0.05W
- **Daily average** (12h active): ~0.5 kWh/month

## 🔐 Security

1. **API Authentication**:
```cpp
http.addHeader("Authorization", "Bearer " + API_TOKEN);
```

2. **HTTPS Support**:
```cpp
#include <WiFiClientSecure.h>
WiFiClientSecure client;
client.setCACert(rootCA);
```

3. **Encrypted Storage**:
```cpp
#include <Preferences.h>
Preferences prefs;
prefs.begin("miles", false);
prefs.putString("token", API_TOKEN);
```

## 🧪 Testing

1. **Simulator Testing**: Use [Wokwi](https://wokwi.com) for online simulation
2. **Unit Tests**: Use PlatformIO Native testing
3. **Integration**: Test with mock API server

## 📝 3D Printed Enclosure

STL files available at: [Thingiverse/MilesDisplay](https://www.thingiverse.com)

Features:
- Wall-mountable
- Access to USB port
- Cooling vents
- Touch screen cutout

## 💰 Cost Breakdown

| Component | Cost | Quantity | Total |
|-----------|------|----------|-------|
| ESP32 DevKit | $5 | 1 | $5 |
| 2.8" TFT LCD | $8 | 1 | $8 |
| USB Cable | $2 | 1 | $2 |
| 3D Print | $3 | 1 | $3 |
| **Total** | | | **$18** |

## ⏱️ Estimated Implementation Time

- **Hardware Setup**: 1 hour
- **Code Generation** (Steps 1-3): 1 hour
- **API Client** (Step 4): 2 hours
- **UI Implementation** (Steps 5-6): 3 hours
- **Main Logic** (Step 7): 2 hours
- **Testing & Polish**: 2 hours
- **Enclosure**: 2 hours

**Total**: ~13 hours for complete implementation

## 🔗 Resources

- [ESP32 Documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/)
- [TFT_eSPI Library](https://github.com/Bodmer/TFT_eSPI)
- [PlatformIO](https://platformio.org/)
- [ArduinoJson](https://arduinojson.org/)

---

This guide provides everything needed to build production-ready ESP32 smart displays with type-safe communication to the Miles booking system.
