
/*
  Bidirectional LED Flow - 10 LEDs

  Potentiometer (A0):
  - Clockwise: LEDs flow from center to outside.
  - Counterclockwise: LEDs flow from outside to center.
  - Further from center = faster animation.
  - Center position = animation stops.

  Button (D12):
  - Press once to pause.
  - Press again to continue.

  No buzzer.
*/

// ==================== LED settings ====================

const int ledPins[] = {
  2, 3, 4, 5, 6, 7, 8, 9, 10, 11
};

const int ledCount = 10;

// Five symmetrical LED pairs.
// Pair 0: LEDs 5 and 6 (indexes 4 and 5)
// Pair 1: LEDs 4 and 7 (indexes 3 and 6)
// Pair 2: LEDs 3 and 8 (indexes 2 and 7)
// Pair 3: LEDs 2 and 9 (indexes 1 and 8)
// Pair 4: LEDs 1 and 10 (indexes 0 and 9)

const int PAIR_COUNT = ledCount / 2;

// ==================== Pin settings ====================

const int POT_PIN = A0;
const int BUTTON_PIN = 12;

// ==================== Potentiometer settings ====================

const int ADC_MAX = 1023;
const int POT_CENTER = 512;

const int CENTER_DEAD_ZONE = 45;

// ==================== Speed settings ====================

const unsigned long MIN_FLOW_DELAY = 70;
const unsigned long MAX_FLOW_DELAY = 700;

// ==================== Button settings ====================

const unsigned long DEBOUNCE_DELAY = 40;

bool lastButtonReading = HIGH;
bool stableButtonState = HIGH;

unsigned long lastDebounceTime = 0;

// ==================== Game state ====================

bool isRunning = true;

int currentPair = 0;

//  1 = center to outside
// -1 = outside to center
//  0 = potentiometer in center

int flowDirection = 0;
int lastFlowDirection = 0;

// ==================== Timing ====================

unsigned long lastLedTime = 0;

// ==================== Setup ====================

void setup() {

  analogReadResolution(10);

  for (int i = 0; i < ledCount; i++) {
    pinMode(ledPins[i], OUTPUT);
    digitalWrite(ledPins[i], LOW);
  }

  pinMode(BUTTON_PIN, INPUT_PULLUP);

  currentPair = 0;
  showLedPair(currentPair);
}

// ==================== Main loop ====================

void loop() {

  handleButton();

  if (!isRunning) {
    return;
  }

  int potValue = analogRead(POT_PIN);

  updateFlowDirection(potValue);

  // Stop animation when potentiometer is centered.

  if (flowDirection == 0) {
    turnOffAllLeds();
    return;
  }

  // Restart animation when direction changes.

  if (flowDirection != lastFlowDirection) {

    if (flowDirection > 0) {
      currentPair = 0;
    } else {
      currentPair = PAIR_COUNT - 1;
    }

    showLedPair(currentPair);

    lastFlowDirection = flowDirection;
    lastLedTime = millis();
  }

  int distanceFromCenter =
    abs(potValue - POT_CENTER);

  int maximumDistance;

  if (potValue >= POT_CENTER) {
    maximumDistance = ADC_MAX - POT_CENTER;
  } else {
    maximumDistance = POT_CENTER;
  }

  // Calculate animation speed.

  unsigned long flowDelay = map(
    distanceFromCenter,
    CENTER_DEAD_ZONE,
    maximumDistance,
    MAX_FLOW_DELAY,
    MIN_FLOW_DELAY
  );

  flowDelay = constrain(
    flowDelay,
    MIN_FLOW_DELAY,
    MAX_FLOW_DELAY
  );

  // Advance animation.

  if (millis() - lastLedTime >= flowDelay) {

    lastLedTime = millis();

    advanceLedPair();

    showLedPair(currentPair);
  }
}

// ==================== Potentiometer direction ====================

void updateFlowDirection(int potValue) {

  if (potValue > POT_CENTER + CENTER_DEAD_ZONE) {

    flowDirection = 1;

  } else if (potValue < POT_CENTER - CENTER_DEAD_ZONE) {

    flowDirection = -1;

  } else {

    flowDirection = 0;
    lastFlowDirection = 0;
  }
}

// ==================== LED animation ====================

void advanceLedPair() {

  if (flowDirection > 0) {

    currentPair++;

    if (currentPair >= PAIR_COUNT) {
      currentPair = 0;
    }

  } else {

    currentPair--;

    if (currentPair < 0) {
      currentPair = PAIR_COUNT - 1;
    }
  }
}

// ==================== Display LED pair ====================

void showLedPair(int pairIndex) {

  turnOffAllLeds();

  int leftLedIndex =
    PAIR_COUNT - 1 - pairIndex;

  int rightLedIndex =
    PAIR_COUNT + pairIndex;

  digitalWrite(
    ledPins[leftLedIndex],
    HIGH
  );

  digitalWrite(
    ledPins[rightLedIndex],
    HIGH
  );
}

// ==================== Turn off all LEDs ====================

void turnOffAllLeds() {

  for (int i = 0; i < ledCount; i++) {
    digitalWrite(ledPins[i], LOW);
  }
}

// ==================== Button handling ====================

void handleButton() {

  bool currentReading =
    digitalRead(BUTTON_PIN);

  if (currentReading != lastButtonReading) {
    lastDebounceTime = millis();
  }

  if (
    millis() - lastDebounceTime >=
    DEBOUNCE_DELAY
  ) {

    if (currentReading != stableButtonState) {

      stableButtonState = currentReading;

      // INPUT_PULLUP means LOW is pressed.

      if (stableButtonState == LOW) {

        isRunning = !isRunning;

        if (!isRunning) {

          turnOffAllLeds();

        } else {

          int potValue =
            analogRead(POT_PIN);

          updateFlowDirection(potValue);

          if (flowDirection > 0) {
            currentPair = 0;

          } else if (flowDirection < 0) {
            currentPair = PAIR_COUNT - 1;

          } else {
            currentPair = 0;
          }

          showLedPair(currentPair);

          lastFlowDirection = flowDirection;

          lastLedTime = millis();
        }
      }
    }
  }

  lastButtonReading = currentReading;
}
