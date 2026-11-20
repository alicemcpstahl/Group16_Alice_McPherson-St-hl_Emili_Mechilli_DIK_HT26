//B.E.A.N.S
// Delete and Reset buttons that act like keyboard keys (Delete, Escape)
//   B0 - B7 BEAN ONE buttons 1-8
//  B8 - B20 BEAN TWO membrane swittches 1-13
//   P0:2048 pitch pot (0-4095)   P1:1000 speed pot (0-4095)

//LIBRARIES & SERIAL SETUP
#include <Keyboard.h> //loads the library that lets the Arduino pretend to be a keyboard

#define Serial SerialUSB //Makes every serial print go through usb port

// DELETE BUTTON - VARIABLES
const int deletePin = 10; //button placement on arduino
int deleteLastReading = HIGH; //most recent reading
int deleteStableState = HIGH; //value
unsigned long deleteLastChangeTime = 0; //when last reading changed.
// Implements debounce

// RESET BUTTON - VARIABLES
const int resetPin = 11; //button placement on arduino
int resetLastReading = HIGH; //most recent reading
int resetStableState = HIGH; //value
unsigned long resetLastChangeTime = 0; //when last reading changed.

// BEAN ONE BUTTONS PAD - VARIABLES
const int buttonCount = 8; //amount of buttons
const int buttonPins[buttonCount] = {2, 3, 4, 5, 6, 7, 8, 9}; //Button placement on arduino

int lastReading[buttonCount]; //arrays that hold one slot per button. same debounce.
int stableState[buttonCount];
unsigned long lastChangeTime[buttonCount];
const unsigned long debounceDelay = 25;   // ignore contact bounce for 25 ms. steady signal cuz of on and off signals. 

//BEAN TWO PIANO MAT - VARIABLES
// Mat key 1 = beat 8 B8 mat key 13 = beat 20 B20
const int numRows = 5;    // front side wires. shared by several keys
const int numCols = 10;   // back side wires. one per key, some shared by 2-3 keys

//                            PB0 PA0 PA1 PA2 PA3
const int rowPins[numRows] = { 22, 23, 24, 25, 26 };
//                            PB2 PD0 PD1 PD2 PD3 PE0 PE1 PE2 PE3 PE8
const int colPins[numCols] = { 27, 28, 29, 30, 31, 32, 33, 34, 35, 36 };

// Which mat key sits where a row meets a column. 0 = no key
const byte keyMap[numRows][numCols] = {
  {1, 0, 0,  0, 0, 0, 0,  0, 0, 0},    // PB0
  {2, 0, 0,  0, 0, 0, 0,  0, 0, 0},    // PA0
  {9, 0, 0,  0, 0, 0, 0,  0, 0, 0},    // PA1
  {0, 3, 4, 11, 5, 0, 0,  0, 0, 10},   // PA2
  {0, 0, 0,  0, 0, 6, 7, 13, 8, 12}    // PA3
};

const int numKeys = 13;
const unsigned long keyDebounce = 30;   // key has to be stable for 30 ms
const unsigned long keyLockout = 200;   // ignore the same key for 200 ms after a toggle so one press isnt counted twice

bool keyRaw[numKeys + 1];
bool keyStable[numKeys + 1];
unsigned long keyChangeTime[numKeys + 1];
unsigned long keyLastSent[numKeys + 1]; //have 14 slots so keys 1-13 can be used directly as indexes. Slot 0 is unused

// POTENTIOMETERS - VARIABLES
// Pot 0 = pitch, pot 1 = speed (the web page decides what each one does)
const int potCount = 2; //amount of pots, potentiometers
const int potPins[potCount] = {A3, A4};   // pin for pot 0 (pitch) and pot 1 (speed). Change if wired elsewhere
int lastPotSent[potCount]; //last value sent for each pot

//SETUP
void setup() {

  //DELETE BUTTON, RESET BUTTON & KEYBOARD
  pinMode(deletePin, INPUT_PULLUP); //turns on an internal resistor that pulls the pin HIGH. The button connects to GND, so pressing it reads LOW.
  pinMode(resetPin, INPUT_PULLUP); //same for the reset button on pin 11
  Keyboard.begin(); //starts keyboard feature

//SERIAL & ANALOG SETTINGS
  Serial.begin(115200); //starts serial communication. speed must match baudrate in web page. 
  analogReadResolution(12); // DUE is 12-bit: values 0-4095, which is what the web page expects

//BEAN ONE BUTTONS
  for (int i = 0; i < buttonCount; i++) { //loop sets up every button with a pull-up and a starting state of HIGH
    pinMode(buttonPins[i], INPUT_PULLUP); //row pins are input column pins are input pullup
    lastReading[i] = HIGH;
    stableState[i] = HIGH;
    lastChangeTime[i] = 0;
  }

//BEAN TWO 
  for (int r = 0; r < numRows; r++) pinMode(rowPins[r], INPUT);
  for (int c = 0; c < numCols; c++) pinMode(colPins[c], INPUT_PULLUP);

//POTENTIOMETERS
  for (int p = 0; p < potCount; p++) lastPotSent[p] = -100;   // guarantees the first pot reading is always sent, because the difference will be large
}

