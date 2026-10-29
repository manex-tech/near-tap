#pragma once

// Copy this file to secrets.h locally. Never commit real Wi-Fi passwords or tokens.
#define TAP_WIFI_SSID "YOUR_WIFI_NAME"
#define TAP_WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Use your computer's LAN IPv4 address when ESP32 and computer share Wi-Fi.
// Do not use localhost here.
#define TAP_RELAY_URL "http://192.168.1.100:8787/api/trigger"
#define TAP_DEVICE_TOKEN "REPLACE_WITH_THE_SAME_RANDOM_TOKEN_AS_TAP_DEVICE_TOKEN"
