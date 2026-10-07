/*
  ============================================================
  AquaSense ESP32 Firmware (EMI-Hardened & Debounced)
  ============================================================

  Hardware:
    Flow Sensor 1  -> GPIO 26
    Flow Sensor 2  -> GPIO 27
    Water Level    -> GPIO 34 (ADC1 - Safe during Wi-Fi)
    Relay Control  -> GPIO 25

  Firebase:
    Realtime Database
    Anonymous authentication
    Live sensor data (/devices/aquasense_01/live)
    Hourly historical records (/readings/aquasense_01/{timestamp})
    Real-time pump commands (/devices/aquasense_01/command)

  Serial Monitor Commands:
    ON
    OFF
    STATUS
    HELP

  Board:
    ESP32 Dev Module

  Serial:
    115200 baud
  ============================================================
*/

#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <time.h>

// Firebase helper files
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// ============================================================
// Wi-Fi Configuration
// NOTE: Mobile Hotspots must be on 2.4 GHz Band (ESP32 does not support 5 GHz)
// ============================================================

#define WIFI_SSID "iQOO Z9 5G"
#define WIFI_PASSWORD "11111111"

// ============================================================
// Firebase Configuration
// ============================================================

#define API_KEY "AIzaSyChrUuEEX7ZN04U-7wnZeS98Te7ZwkOCig"
#define DATABASE_URL "https://dt-project-522f4-default-rtdb.firebaseio.com/"

// ============================================================
// Device
// ============================================================

#define DEVICE_ID "aquasense_01"

// ============================================================
// GPIO Allocation
// ============================================================

#define FLOW1_PIN 26
#define FLOW2_PIN 27
#define LEVEL_PIN 34
#define RELAY_PIN 25

// ============================================================
// Relay Logic
// NOTE: If your relay module is Active-LOW, swap these two values.
// ============================================================

#define RELAY_ON HIGH
#define RELAY_OFF LOW

// ============================================================
// Flow Sensor Calibration
// ============================================================

float FLOW1_PULSES_PER_LITER = 450.0;
float FLOW2_PULSES_PER_LITER = 450.0;

// ============================================================
// Hardware EMI & Contact Debounce Protection
// Water turbine pulses never exceed 300-400 Hz (~53 L/min).
// Any pulse arrival interval under 2500 microseconds is electrical
// noise radiated from the motor relay switching.
// ============================================================

const unsigned long DEBOUNCE_MICROS = 2500UL;

volatile unsigned long lastFlow1Micros = 0;
volatile unsigned long lastFlow2Micros = 0;

volatile unsigned long flow1Pulses = 0;
volatile unsigned long flow2Pulses = 0;

unsigned long previousFlow1Pulses = 0;
unsigned long previousFlow2Pulses = 0;

// ============================================================
// Timing
// ============================================================

const unsigned long LIVE_UPLOAD_INTERVAL = 5000UL;
const unsigned long HOURLY_UPLOAD_INTERVAL = 3600000UL;

unsigned long lastLiveUpload = 0;
unsigned long lastHourlyUpload = 0;

// ============================================================
// Firebase Objects
// ============================================================

FirebaseData fbdo;
FirebaseData stream;

FirebaseAuth auth;
FirebaseConfig config;

// ============================================================
// Pump State
// ============================================================

bool pumpState = false;

// ============================================================
// Firebase Paths
// ============================================================

String basePath   = "/devices/" + String(DEVICE_ID);
String livePath   = basePath + "/live";
String commandPath = basePath + "/command";
String statusPath = basePath + "/status";

// ============================================================
// Serial Command Buffer
// ============================================================

String serialCommand = "";

// ============================================================
// Forward Declarations
// ============================================================

void setPump(bool state);
void printStatus();
void printHelp();
void processSerialCommand();
void uploadLiveData();
void uploadHourlyData();
void maintainWiFi();
void setupFirebase();
void setupTime();
unsigned long getTimestamp();

// ============================================================
// Interrupt Service Routines (Debounced & Noise Filtered)
// ============================================================

void IRAM_ATTR flow1ISR()
{
  unsigned long now = micros();
  if (now - lastFlow1Micros >= DEBOUNCE_MICROS)
  {
    flow1Pulses++;
    lastFlow1Micros = now;
  }
}

