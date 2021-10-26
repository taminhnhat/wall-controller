/**
 * GPIO controll
 * Using pigpio
 * Compile:
 * g++ -Wall gpio.cpp -o gpio -pthread -lrt
 */
#include <iostream>
#include <thread>
#include <string.h>
#include "./named-pipe.h"

#define CYCLE_TIMER 100 // miliseconds`

#define BUTTON_CALL_LEVEL 1

#define BUTTON_1 14

#define ENABLE_PIN_1 26  // enable buttons on row M-1 front of wall
#define ENABLE_PIN_2 19  // enable buttons on row M-2 front of wall
#define ENABLE_PIN_3 13  // enable buttons on row M-3 front of wall
#define ENABLE_PIN_4 6   // enable buttons on row M-4 front of wall
#define ENABLE_PIN_5 5   // enable buttons on row M-5 front of wall
#define ENABLE_PIN_6 7   // enable buttons on row M-1 back of wall
#define ENABLE_PIN_7 8   // enable buttons on row M-2 back of wall
#define ENABLE_PIN_8 25  // enable buttons on row M-3 back of wall
#define ENABLE_PIN_9 24  // enable buttons on row M-4 back of wall
#define ENABLE_PIN_10 23 // enable buttons on row M-5 back of wall
#define ENABLE_PIN_11 0  // enable user buttons on elctric cabin

#define READ_PIN_1 11 // read button 1 on column 1
#define READ_PIN_2 27 // read button 2 on column 2
#define READ_PIN_3 17 // read button 3 on column 3
#define READ_PIN_4 4  // read button 4 on column 4
#define READ_PIN_5 9  // read button 5 on column 5
#define READ_PIN_6 10 // read button 6 on column 6

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
const int buttonDelay = 10;                            // multi of CYCLE_TIMER
int buttonSysnalCountPerCycle[6] = {0, 0, 0, 0, 0, 0}; // number of times that button ticks in a cycle
const int buttonSamplesPerCycle = 50;                  // number of button samples in 1 cycle
const int buttonCountToEmit = 40;                      // minimum number of times that button ticks in a cycle to emit event to named-pipe

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
class lightSystem
{
private:
    uint32_t frontLightBitmap;
    uint32_t backLightBitmap;

public:
    lightSystem(uint32_t frontBitmap, uint32_t backBitmap)
    {
        this->frontLightBitmap = frontBitmap;
        this->backLightBitmap = backBitmap;
    }
    ~lightSystem()
    {
        //
    }
    void frontLightGenerate(uint32_t bitmap)
    {
        this->frontLightBitmap = bitmap;
    }
    void backLightGenerate(uint32_t bitmap)
    {
        this->backLightBitmap = bitmap;
    }
    void frontLightApply()
    {
        std::cout << "front light apply:" << this->getFrontLightBitmap() << std::endl;
    }
    void backLightApply()
    {
        std::cout << "back light apply:" << this->getBackLightBitmap() << std::endl;
    }
    uint32_t getFrontLightBitmap()
    {
        return this->frontLightBitmap;
    }
    uint32_t getBackLightBitmap()
    {
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
int charToInt(char c)
{
    return int(c) - 48;
}

//  MAIN______________________________________________________________________________________

int main(int argc, char *argv[])
{
    //  Start named-pipe ipc
    mypipe.startPipe();

    while (true)
    {
        if (mypipe.readAvailable())
        {
            char arr[30];
            mypipe.readPipe(arr);
            std::cout << "read from pipe: " << arr << std::endl;

            int idx = 0;
            while (arr[idx] != 0x00 && arr[idx] != 0x0A)
            {
                idx++;
            }

            char delimiters[] = ":\n";
            char *commandHeader = strtok(arr, delimiters);
            const char LIGHT_CMD_HEADER[] = "light";
            const char LCD_CMD_HEADER[] = "lcd";

            // Check command mode
            if (!strncmp(commandHeader, LIGHT_CMD_HEADER, 5))
            {
                // Enter light mode
                char *s_bitmap = strtok(NULL, delimiters);
                char *s_side = strtok(NULL, delimiters);
                //  arr: "light:344:front"  "error:2:front"

                if (s_bitmap != NULL && s_side != NULL)
                {
                    uint32_t bitmap = atoi(s_bitmap);
                    const char s_front[] = "front";
                    const char s_back[] = "back";

                    if (!strncmp(s_side, s_front, 5))
                    {
                        lightSys.frontLightGenerate(bitmap);
                        lightSys.frontLightApply();
                        std::cout << "applied front bitmap:" << lightSys.getFrontLightBitmap() << std::endl;
                    }
                    else if (!strncmp(s_side, s_back, 4))
                    {
                        lightSys.backLightGenerate(bitmap);
                        lightSys.backLightApply();
                        std::cout << "applied back bitmap:" << lightSys.getBackLightBitmap() << std::endl;
                    }
                    else
                    {
                        std::cout << "error:not a valid \'side\' token!";
                    }
                }
                else
                {
                    std::cout << "error:light command is missing tokens!" << std::endl;
                }
            }
            else if (!strncmp(commandHeader, LCD_CMD_HEADER, 3))
            {
                // Enter lcd mode
                char *messageLine_1st = strtok(NULL, delimiters);
                char *messageLine_2nd = strtok(NULL, delimiters);
                char *messageLine_3rd = strtok(NULL, delimiters);
                char *messageLine_4th = strtok(NULL, delimiters);

                std::cout << "wrote message to lcd: \n"
                          << messageLine_1st << "\n"
                          << messageLine_2nd << "\n"
                          << messageLine_3rd << "\n"
                          << messageLine_4th << std::endl;
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
