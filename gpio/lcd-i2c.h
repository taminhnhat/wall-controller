#include <iostream>
#include <pigpio.h>
#include <string.h>

#define ENABLE  0b00000100 // Enable bit
#define LCD_BACKLIGHT   0x08  // On
#define COMMAND_MODE  0 // Mode - Sending command
#define DATA_MODE  1 // Mode - Sending data

extern void lcdInit(int, uint8_t);
extern void lcdSetCursor(uint8_t);
extern void lcdWriteByte(uint8_t, int);
extern void lcd_toggle_enable(uint8_t);