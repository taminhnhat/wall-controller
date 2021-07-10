/*
lcd-i2c.o: lcd-i2c.cpp lcd-i2c.h
        g++ -c -g lcd-i2c.cpp
lcd.o: lcd.cpp lcd-i2c.h
        g++ -c -g lcd.cpp
run: lcd.o lcd-i2c.o
        g++ -o run lcd.o lcd-i2c.o -Wall -pthread -lpigpio -lrt
*/
#include <iostream>
#include <pigpio.h>
#include <string.h>
#include "./lcd-i2c.h"

#define ENABLE  0b00000100 // Enable bit
#define LCD_BACKLIGHT   0x08  // On
#define COMMAND_MODE  0 // Mode - Sending command
#define DATA_MODE  1 // Mode - Sending data
#define LINE1  0b10000000 // 1st line
#define LINE2  0b11000000 // 2nd line
#define LINE3  0b11100000 // 3rd line
#define LINE4  0b11110000 // 4th line

// // commands
// #define LCD_CLEARDISPLAY 0x01
// #define LCD_RETURNHOME 0x02
// #define LCD_ENTRYMODESET 0x04
// #define LCD_DISPLAYCONTROL 0x08
// #define LCD_CURSORSHIFT 0x10
// #define LCD_FUNCTIONSET 0x20
// #define LCD_SETCGRAMADDR 0x40
// #define LCD_SETDDRAMADDR 0x80

// // flags for display entry mode
// #define LCD_ENTRYRIGHT 0x00
// #define LCD_ENTRYLEFT 0x02
// #define LCD_ENTRYSHIFTINCREMENT 0x01
// #define LCD_ENTRYSHIFTDECREMENT 0x00

// // flags for display on/off control
// #define LCD_DISPLAYON 0x04
// #define LCD_DISPLAYOFF 0x00
// #define LCD_CURSORON 0x02
// #define LCD_CURSOROFF 0x00
// #define LCD_BLINKON 0x01
// #define LCD_BLINKOFF 0x00

// // flags for display/cursor shift
// #define LCD_DISPLAYMOVE 0x08
// #define LCD_CURSORMOVE 0x00
// #define LCD_MOVERIGHT 0x04
// #define LCD_MOVELEFT 0x00

// // flags for function set
// #define LCD_8BITMODE 0x10
// #define LCD_4BITMODE 0x00
// #define LCD_2LINE 0x08
// #define LCD_1LINE 0x00
// #define LCD_5x10DOTS 0x04
// #define LCD_5x8DOTS 0x00

char demoText[] = {0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x40, 0x41, 0x42};

// void lcdWriteByte(int, int);
// void lcd_toggle_enable(int);

int main(){
    if(gpioInitialise() < 0){
        std::cout << "fail to start gpio" << std::endl;
    }
    lcdInit(1, 0x27);
    
    lcdWriteByte(LINE1, COMMAND_MODE);
    for(unsigned int i = 0; i < sizeof(demoText); i ++){
        lcdWriteByte(demoText[i], DATA_MODE);
    }
    lcdWriteByte(LINE2, COMMAND_MODE);
    for(unsigned int i = 0; i < sizeof(demoText); i ++){
        lcdWriteByte(demoText[i], DATA_MODE);
    }

    return 1;
}

// void lcdWriteByte(int bits, int mode)   {

//   //Send byte to data pins
//   // bits = the data
//   // mode = 1 for data, 0 for command
//   int bits_high;
//   int bits_low;
//   // uses the two half byte writes to LCD
//   bits_high = mode | (bits & 0xF0) | LCD_BACKLIGHT ;
//   bits_low = mode | ((bits << 4) & 0xF0) | LCD_BACKLIGHT ;

//   // High bits
//   std::cout << i2cWriteByte(handle, bits_high);
//   lcd_toggle_enable(bits_high);

//   // Low bits
//   std::cout << i2cWriteByte(handle, bits_low);
//   lcd_toggle_enable(bits_low);
//   std::cout << std::endl;
// }

// void lcd_toggle_enable(int bits)   {
//   // Toggle enable pin on LCD display
//   gpioDelay(500);
//   std::cout << i2cWriteByte(handle, (bits | ENABLE));
//   gpioDelay(500);
//   std::cout << i2cWriteByte(handle, (bits & ~ENABLE));
//   gpioDelay(500);
// }