//LOOP
void loop() { //runs over and over
//TIMESTAMP
  unsigned long now = millis(); //time in miliseconds since startup

  // DELETE BUTTON - ACTS LIKE DELETE KEY ON KEYBOARD
  int deleteReading = digitalRead(deletePin); //Reads pin 10, high not pressed lor is pressed

//If pin differs from last something has changed, record time, remember new values. every flicker restarts the timer. 
  if (deleteReading != deleteLastReading) {  // reading now = deleteReading, previous pass = delete lastreading. != not equal to. if they differ the pin just changed. 
    deleteLastChangeTime = now; //saves moment of last change. every flicker overwrites this. 
    deleteLastReading = deleteReading; //stores new reading as last reading. without this line the code would think the pin had changedon every pass. 
  }


  if (now - deleteLastChangeTime >= debounceDelay && deleteReading != deleteStableState) { // deleteLastChangeTime = how many milliseconds since last change, 
  //debounceDelay checks if reading has been steady for at least 25ms. deletestablestate 
  //checks if its different from the stable/official rate.
    
    deleteStableState = deleteReading; //updates official state to new. Makes second condition false so block doesnt run until button changes again. 

    if (deleteStableState == LOW) { //if the pin is grounded the button is pressed. 
      Keyboard.press(KEY_DELETE); //delete key is held down. 
    } else {
      Keyboard.release(KEY_DELETE); //delete key is not held down
    }
  }

  // RESET BUTTON - ACTS LIKE ESCAPE KEY ON KEYBOARD (the web page resets everything on Escape)
  int resetReading = digitalRead(resetPin); //Reads pin 11, high not pressed low is pressed

  if (resetReading != resetLastReading) { //same debounce as the delete button
    resetLastChangeTime = now; //saves moment of last change
    resetLastReading = resetReading; //remembers new raw reading
  }

  if (now - resetLastChangeTime >= debounceDelay && resetReading != resetStableState) { //steady for 25 ms and different from official state
    resetStableState = resetReading; //updates official state

    if (resetStableState == LOW) { //only react when pressed, releasing does nothing
      Keyboard.write(KEY_ESC); //taps Escape once (press and release), so holding the button doesn't repeat
    }
  }

//BEAN ONE 
  // Buttons. send B<0-7> once per press
  for (int i = 0; i < buttonCount; i++) { //int i=0 creates a counter starting at 0, i < buttoncount keeps going while i is below 8. i++ adds 1 after each round. block runs 8 times with i = 0 to 7 once per button.
    int reading = digitalRead(buttonPins[i]); //picks the ith pin from digital pins list. digital read reads it and the result, high or low, is stored in a the new variable reading. 

    if (reading != lastReading[i]) { //same checks as for delete button but lastreading is this buttons own remembered value from the array. 
      lastChangeTime[i] = now; //restarts this buttons timer
      lastReading[i] = reading; //remembers new raw reading
    }
 //debounceDelay checks if reading has been steady for at least 25ms. deletestablestate 
  //checks if its different from the stable/official rate. ??
    if (now - lastChangeTime[i] >= debounceDelay && reading != stableState[i]) { 
      stableState[i] = reading; // uppdates official state
      if (stableState[i] == LOW) { //only continue i its now pressed. releasing does nothing
        Serial.print("B"); //sends letter b over usb without linebreak
        Serial.println(i); //sends the button number and then a line break (ln). result is ex B3. 
      }
    }
  }

  // BEAN TWO
  // One row at a time acts as GND. A column that goes LOW means a key is pressed.
  bool nowDown[numKeys + 1] = {false}; // creates a list of 14 tru false values through bool. slot k will stay wether mat key k is pressed right now. +1 is so slots 1-13 exists, slot 0 unused. false fills every slot with false, created fresh on every bypass.

  for (int r = 0; r < numRows; r++) { //loops through 5 rows with r=0to4
    pinMode(rowPins[r], OUTPUT); //turns this rows pins into an output so arduino can drive it.
    digitalWrite(rowPins[r], LOW);//sets output to low aka 0V so this row acts like GND
    delayMicroseconds(100);//pauses for 100 microseconds so voltage settles before reading.

    for (int c = 0; c < numCols; c++) { //loop inside loop for this row go through att 10 columns with c=0to9
      byte key = keyMap[r][c]; //looks in the table keymap at row r column c. result is keynumber 1-13 or 0 if there no key there. its stored in key, type is byte, a small whole number).
      if (key != 0 && digitalRead(colPins[c]) == LOW) nowDown[key] = true;//condition: a key exists in this spot
      //key !=0 and the column pins reads LOW. a column normally sist at HIGHbecause of pull up. If key is pressed 
      //its switch connects the column to grounded row so column goes LOW. if both true nowDown[key] = true marks that key as pressed. 
      // if doesnt need braces with only one statement. 
    }
    pinMode(rowPins[r], INPUT);           // switch the row off again (important!)
  }

  // B<8-20> once each time a key is stepped on
  for (int k = 1; k <= numKeys; k++) { //loop with k = 1to13 lessthan or equal to once per mat key
    if (nowDown[k] != keyRaw[k]) { //checks if key state is different from last raw state
      keyRaw[k] = nowDown[k];//remembers raw state
      keyChangeTime[k] = now; //restarts key timer
    }

    if (now - keyChangeTime[k] >= keyDebounce && keyStable[k] != keyRaw[k]) { //steady for 30ms and different from official state
      keyStable[k] = keyRaw[k]; //updates official state true - down false - up

      if (keyStable[k] && now - keyLastSent[k] >= keyLockout) { //keystable k on its own means true, ie key was pressed. second part checks that atleast 200 ms have passed since key last sent a message. 
        keyLastSent[k] = now; //records when it was sent for the lockout
        Serial.print("B"); //sends the letter b
        Serial.println(buttonCount + k - 1);   // sends number plus linebreak. buttoncount is 8 so key 1 gives 8+1-1=8(b8) and key 13 gives 8+13-1=20(b20).
      }
    }
  }

//POTENTIOMETERS
  // Pots: P<number>:<0-4095> only when the value really changed
  for (int p = 0; p < potCount; p++) { //loop with p = 0 and 1, once per pot
    analogRead(potPins[p]);   // throwaway reading so the two pots don't affect each other
    delayMicroseconds(200);   // lets the converter settle
    int v = analogRead(potPins[p]);   // the value that gets used (0-4095)

    if (abs(v - lastPotSent[p]) > 16) {   // ignores small electrical noise
      lastPotSent[p] = v;   // remembers this value as the last one sent
      Serial.print("P");   // one message: letter P, pot number, a colon, the value
      Serial.print(p);
      Serial.print(":");
      Serial.println(v);   // ex. P0:2048
    }
  }
}

