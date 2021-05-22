/**
 * GPIO controll
 * Using pigpio
 * Compile:
 * g++ -Wall gpio.cpp -o gpio -pthread -lpigpio -lrt
 */
#include <iostream>
#include <thread>
#include <pigpio.h>
#include "./named-pipe.h"

#define CYCLE_TIMER 100 //miliseconds`

#define BUTTON_CALL_LEVEL 1

#define BUTTON_1 14

#define ENABLE_PIN_1 26   //enable buttons on row M-1 front of wall
#define ENABLE_PIN_2 19   //enable buttons on row M-2 front of wall
#define ENABLE_PIN_3 13   //enable buttons on row M-3 front of wall
#define ENABLE_PIN_4 6   //enable buttons on row M-4 front of wall
#define ENABLE_PIN_5 5   //enable buttons on row M-5 front of wall
#define ENABLE_PIN_6 7   //enable buttons on row M-1 back of wall
#define ENABLE_PIN_7 8   //enable buttons on row M-2 back of wall
#define ENABLE_PIN_8 25   //enable buttons on row M-3 back of wall
#define ENABLE_PIN_9 24   //enable buttons on row M-4 back of wall
#define ENABLE_PIN_10 23   //enable buttons on row M-5 back of wall
#define ENABLE_PIN_11 0   //enable user buttons on elctric cabin

#define READ_PIN_1 22   //read button 1 on column 1
#define READ_PIN_2 27   //read button 2 on column 2
#define READ_PIN_3 17   //read button 3 on column 3
#define READ_PIN_4 4    //read button 4 on column 4
#define READ_PIN_5 9    //read button 5 on column 5
#define READ_PIN_6 10    //read button 6 on column 6

#define DS_PIN_1 21
#define DS_PIN_2 12

#define SHCP_PIN_1 16
#define SHCP_PIN_2 1

#define STCP_PIN 20

//  enable pin variables
const int enablePin[11] = {ENABLE_PIN_1, ENABLE_PIN_2, ENABLE_PIN_3, ENABLE_PIN_4, ENABLE_PIN_5, ENABLE_PIN_6, ENABLE_PIN_7, ENABLE_PIN_8, ENABLE_PIN_9, ENABLE_PIN_10, ENABLE_PIN_11};
//  read pin variables
const int readPin[6] = {READ_PIN_1, READ_PIN_2, READ_PIN_3, READ_PIN_4, READ_PIN_5, READ_PIN_6};

//  Variables to delay button read
int buttonTick[6][11];
const int buttonDelay = 10;    // multi of CYCLE_TIMER
int buttonSysnalCountPerCycle[6] = {0,0,0,0,0,0}; //number of times that button ticks in a cycle
const int buttonSamplesPerCycle = 50;     //number of button samples in 1 cycle
const int buttonCountToEmit = 40;         //minimum number of times that button ticks in a cycle to emit event to named-pipe

int tempTimerTick = 0;

//  PIPE_____________________________________________________________________________________________________________________
char *readpipe_path = "../pipe/pipe_emit_light";
char *writepipe_path = "../pipe/pipe_button_callback";

char arr1[100], arr2[100];
uint32_t timerCount = 0;

mypipe mypipe(readpipe_path, writepipe_path);


//  LIGHT SYSTEM______________________________________________________________________________________________________________
/**
 * Front light: ERR1|ERR2|M11|M21|M31|M41|M51|M61|M12|M22...
 * Back Light : M65|M64|...
 */
class lightSystem{
  private:
    uint32_t frontLightBitmap;
    uint32_t backLightBitmap;

  public:
    lightSystem(uint32_t frontBitmap, uint32_t backBitmap){
      this->frontLightBitmap = frontBitmap;
      this->backLightBitmap = backBitmap;
    }
    ~lightSystem(){
      //
    }
    void frontLightGenerate(int col, int row, int state){
      int bitDes;
      if(col != 0){
        bitDes = col + 1 + (row - 1)*6;
      }
      else{
        bitDes = row;
      }
      std::cout << "col:" << col << "|row:" << row << "|bit des:" << bitDes << std::endl;
      if(state == 1){
        uint32_t frontLightBitMask = 1 << bitDes;
        this->frontLightBitmap |= frontLightBitMask;
      }
      else if(state == 0){
        uint32_t frontLightBitMask = (1 << bitDes) ^ 4294967296;
        this->frontLightBitmap &= frontLightBitMask;
      }
    }
    void backLightGenerate(int col, int row, int state){
      int bitDes;
      if(col != 0){
        bitDes = col + 1 + (row - 1)*6;
      }
      else{
        bitDes = row;
      }
      uint32_t backLightBitMask = 1 << bitDes;
      this->backLightBitmap |= backLightBitMask;
    }
    void frontLightApply(){
      for(int idx = 0; idx < 32; idx ++){
        int bitVal = (this->frontLightBitmap >> idx) & 1;
        gpioWrite(DS_PIN_1, bitVal);
        gpioTrigger(SHCP_PIN_1, 1, 1);
        gpioDelay(1);
      }
      gpioTrigger(STCP_PIN, 1, 1);
      std::cout << "front light apply:" << this->getFrontLightBitmap() << std::endl;
    }
    void backLightApply(){
      for(int idx = 31; idx >= 0; idx --){
        int bitVal = (this->backLightBitmap >> idx) & 1;
        gpioWrite(DS_PIN_2, bitVal);
        gpioTrigger(SHCP_PIN_2, 1, 1);
        gpioDelay(1);
      }
      gpioTrigger(STCP_PIN, 1, 1);
      std::cout << "back light apply:" << this->getBackLightBitmap() << std::endl;
    }
    uint32_t getFrontLightBitmap(){
      return this->frontLightBitmap;
    }
    uint32_t getBackLightBitmap(){
      return this->backLightBitmap;
    }
} lightSys(0, 0);


