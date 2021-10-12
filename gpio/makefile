all: lcd-i2c.o gpio.o
	g++ -o main lcd-i2c.o gpio.o -Wall -pthread -lpigpio -lrt
	rm gpio.o lcd-i2c.o
gpio: gpio.cpp lcd-i2c.h
	g++ -c -g gpio.cpp
lcd: lcd-i2c.cpp lcd-i2c.h
	g++ -c -g lcd-i2c.cpp
clean:
	rm main gpio.o lcd-i2c.o