void IRAM_ATTR flow2ISR()
{
  unsigned long now = micros();
  if (now - lastFlow2Micros >= DEBOUNCE_MICROS)
  {
    flow2Pulses++;
    lastFlow2Micros = now;
  }
}

// ============================================================
// Pump Control
// ============================================================

void setPump(bool state)
{
  pumpState = state;

  digitalWrite(RELAY_PIN, state ? RELAY_ON : RELAY_OFF);

  Serial.println();
  Serial.println("======================================");
  Serial.println("           PUMP CONTROL");
  Serial.println("======================================");
  Serial.print("Requested state : ");
  Serial.println(state ? "ON" : "OFF");
  Serial.print("Relay GPIO      : ");
  Serial.println(RELAY_PIN);
  Serial.print("Relay output    : ");
  Serial.println(digitalRead(RELAY_PIN) == RELAY_ON ? "ACTIVE" : "INACTIVE");
  Serial.print("Pump state      : ");
  Serial.println(pumpState ? "ON" : "OFF");
  Serial.println("======================================");

  // Report pump state to Firebase immediately
  if (Firebase.ready())
  {
    String pumpStatusPath = statusPath + "/pump";
    if (!Firebase.RTDB.setBool(&fbdo, pumpStatusPath.c_str(), pumpState))
    {
      Serial.print("Firebase pump status FAILED: ");
      Serial.println(fbdo.errorReason());
    }
    else
    {
      Serial.println("Firebase pump status updated.");
    }

    String livePumpPath = livePath + "/pump_status";
    if (!Firebase.RTDB.setBool(&fbdo, livePumpPath.c_str(), pumpState))
    {
      Serial.print("Firebase live pump update FAILED: ");
      Serial.println(fbdo.errorReason());
    }
  }
}

// ============================================================
// Serial Help
// ============================================================

void printHelp()
{
  Serial.println();
  Serial.println("======================================");
  Serial.println("       AQUASENSE SERIAL COMMANDS");
  Serial.println("======================================");
  Serial.println("  ON      -> Turn pump ON");
  Serial.println("  OFF     -> Turn pump OFF");
  Serial.println("  STATUS  -> Show complete system status");
  Serial.println("  HELP    -> Show this command list");
  Serial.println("======================================");
}

// ============================================================
// Complete System Status
// ============================================================