//  DECLARE FUNCTIONS______________________________________________________________________________

int initGPIO();
int resetButtonTick();
void timerTick();
void readButtons(int);
void buttonCallback(int, int, uint32_t);
int charToInt(char c){
  return int(c) - 48;
}


//  MAIN______________________________________________________________________________________

int main(int argc, char *argv[]){
  //  Start named-pipe ipc
  mypipe.startPipe();
  //  Init gpio
  if(!initGPIO()){
    std::cout << "init gpio error" << std::endl;
  }
  //  Reset buttons
  resetButtonTick();

  int lineCount = 1;

  while(true){
    //  Get microseconds
    int microsTick = gpioTick();

    // Check every 1 milisecond
    if(microsTick%1000 == 0){
      //std::cout << "read row" << lineCount <<std::endl;
      //  Read buttons on a line
      readButtons(lineCount);
      if(lineCount >=10) lineCount = 1;
      else lineCount ++;
    }

    //  Check if pipe has new data
    if(mypipe.readAvailable()){
      char arr[30];
      mypipe.readPipe(arr);
      std::cout << "read from pipe" << arr << std::endl;
      //  arr: "M-1-1:front:on"  "M-1-1:back:off"

      int col = charToInt(arr[2]);
      int row = charToInt(arr[4]);
      int side;
      if(arr[6] == 'f') side = 0;
      else if(arr[6] == 'b') side = 1;
      int state;
      if(arr[12] == 'o' && arr[13] == 'n') state = 1;
      else if(arr[12] == 'f' && arr[13] == 'f') state = 0;

      if(side == 0){
        lightSys.frontLightGenerate(col, row, state);
        std::cout << "front bitmap:" << lightSys.getFrontLightBitmap() << std::endl;
        lightSys.frontLightApply();
      }
      else if(side == 1){
        lightSys.backLightGenerate(col, row, state);
        std::cout << "back bitmap:" << lightSys.getBackLightBitmap() << std::endl;
        lightSys.backLightApply();
      }
    }
  }

  return 1;
}





//  DEFINE FUNCTIONS________________________________________________________________________________________________________

/**
 * Init gpio
 */
