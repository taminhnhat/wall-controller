main: lcd.o gpio.o
	g++ -o main lcd-i2c.o gpio.o -Wall -pthread -lpigpio -lrt
gpio.o: gpio.cpp lcd-i2c.h
	g++ -c -g gpio.cpp
lcd.o: lcd-i2c.cpp lcd-i2c.h
	g++ -c -g lcd-i2c.cpp