void printStatus()
{
  noInterrupts();
  unsigned long currentFlow1 = flow1Pulses;
  unsigned long currentFlow2 = flow2Pulses;
  interrupts();

  float totalVolume1 = currentFlow1 / FLOW1_PULSES_PER_LITER;
  float totalVolume2 = currentFlow2 / FLOW2_PULSES_PER_LITER;
  int waterLevelRaw  = analogRead(LEVEL_PIN);

  Serial.println();
  Serial.println("======================================");
  Serial.println("       AQUASENSE SYSTEM STATUS");
  Serial.println("======================================");
  Serial.print("Device ID          : ");
  Serial.println(DEVICE_ID);
  Serial.print("Wi-Fi              : ");
  Serial.println(WiFi.status() == WL_CONNECTED ? "CONNECTED" : "DISCONNECTED");
  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.print("IP Address         : ");
    Serial.println(WiFi.localIP());
    Serial.print("RSSI               : ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  }
  Serial.print("Firebase           : ");
  Serial.println(Firebase.ready() ? "READY" : "NOT READY");
  Serial.print("Firebase Stream    : ");
  Serial.println(stream.httpConnected() ? "CONNECTED" : "DISCONNECTED");
  Serial.print("Pump               : ");
  Serial.println(pumpState ? "ON" : "OFF");
  Serial.print("Relay GPIO 25      : ");
  Serial.println(digitalRead(RELAY_PIN) == RELAY_ON ? "ACTIVE" : "INACTIVE");
  Serial.print("Flow 1 pulses      : ");
  Serial.println(currentFlow1);
  Serial.print("Flow 2 pulses      : ");
  Serial.println(currentFlow2);
  Serial.print("Flow 1 total       : ");
  Serial.print(totalVolume1, 3);
  Serial.println(" L");
  Serial.print("Flow 2 total       : ");
  Serial.print(totalVolume2, 3);
  Serial.println(" L");
  Serial.print("Water level raw    : ");
  Serial.println(waterLevelRaw);
  Serial.print("Unix timestamp     : ");
  Serial.println(getTimestamp());
  Serial.println("======================================");
}

// ============================================================
// Process Serial Commands
// ============================================================

void processSerialCommand()
{
  while (Serial.available() > 0)
  {
    char c = Serial.read();

    if (c == '\n' || c == '\r')
    {
      if (serialCommand.length() == 0) continue;

      serialCommand.trim();
      serialCommand.toUpperCase();

      Serial.println();
      Serial.print("Serial command received: ");
      Serial.println(serialCommand);

      if (serialCommand == "ON")
      {
        setPump(true);
      }
      else if (serialCommand == "OFF")
      {
        setPump(false);
      }
      else if (serialCommand == "STATUS")
      {
        printStatus();
      }
      else if (serialCommand == "HELP")
      {
        printHelp();
      }
      else
      {
        Serial.println("Unknown command. Type HELP for commands.");
      }

      serialCommand = "";
    }
    else
    {
      serialCommand += c;
      if (serialCommand.length() > 50)
      {
        serialCommand = "";
        Serial.println("Buffer cleared.");
      }
    }
  }
}

// ============================================================
// Firebase Stream Command Callback
// ============================================================

void streamCallback(FirebaseStream data)
{
  Serial.println();
  Serial.println("======================================");
  Serial.println("       FIREBASE COMMAND RECEIVED");
  Serial.println("======================================");

  String dataType = data.dataType();

  if (dataType == "string")
  {
    String command = data.stringData();
    command.trim();
    command.toUpperCase();

    Serial.print("String Command     : ");
    Serial.println(command);

    if (command == "ON")
    {
      setPump(true);
    }
    else if (command == "OFF")
    {
      setPump(false);
    }
  }
  else if (dataType == "boolean")
  {
    bool requestedState = data.boolData();
    Serial.print("Boolean Command    : ");
    Serial.println(requestedState ? "ON" : "OFF");
    setPump(requestedState);
  }

  Serial.println("======================================");
}

void streamTimeoutCallback(bool timeout)
{
  if (timeout)
  {
    Serial.println("Firebase stream timeout.");
  }
  if (!stream.httpConnected())
  {
    Serial.println("Firebase stream disconnected.");
  }
}

// ============================================================
// Wi-Fi Connection
// ============================================================

void connectWiFi()
{
  Serial.println();
  Serial.println("======================================");
  Serial.println("             WI-FI SETUP");
  Serial.println("======================================");
  Serial.print("SSID: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startTime < 20000)
  {
    delay(500);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.println("Wi-Fi CONNECTED.");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  }
  else
  {
    Serial.println("Wi-Fi CONNECTION FAILED.");
  }
  Serial.println("======================================");
}

void maintainWiFi()
{
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.println("Wi-Fi disconnected. Reconnecting...");
  connectWiFi();
}

// ============================================================
// NTP Time Synchronization (IST: UTC + 5:30 = 19800 sec)
// ============================================================

void setupTime()
{
  configTime(19800, 0, "pool.ntp.org", "time.nist.gov");
  Serial.println("Synchronizing time...");

  struct tm timeinfo;
  for (int i = 0; i < 20; i++)
  {
    if (getLocalTime(&timeinfo))
    {
      Serial.println("Time synchronized successfully.");
      Serial.print("Current IST time: ");
      Serial.println(&timeinfo, "%Y-%m-%d %H:%M:%S");
      return;
    }
    delay(500);
  }
  Serial.println("Time sync timeout. Will retry in background.");
}

unsigned long getTimestamp()
{
  time_t now;
  time(&now);
  return (unsigned long)now;
}

// ============================================================
// Firebase Setup
// ============================================================

void setupFirebase()
{
  Serial.println();
  Serial.println("======================================");
  Serial.println("          FIREBASE SETUP");
  Serial.println("======================================");

  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  Serial.println("Starting anonymous authentication...");
  if (!Firebase.signUp(&config, &auth, "", ""))
  {
    Serial.print("Firebase anonymous sign-up FAILED: ");
    Serial.println(config.signer.signupError.message.c_str());
  }
  else
  {
    Serial.println("Firebase anonymous authentication OK.");
  }

  config.token_status_callback = tokenStatusCallback;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  Serial.println("Firebase client initialized.");

  // Start Realtime Command Stream
  Serial.print("Subscribing to command path: ");
  Serial.println(commandPath);

  if (!Firebase.RTDB.beginStream(&stream, commandPath.c_str()))
  {
    Serial.print("Firebase stream FAILED: ");
    Serial.println(stream.errorReason());
  }
  else
  {
    Serial.println("Firebase command stream STARTED.");
    Firebase.RTDB.setStreamCallback(&stream, streamCallback, streamTimeoutCallback);
  }

  Serial.println("======================================");
}

// ============================================================
// Live Data Upload (Runs every 5 seconds)
// ============================================================

void uploadLiveData()
{
  if (!Firebase.ready())
  {
    Serial.println("Live upload skipped: Firebase not ready.");
    return;
  }

  // Atomically read pulse counters
  noInterrupts();
  unsigned long currentFlow1 = flow1Pulses;
  unsigned long currentFlow2 = flow2Pulses;
  interrupts();

  unsigned long deltaFlow1 = currentFlow1 - previousFlow1Pulses;
  unsigned long deltaFlow2 = currentFlow2 - previousFlow2Pulses;
  previousFlow1Pulses = currentFlow1;
  previousFlow2Pulses = currentFlow2;

  float intervalSeconds = LIVE_UPLOAD_INTERVAL / 1000.0;

  // Safe flow rate computation: Clamped to 0.0 if no genuine pulses
  float flow1LPM = 0.0;
  float flow2LPM = 0.0;

  if (deltaFlow1 > 0)
  {
    float liters1 = deltaFlow1 / FLOW1_PULSES_PER_LITER;
    flow1LPM = (liters1 / intervalSeconds) * 60.0;
  }

  if (deltaFlow2 > 0)
  {
    float liters2 = deltaFlow2 / FLOW2_PULSES_PER_LITER;
    flow2LPM = (liters2 / intervalSeconds) * 60.0;
  }

  float totalVolume1 = currentFlow1 / FLOW1_PULSES_PER_LITER;
  float totalVolume2 = currentFlow2 / FLOW2_PULSES_PER_LITER;

  float flowDifference = flow1LPM - flow2LPM;
  float averageFlow = (flow1LPM + flow2LPM) / 2.0;
  float flowDifferencePercent = 0.0;

  if (averageFlow > 0.001)
  {
    flowDifferencePercent = (fabs(flowDifference) / averageFlow) * 100.0;
  }

  int waterLevelRaw = analogRead(LEVEL_PIN);
  unsigned long timestamp = getTimestamp();

  FirebaseJson json;
  json.set("flow1_lpm", flow1LPM);
  json.set("flow2_lpm", flow2LPM);
  json.set("flow1_total_liters", totalVolume1);
  json.set("flow2_total_liters", totalVolume2);
  json.set("flow1_total_pulses", (int)currentFlow1);
  json.set("flow2_total_pulses", (int)currentFlow2);
  json.set("flow_difference_l_min", flowDifference);
  json.set("flow_difference_percent", flowDifferencePercent);
  json.set("water_level_raw", waterLevelRaw);
  json.set("pump_status", pumpState);
  json.set("timestamp", (int)timestamp);

  if (!Firebase.RTDB.setJSON(&fbdo, livePath.c_str(), &json))
  {
    Serial.print("Live Firebase upload FAILED: ");
    Serial.println(fbdo.errorReason());
  }
  else
  {
    Serial.println("Live Firebase upload: OK");
  }

  Serial.println();
  Serial.println("--------------------------------------");
  Serial.println("          LIVE SENSOR DATA");
  Serial.println("--------------------------------------");
  Serial.print("Flow 1 L/min       : ");
  Serial.println(flow1LPM, 3);
  Serial.print("Flow 2 L/min       : ");
  Serial.println(flow2LPM, 3);
  Serial.print("Flow 1 pulses      : ");
  Serial.println(currentFlow1);
  Serial.print("Flow 2 pulses      : ");
  Serial.println(currentFlow2);
  Serial.print("Flow difference    : ");
  Serial.println(flowDifference, 3);
  Serial.print("Water level raw    : ");
  Serial.println(waterLevelRaw);
  Serial.print("Pump               : ");
  Serial.println(pumpState ? "ON" : "OFF");
  Serial.print("Timestamp          : ");
  Serial.println(timestamp);
  Serial.println("--------------------------------------");
}

// ============================================================
// Hourly Historical Upload
// ============================================================

void uploadHourlyData()
{
  if (!Firebase.ready()) return;

  noInterrupts();
  unsigned long currentFlow1 = flow1Pulses;
  unsigned long currentFlow2 = flow2Pulses;
  interrupts();

  float totalVolume1 = currentFlow1 / FLOW1_PULSES_PER_LITER;
  float totalVolume2 = currentFlow2 / FLOW2_PULSES_PER_LITER;
  int waterLevelRaw  = analogRead(LEVEL_PIN);
  unsigned long timestamp = getTimestamp();

  FirebaseJson json;
  json.set("timestamp", (int)timestamp);
  json.set("flow1_total_liters", totalVolume1);
  json.set("flow2_total_liters", totalVolume2);
  json.set("flow1_total_pulses", (int)currentFlow1);
  json.set("flow2_total_pulses", (int)currentFlow2);
  json.set("water_level_raw", waterLevelRaw);
  json.set("pump_status", pumpState);

  String historyPath = "/readings/" + String(DEVICE_ID) + "/" + String(timestamp);

  if (!Firebase.RTDB.setJSON(&fbdo, historyPath.c_str(), &json))
  {
    Serial.print("Hourly Firebase upload FAILED: ");
    Serial.println(fbdo.errorReason());
  }
  else
  {
    Serial.print("Hourly record saved: ");
    Serial.println(historyPath);
  }
}

// ============================================================
// Setup
// ============================================================

void setup()
{
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("======================================");
  Serial.println("  AQUASENSE ESP32 (DEBOUNCED & FILTERED)");
  Serial.println("======================================");

  pinMode(FLOW1_PIN, INPUT_PULLUP);
  pinMode(FLOW2_PIN, INPUT_PULLUP);
  pinMode(LEVEL_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);

  // Safety: Ensure pump is OFF on boot
  digitalWrite(RELAY_PIN, RELAY_OFF);
  pumpState = false;

  // Attach interrupts with microsecond noise rejection
  attachInterrupt(digitalPinToInterrupt(FLOW1_PIN), flow1ISR, FALLING);
  attachInterrupt(digitalPinToInterrupt(FLOW2_PIN), flow2ISR, FALLING);
  Serial.println("Flow sensor interrupts attached with 2500us EMI filter.");

  connectWiFi();
  setupTime();
  setupFirebase();

  if (Firebase.ready())
  {
    Firebase.RTDB.setBool(&fbdo, (statusPath + "/pump").c_str(), false);
    Firebase.RTDB.setString(&fbdo, (statusPath + "/device").c_str(), DEVICE_ID);
    Firebase.RTDB.setBool(&fbdo, (statusPath + "/online").c_str(), true);
    Firebase.RTDB.setString(&fbdo, (statusPath + "/firmware").c_str(), "AquaSense-ESP32-v2.1-Filtered");
    Firebase.RTDB.setInt(&fbdo, (statusPath + "/last_boot").c_str(), (int)getTimestamp());
    Serial.println("Initial device status uploaded.");
  }

  lastLiveUpload   = millis();
  lastHourlyUpload = millis();

  Serial.println("AQUASENSE FIRMWARE INITIALIZED.");
}

// ============================================================
// Main Loop
// ============================================================

void loop()
{
  processSerialCommand();
  maintainWiFi();

  // Re-establish Firebase stream if disconnected
  if (Firebase.ready() && !stream.httpConnected())
  {
    Serial.println("Restarting command stream...");
    if (Firebase.RTDB.beginStream(&stream, commandPath.c_str()))
    {
      Firebase.RTDB.setStreamCallback(&stream, streamCallback, streamTimeoutCallback);
      Serial.println("Command stream resumed.");
    }
  }

  // 5-Second Live Upload
  if (millis() - lastLiveUpload >= LIVE_UPLOAD_INTERVAL)
  {
    uploadLiveData();
    lastLiveUpload = millis();
  }

  // Hourly Archive Upload
  if (millis() - lastHourlyUpload >= HOURLY_UPLOAD_INTERVAL)
  {
    uploadHourlyData();
    lastHourlyUpload = millis();
  }

  delay(10);
}
