/**
 * GPIO controll
 * Using pigpio
 * Compile:
 * g++ -Wall gpio.cpp -o gpio -pthread -lpigpio -lrt
 */
#include <iostream>
#include <thread>
#include <pigpio.h>
#include <string.h>
#include "./named-pipe.h"
#include "./lcd-i2c.h"

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

#define READ_PIN_1 11   //read button 1 on column 1
#define READ_PIN_2 27   //read button 2 on column 2
#define READ_PIN_3 17   //read button 3 on column 3
#define READ_PIN_4 4    //read button 4 on column 4
#define READ_PIN_5 9    //read button 5 on column 5
#define READ_PIN_6 10    //read button 6 on column 6

// #define DS_PIN_1 21
// #define DS_PIN_2 12

// #define SHCP_PIN_1 16
// #define SHCP_PIN_2 1

#define DS_PIN_1 12
#define DS_PIN_2 21

#define SHCP_PIN_1 1
#define SHCP_PIN_2 16

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
//   read pipe from node side
char readpipe_path[] = "/tmp/emit_gpio";
//  
char writepipe_path[] = "/tmp/gpio_callback";

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
    void frontLightGenerate(uint32_t bitmap){
      this->frontLightBitmap = bitmap;
    }
    void backLightGenerate(uint32_t bitmap){
      this->backLightBitmap = bitmap;
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
int resetLight();
void timerTick();
void readButtons(int);
void buttonCallback(int, int, uint32_t);
int charToInt(char c){
  return int(c) - 48;
}


//  MAIN______________________________________________________________________________________

int main(int argc, char *argv[])
{
  //  Start named-pipe ipc
  mypipe.startPipe();

  //  Init gpio
  if(!initGPIO())
  {
    std::cout << "init gpio error" << std::endl;
  }

  //  Reset buttons
  resetButtonTick();

  // Reset light
  resetLight();

  // Init lcd
  lcdInit(1, 0x27);

  int lineCount = 1;

  while(true)
  {
    // Check every 1 milisecond
    if(gpioTick()%1000 == 0){
      //std::cout << "read row" << lineCount <<std::endl;
      //  Read buttons on a line
      readButtons(lineCount);
      if(lineCount >=11) lineCount = 1;
      else lineCount ++;
    }

    /**
     * Check if pipe has new command from nodejs side
     * Light command:   'light:<light bitmap>:<side>'
     * Lcd command:     'lcd:<message>'
     */
    if(mypipe.readAvailable()){
      char arr[30];
      mypipe.readPipe(arr);
      std::cout << "read from pipe: " << arr << std::endl;
      int idx = 0;
      while(arr[idx] != 0x00 && arr[idx] != 0x0A){
        lcdWriteByte(arr[idx], DATA_MODE);
        // std::cout << std::hex << (int)messageLine_1st[idx] << std::endl;
        idx ++;
      }

      char delimiters[] = ":\n";
      char *command = strtok(arr, delimiters);
      const char s_light[] = "light";
      const char s_lcd[] = "lcd";

      // Check command mode
      if(!strncmp(command, s_light, 5))
      {
        // Enter light mode
        char *s_bitmap = strtok(NULL, delimiters);
        char *s_side = strtok(NULL, delimiters);
        //  arr: "light:344:front"  "error:2:front"

        if(s_bitmap != NULL && s_side != NULL){
          uint32_t bitmap = atoi(s_bitmap);
          const char s_front[] = "front";
          const char s_back[] = "back";

          if(!strncmp(s_side, s_front, 5)){
            lightSys.frontLightGenerate(bitmap);
            lightSys.frontLightApply();
            std::cout << "applied front bitmap:" << lightSys.getFrontLightBitmap() << std::endl;
          }else if(!strncmp(s_side, s_back, 4)){
            lightSys.backLightGenerate(bitmap);
            lightSys.backLightApply();
            std::cout << "applied back bitmap:" << lightSys.getBackLightBitmap() << std::endl;
          }else{
            std::cout << "error:not a valid \'side\' token!";
          }
        }else{
          std::cout << "error:light command is missing tokens!" << std::endl;
        }
      }
      else if(!strncmp(command, s_lcd, 3))
      {
        // Enter lcd mode
        char *messageLine_1st = strtok(NULL, delimiters);
        char *messageLine_2nd = strtok(NULL, delimiters);
        char *messageLine_3rd = strtok(NULL, delimiters);
        char *messageLine_4th = strtok(NULL, delimiters);

        //  clear data on lcd
        lcdClear();

        //  print 1st line to lcd
        if(messageLine_1st != NULL){
          int idx = 0;
          lcdSetCursor(LCD_LINE1_INDEX);
          while(messageLine_1st[idx] != 0x00 && messageLine_1st[idx] != 0x0A){
            lcdWriteByte(messageLine_1st[idx], DATA_MODE);
            // std::cout << std::hex << (int)messageLine_1st[idx] << std::endl;
            idx ++;
          }
        }

        //  print 2nd line to lcd
        if(messageLine_2nd != NULL){
          int idx = 0;
          lcdSetCursor(LCD_LINE2_INDEX);
          while(messageLine_2nd[idx] != 0x00 && messageLine_2nd[idx] != 0x0A){
            lcdWriteByte(messageLine_2nd[idx], DATA_MODE);
            idx ++;
          }
        }

        //  print 3rd line to lcd
        if(messageLine_3rd != NULL){
          int idx = 0;
          lcdSetCursor(LCD_LINE3_INDEX);
          while(messageLine_3rd[idx] != 0x00 && messageLine_3rd[idx] != 0x0A){
            lcdWriteByte(messageLine_3rd[idx], DATA_MODE);
            idx ++;
          }
        }

        //  print 4th line to lcd
        if(messageLine_4th != NULL){
          int idx = 0;
          lcdSetCursor(LCD_LINE4_INDEX);
          while(messageLine_4th[idx] != 0x00 && messageLine_4th[idx] != 0x0A){
            lcdWriteByte(messageLine_4th[idx], DATA_MODE);
            idx ++;
          }
        }

        std::cout << "wrote message to lcd: \n" << messageLine_1st << "\n" << messageLine_2nd << "\n" << messageLine_3rd << "\n" << messageLine_4th << std::endl;
      }
      else
      {
        //  
        std::cout << "error:not a valid command!" << std::endl;
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
    return 1;
}

/**
 * Turn all light off
 */
int resetLight(){
  lightSys.backLightGenerate(0);
  lightSys.backLightApply();
  lightSys.frontLightGenerate(0);
  lightSys.frontLightApply();
  return 1;
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
      std::sprintf(side, "back");
  }
  else if(line >= 6 && line < 11){
      row = line - 5;
      std::sprintf(side, "front");
  }

  //  check if button was pressed
  for(int col = 0; col < 6; col ++){
    // if(buttonSysnalCountPerCycle[col] > 0){
    //   std::cout << "button W-" << col + 1 << "-" << row << ":" << buttonSysnalCountPerCycle[col] << std::endl;
    // }

    if(buttonSysnalCountPerCycle[col] >= buttonCountToEmit && (timerCount - buttonTick[col-1][line-1]) > buttonDelay){
      char arr[100];
      if(line < 11){
        //  row 1 to 10 used for panel buttons on the wall
        std::sprintf(arr, "button:W.%d.%d:%s\n", col + 1, row, side);
      }
      else if(line == 11){
        //  line 11 used for user buttons on the electric cabin
        std::sprintf(arr, "button:U.%d.1\n", col + 1);
      }
      //  print out button address
      std::cout << arr;
      //  emit button via pipes
      mypipe.writePipe(arr, strlen(arr));
      int idx = 0;
      while(arr[idx] != 0x00 && arr[idx] != 0x0A){
        lcdWriteByte(arr[idx], DATA_MODE);
        idx ++;
      }
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