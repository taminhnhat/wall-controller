# DESCRIPTION
This project has 2 processes:
- C++ process: control gpio on rasberry pi board to turn on/off lights and read buttons
- Node.js process: main process that communicate with server using websocket  

Two processes communicate to each other using ipc (named-pipe).

# REQUIREMENTS
- Platform: raspberry pi 3 B+/4  
- Os: ubuntu server 20.04 LTS (without desktop)  
- Mongodb server for raspberry pi using this [guide](https://developer.mongodb.com/how-to/mongodb-on-raspberry-pi/)
- [Node.js](https://github.com/nodesource/distributions/blob/master/README.md) 14 or above
- gcc, g++, make - to build c++
- [pigpio](https://abyz.me.uk/rpi/pigpio/index.html) - an gpio library for c++

# INSTALLATION
- Install all [requirements](#requirements)
- [Set static dhcp](#set-static-dhcp)
- [Set static usb port path for scanner](#set-static-usb-port)
- [Create database](#Create-database)
- [Clone and build source from github](#get-and-build-project)

# OPERATING
- Do [THIS](#prepare-to-run) first!
- [Run test in console](#test)
- [Create and start service](#create-and-start-service)



## Set static dhcp

## Set static usb port
Plug in the usb port, then get usb port infor
```sh
$ udevadm info --name=/dev/ttyACM0 --attribute-walk
```

Rasberry pi usb port path

|Rasberry pi 3 B+|Rasberry pi 4|
| ------ | ------ |
|[image]()|[image]()|

Raspberry pi 3
-------------devpath-------------  
|||||||||||||||||||||||||||||||||  
||         ||  1.1.2 ||  1.3   ||  
||   RJ45  ||________||________||  
||         ||  1.1.3 ||  1.2   ||  
||||\   /||||________||________||  
|||||||||||||||||||||||||||||||||  
---------------------------------

Rasberry pi 4
-------------devpath-------------
|||||||||||||||||||||||||||||||||
||   1.3  ||  1.1   ||         ||
||________||________||   RJ45  ||
||   1.4  ||  1.2   ||         ||
||________||________||||\   /||||
|||||||||||||||||||||||||||||||||
---------------------------------

```sh
$ cd /etc/udev/rules.d/
$ sudo touch minhnhat.rules
$ sudo nano minhnhat.rules
```
Use idVendor, idProduct, devpath with path found above
```
KERNEL=="ttyACM[0-9]*",SUBSYSTEM=="tty",ATTRS{idVendor}=="065a",ATTRS{idProduct}=="a002",ATTRS{devpath}=="1.1", SYMLINK="frontScanner"  
KERNEL=="ttyACM[0-9]*",SUBSYSTEM=="tty",ATTRS{idVendor}=="065a",ATTRS{idProduct}=="a002",ATTRS{devpath}=="1.2",SYMLINK="backScanner"  
KERNEL=="ttyUSB[0-9]*",SUBSYSTEM=="tty",ATTRS{idVendor}=="067b",ATTRS{idProduct}=="2303",ATTRS{devpath}=="1.4",SYMLINK="lcdScreen"
```

```sh
$ sudo udevadm control --reload-rules
$ sudo udevadm trigger
```
Sometimes there's something wrong with devpath, just restart the pi
## Create database
```sh
$ cd ~/wall-controller
$ node ./initDatabase/createWallDb.js
```
Check database
```sh
# Access mongo shell
$ mongo
$ show dbs
# Check if database created, then check collections
$ use Wall_M1
$ show collections
```
The right 
## Get and build project
### 1. Clone frome github
```sh
cd ~/
git clone https://github.com/taminhnhat/wall-controller.git
npm install mongodb serialport socket.io-client dotenv
```

### 2. Build cpp
```sh
cd ~/wall-controller/gpio
make
```
After running "make", a executable file named "main"
### 3. Named pipe
```sh
cd ~/wall-controller/pipe
mkfifo emit_gpio
mkfifo button_callback
```

## Prepare to run
After installed all the requirements

Before run, find and kill pigoiod pid if exist
```sh
$ cat /var/run/pigpio.pid
$ sudo kill -9 <pid>
```
!!! Do not run 'sudo pigpiod'

Go to project directory to run to process  

## Test
Nodejs side that communicate with server
```sh
$ sudo node index.js > system.log
```

C++ side that control gpio on rasberry pi
```sh
$ cd ~/wall-controller/gpio
$ sudo ./main
```

## 2. RUN TEST

Start a new terminal window in project directory and create a socket client
```js
$ node
io = require('socket.io-client');
socket = io.connect('ws://localhost:3000');
```

Add command from user
```js
socket.emit('user:command', 'lightOn.M.1.1.front');
socket.emit('user:command', 'lightOff.M.2.1.back');
socket.emit('user:command', 'lightTest.M.1.1.front');
```

## Create and start service


## STARTUP SCRIPT IN PI

Create a new servive
```sh
$ sudo touch /etc/systemd/system/minhnhat.service
$ sudo nano /etc/systemd/system/minhnhat.service
```

>[Unit]  
>Description=Startup  
>
>[Service]  
>ExecStart=/home/ubuntu/startup/startup.sh  
>
>[Install]  
>WantedBy=default.target

Create a shell script
```sh
$ sudo nano /home/ubuntu/startup/startup.sh
```
> #!/bin/bash  
>date > /root/report.txt  
>du -sh /home/ >> /root/report.txt  
>sudo node /home/ubuntu/startup/startup.js
```sh
$ sudo chmod 744 /home/ubuntu/startup/startup.sh
$ sudo chmod 664 /etc/systemd/system/minhnhat.service
$ systemctl daemon-reload
$ systemctl enable minhnhat.service
# Test the script
$ systemctl start minhnhat.service
$ cat /root/report.txt
# Reboot
$ sudo reboot
```

## 7. Error

Sometimes c++ process cannot run, this line printed on the console eternally
> gpioTick: pigpio uninitialised, call gpioInitialise()


## 7. WORKING WITH SERVICE

Start
```sh
$ systemctl start minhnhat.service
```

Stop
```sh
$ systemctl stop minhnhat.service
```

Restart
```sh
$ systemctl restart minhnhat.service
```

Get status
```sh
$ systemctl status minhnhat.service
```




## 8. LOCK EDITTING FILES

Give the owner rx permissions, but not w 
```sh
$ chmod u=rx file
``` 
Deny rwx permission for group and others  
```sh
$ chmod go-rwx file
```
Give write permission to the group
```sh
$ chmod g+w file
```
Give execute permission to everybody
```sh
$ chmod a+x file1 file2
```

OK to combine like this with a comma
```sh
$ chmod g+rx,o+x file  
```

## 9. View service log
```sh
# help
$ journalctl -h
# view log
$ journalctl -u minhnhat.service
```

## 3. TIP AND TRICK

### Shutdown
```sh
$ sudo shutdown -h now
```

### Reboot
```sh
$ sudo reboot
```

### Send file to rasberry pi
```sh
$ scp index.js ubuntu@172.16.0.89:~/wallController
```

### Replace pi with username
```sh
$ killall -u pi
```

### Change password for user ubuntu
```sh
>sudo passwd ubuntu
```

### View hardware
```sh
$ hwinfo
$ hwinfo --short
```

### View memmory
```sh
$ free
```

### Set PS1
```sh
// review PS1 variable
$ echo $PS1
// edit PS1
$ sudo nano ~/.bash_profile
```
>export PS1=\[\e]0;\u@\h: \w\a\]${debian_chroot:+($debian_chroot)}\[\033[01;32m\]Wall-M3 \u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$
```sh
$ source ~/.bash_profile
```

# API
## Incoming message
### 1.Turn light on or off

### 2.Error alert

## Outcoming message
### 1.New tote scaned

### 2.Tote put to wall

### 3.Tote pick to light

### 4.Error alert

