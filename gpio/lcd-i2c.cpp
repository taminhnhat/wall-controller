#include <iostream>
#include <pigpio.h>
#include <string.h>
#include "lcd-i2c.h"

#define ENABLE 0b00000100  // Enable bit
#define LCD_BACKLIGHT 0x08 // On

int handle;

void lcdSetCursor(uint8_t index)
{
  lcdWriteByte(index, 0);
}

void lcdWriteByte(uint8_t bits, int mode)
{
  //Send byte to data pins
  // bits = the data
  // mode = 1 for data, 0 for command
  uint8_t bits_high;
  uint8_t bits_low;
  // uses the two half byte writes to LCD
  bits_high = mode | (bits & 0xF0) | LCD_BACKLIGHT;
  bits_low = mode | ((bits << 4) & 0xF0) | LCD_BACKLIGHT;

  // High bits
  writeHandle = i2cWriteByte(handle, bits_high);
  lcd_toggle_enable(bits_high);

  // Low bits
  i2cWriteByte(handle, bits_low);
  lcd_toggle_enable(bits_low);
}

void lcd_toggle_enable(uint8_t bits)
{
  // Toggle enable pin on LCD display
  gpioDelay(500);
  i2cWriteByte(handle, (bits | ENABLE));
  gpioDelay(500);
  i2cWriteByte(handle, (bits & ~ENABLE));
  gpioDelay(500);
}

void lcdInit(int i2cBus, uint8_t i2cAddress)
{
  handle = i2cOpen(i2cBus, i2cAddress, 0);
  std::cout << "i2c start handle: " << handle << std::endl;
  lcdWriteByte(0x33, COMMAND_MODE); // Initialise
  lcdWriteByte(0x32, COMMAND_MODE); // Initialise
  lcdWriteByte(0x06, COMMAND_MODE); // Cursor move direction
  lcdWriteByte(0x0C, COMMAND_MODE); // 0x0F On, Blink Off
  lcdWriteByte(0x28, COMMAND_MODE); // Data length, number of lines, font size
  lcdWriteByte(0x01, COMMAND_MODE); // Clear display
  gpioDelay(500);
}

void lcdClear()
{
  lcdWriteByte(0x01, COMMAND_MODE);
  gpioDelay(2000);
}