//HOW IT WORKS 
//Delete:
  //works likw the delete key on a keyboard. pressing it connects pin 10 to gnd 
  //which arduino reads as low. Once signal has been steady for 25 ms (debounce)
  // the arduino tells computer delete key down and when you let go delete key up..
  //the web page already listens for delete and removes selcted beat. doesnt use 
  //text messages at all because it works through keyboard feature. 
//Reset:
  //works the same way as delete but on pin 11, and taps the Escape key once per press.
  //the web page already listens for Escape and resets all beats, speed and pitch.
//Buttons:
  // Each button has own pin and other leg wired to ground. arduino checks all 
  //8 over and over. when a button has been pressed the signal is steady, its sends 
  //its number as a message. ex button 3 send b3. web page recievces it and turns beat on or off. 
  //only presses are reported not releases. each press is one message, a toggle. 
//Pianokeys:
  //keys are wired as grid of 5 rowns and 10 columns. arduino makes one row at a time act 
  //as ground and then checks which columns get pulled LOW. a pressed key connects its row
  // to its column and a lookup table (keymap) says which key sits at each crossing.
  // after the same debounce as the buttons plus a 200ms lockout so one footstep isnt counted twice 
  //it sends b8 to b20. the numbers continue after the 8 buttons so the page sees 21 beats total. 
//Potentiometers
  //each pot gives a value from 0 to 4095 depending on where it is turned. the arduino reads
  //each one and only sends a message when the value has changed by more than 16 since the
  //last one it sent, so tiny electrical noise doesn't flood the connection. A message looks
  //like P0:2048. On the web page, pot 0 changes pitch and pot 1 changes speed for the
  //selected beat (or all active beats if no beat is selected).

//Debounce
  //The delete button, the 8 buttons and the mat keys all use the same pattern: read the input, 
  //restart a timer whenever it changes, and only act once it has stayed the same for a while. 
  //This stops the mechanical flicker of a switch from counting as many presses.

//Reaches the web page
  //Messages go over USB serial as lines of text, and connectArduino() in script.js reads them. 
  //A line starting with B toggles a beat, and a line starting with P adjusts a pot. Everything else 
  //(the sound and the bubbles) happens in the browser.