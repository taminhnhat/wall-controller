#include <iostream>
#include <pigpio.h>
#include <string.h>

#define ENABLE  0b00000100 // Enable bit
#define LCD_BACKLIGHT   0x08  // On
#define COMMAND_MODE  0 // Mode - Sending command
#define DATA_MODE  1 // Mode - Sending data
#define LCD_LINE1_INDEX  0b10000000 // 1st line
#define LCD_LINE2_INDEX  0b11000000 // 2nd line
#define LCD_LINE3_INDEX  0b11100000 // 3rd line
#define LCD_LINE4_INDEX  0b11110000 // 4th line

extern void lcdInit(int, uint8_t);
extern void lcdSetCursor(uint8_t);
extern void lcdWriteByte(uint8_t, int);
extern void lcd_toggle_enable(uint8_t);
extern void lcdClear();