int initGPIO(){
  if(gpioInitialise() < 0) return 0;
  else{
    //  test buttton on pin GPIO14
    gpioSetMode(BUTTON_1, PI_INPUT);
    gpioSetPullUpDown(BUTTON_1, PI_PUD_UP);

    //  light pins
    gpioSetMode(SHCP_PIN_1, PI_OUTPUT);
    gpioSetMode(SHCP_PIN_2, PI_OUTPUT);
    gpioSetMode(DS_PIN_1, PI_OUTPUT);
    gpioSetMode(DS_PIN_2, PI_OUTPUT);
    gpioSetMode(STCP_PIN, PI_OUTPUT);

    //  enable button pins
    gpioSetMode(ENABLE_PIN_1, PI_OUTPUT);
    gpioSetMode(ENABLE_PIN_2, PI_OUTPUT);
    gpioSetMode(ENABLE_PIN_3, PI_OUTPUT);
    gpioSetMode(ENABLE_PIN_4, PI_OUTPUT);
    gpioSetMode(ENABLE_PIN_5, PI_OUTPUT);
    gpioSetMode(ENABLE_PIN_6, PI_OUTPUT);
    gpioSetMode(ENABLE_PIN_7, PI_OUTPUT);
    gpioSetMode(ENABLE_PIN_8, PI_OUTPUT);
    gpioSetMode(ENABLE_PIN_9, PI_OUTPUT);
    gpioSetMode(ENABLE_PIN_10, PI_OUTPUT);
    gpioSetMode(ENABLE_PIN_11, PI_OUTPUT);

    //  read pins
    gpioSetMode(READ_PIN_1, PI_INPUT);
    gpioSetMode(READ_PIN_2, PI_INPUT);
    gpioSetMode(READ_PIN_3, PI_INPUT);
    gpioSetMode(READ_PIN_4, PI_INPUT);
    gpioSetMode(READ_PIN_5, PI_INPUT);
    gpioSetMode(READ_PIN_6, PI_INPUT);

    // gpioSetPullUpDown(READ_PIN_1, PI_PUD_UP);
    // gpioSetPullUpDown(READ_PIN_2, PI_PUD_UP);
    // gpioSetPullUpDown(READ_PIN_3, PI_PUD_UP);
    // gpioSetPullUpDown(READ_PIN_4, PI_PUD_UP);
    // gpioSetPullUpDown(READ_PIN_5, PI_PUD_UP);
    // gpioSetPullUpDown(READ_PIN_6, PI_PUD_UP);

    gpioSetPullUpDown(READ_PIN_1, PI_PUD_DOWN);
    gpioSetPullUpDown(READ_PIN_2, PI_PUD_DOWN);
    gpioSetPullUpDown(READ_PIN_3, PI_PUD_DOWN);
    gpioSetPullUpDown(READ_PIN_4, PI_PUD_DOWN);
    gpioSetPullUpDown(READ_PIN_5, PI_PUD_DOWN);
    gpioSetPullUpDown(READ_PIN_6, PI_PUD_DOWN);

    gpioGlitchFilter(BUTTON_1, 10000);
    gpioSetAlertFunc(BUTTON_1, buttonCallback);

    gpioSetTimerFunc(0, CYCLE_TIMER, timerTick);
  }
  return 1;
}


/**
 * Reset temporary tick of buttons
 */
int resetButtonTick(){
    for(int i = 0; i < 6; i ++){
        for(int j = 0; j <  11; j ++){
            buttonTick[i][j] = 0;
        }
    }
}


/**
 * Timer tick call every CYCLE_TIMER(100ms)
 */
void timerTick(){
    timerCount ++;
    // reset counter when it too big
    if(timerCount > 4000000000){
        timerCount = 0;
        resetButtonTick();
    }
    //std::cout << "timer tick!" << "|" << arr1 << std::endl;
    //mypipe.writePipe(arr1, strlen(arr1));
}


/**
 * Read buttons on a line
 * Each row has 6 buttons
 * input line from 1 to 11
 * line 1-5 <=> row 1-5 on the front of wall
 * line 6-10 <=> row 1-5 on the back of wall
 * line 11 <=> use for user buttons on the electric cabin
 */
void readButtons(int line){
  //  get micros to calculate running time
  int startMicros = gpioTick();

  // set enable pin to 0
  gpioWrite(enablePin[line - 1], 1);

  // wait for electric sysnal
  gpioDelay(50);

  // read buttons
  for(int i = 0; i < buttonSamplesPerCycle; i ++){
    //  read 6 button per cycle
    for(int col = 0; col < 6; col ++){
      if(gpioRead(readPin[col]) == BUTTON_CALL_LEVEL){
        buttonSysnalCountPerCycle[col] ++;
      };
    }
    gpioDelay(10);
  }
  
  //  set enable pin to 0
  gpioWrite(enablePin[line - 1], 0);

  int row = 0;
  char side[6];
  if(line < 6){
      row = line;
      std::sprintf(side, "front");
  }
  else if(line >= 6){
      row = line - 5;
      std::sprintf(side, "back");
  }

  //  check if button was pressed
  for(int col = 0; col < 6; col ++){
    if(buttonSysnalCountPerCycle[col] > 0)
    std::cout << "button M-" << col + 1 << "-" << row << ":" << buttonSysnalCountPerCycle[col] << std::endl;

    if(buttonSysnalCountPerCycle[col] >= buttonCountToEmit && (timerCount - buttonTick[col-1][line-1]) > buttonDelay){
      char arr[100];
      std::sprintf(arr, "M-%d-%d:%s\n", col + 1, row, side);
      //  print out button address
      std::cout << arr;
      //  emit button via pipes
      mypipe.writePipe(arr, strlen(arr));
      buttonTick[col-1][line-1] = timerCount;
    }

    buttonSysnalCountPerCycle[col] = 0;
  }
}


/**
 * Callback when test button pressed
 */
void buttonCallback(int pin, int level, uint32_t tick){
  switch(pin){
    case 2:
      if(level == 0){
        char amsg[50];
        std::sprintf(amsg, "button:%d|%d|%d/", pin, level, tick);
        std::cout << amsg << std::endl;
        mypipe.writePipe(amsg, strlen(amsg));
      }
      break;
      
    default:
      std::cout << "invalid pin" << std::endl;
  }
}