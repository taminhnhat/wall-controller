run: lcd.o lcd-i2c.o
	g++ -o main lcd.o lcd-i2c.o -Wall -pthread -lpigpio -lrt
gpio.o: gpio.cpp lcd-i2c.h
	g++ -c -g lcd.cpp
lcd.o: lcd-i2c.cpp lcd-i2c.h
	g++ -c -g lcd-i2c.cpp