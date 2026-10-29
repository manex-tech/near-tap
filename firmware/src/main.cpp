#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include "secrets.h"

static constexpr uint8_t BUTTON_PIN = 0; // ESP32 onboard BOOT button, active LOW
static constexpr unsigned long DEBOUNCE_MS = 60;
static unsigned long lastEdgeMs = 0;
static bool previousButtonState = HIGH;

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(TAP_WIFI_SSID, TAP_WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");

  const unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 20000) {
    delay(300);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Wi-Fi connected. ESP32 IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Wi-Fi connection failed. Check secrets.h and restart the board.");
  }
}

void triggerNearTransfer() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Not sent: Wi-Fi is disconnected.");
    return;
  }

  WiFiClient client;
  HTTPClient http;

  if (!http.begin(client, TAP_RELAY_URL)) {
    Serial.println("Could not initialize HTTP request.");
    return;
  }

  http.setTimeout(15000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-tap-token", TAP_DEVICE_TOKEN);

  const int status = http.POST("{\"deviceId\":\"near-tap-esp32\"}");
  const String response = http.getString();

  Serial.printf("Relay HTTP status: %d\n", status);
  Serial.println(response);
  if (status == 200) {
    Serial.println("Relay accepted the request. Verify the transaction hash on NEAR testnet before claiming payment success.");
  } else {
    Serial.println("Request was not confirmed. Check the response and explorer before retrying.");
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(300);
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  Serial.println();
  Serial.println("NEAR Tap | ESP32 testnet payment trigger");
  Serial.println("Press onboard BOOT once to request a fixed 0.001 NEAR testnet transfer.");
  Serial.println("Do not hold BOOT during reset or startup.");

  connectWiFi();
  previousButtonState = digitalRead(BUTTON_PIN);
}

void loop() {
  const bool currentButtonState = digitalRead(BUTTON_PIN);

  if (currentButtonState != previousButtonState &&
      millis() - lastEdgeMs >= DEBOUNCE_MS) {
    lastEdgeMs = millis();

    if (previousButtonState == HIGH && currentButtonState == LOW) {
      Serial.println("Physical button press detected.");
      triggerNearTransfer();
    }

    previousButtonState = currentButtonState;
  }

  delay(10);
}
