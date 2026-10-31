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

void recordPresence() {
  Serial.println("Presence event detected.");

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Local button event detected, but not sent: Wi-Fi is disconnected.");
    return;
  }

  WiFiClient client;
  HTTPClient http;

  if (!http.begin(client, TAP_RELAY_URL)) {
    Serial.println("Could not initialize HTTP request.");
    return;
  }

  http.setTimeout(10000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-tap-token", TAP_DEVICE_TOKEN);

  const int status = http.POST("{\"deviceId\":\"near-tap-esp32\",\"event\":\"presence\"}");
  const String response = http.getString();

  Serial.printf("Presence relay HTTP status: %d\n", status);
  Serial.println(response);
  if (status == 202) {
    Serial.println("Check-in received. Add the participant name on the dashboard, then publish to NEAR.");
  } else {
    Serial.println("Presence was not confirmed by the relay. Check the response before retrying.");
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(300);
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  Serial.println();
  Serial.println("NEAR Tap | Proof of Presence preview");
  Serial.println("Press the onboard BOOT button once to record a presence event.");
  Serial.println("Preview mode: no payment is sent and no blockchain transaction is made.");
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
      recordPresence();
    }

    previousButtonState = currentButtonState;
  }

  delay(10);
}
