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
- [Set static dhcp](./static-dhcp/readme.md)
- [Set static usb port path for scanner](./static-dhcp/readme.md)
- [Create database](./initDatabase/readme.md)
- [Clone and build source from github](#get-and-build-project)

# OPERATING
- Do [THIS](#prepare-to-run) first!
- [Run test in console](#test)
- [Create and start service](#create-and-start-service)

# API
## 1. Interface
Websockets using socket.io  
Wall-controller run as a client.
## 2. Events
### 2.1. To turn on or off light on wall
|Property|Type|Description|  
|---|---|---|
|name|String: {"lightOn", "lightOff"}|name of api|
|clientId|String|Server id|
|bookstoreId|String|ID of bookstore|
|wall|String|name of the bin on the wall|
|side|String: {"front", "back"}|"front": stow package into wall; "back": take package from wall|
|key|String|stand for a complete action on the wall used on client side, just ignore it|
Example:
```json
"LightOn": {
    name: "lightOn",
    clientId: "App1Fahasa",
    bookstoreId: "67",
    version: "1.0.0",
    params: {
        wall: "M-1-4",
        side: "front"
    },
    date: "Mon Sep 13 2021 14:46:46 GMT+0700 (Indochina Time)",
    key: "1631519378148-q2i3o9"
}
```
### 2.2. Send confirm


### 3.1. New tote scaned
|Property|Type|Description|  
|---|---|---|
|name|String|name of api|
|clientId|String|ID of wall|
|bookstoreId|String|ID of bookstore|
|version|String|api version|
|value|String|name of the tote scanned|
|key|String|stand for a complete action on the wall used on client side, just ignore it|
Example:
```json
"scanTotePushToWall": {
    name: "scanTotePushToWall",
    clientId: "wall-controller-M-1",
    bookstoreId: "67",
    version: "1.0.0",
    params: {
        value: "L-10"
    },
    date: "Mon Sep 13 2021 14:46:46 GMT+0700 (Indochina Time)",
    key: "1631519378148-q2i3o9"
}
```
### 3.2. Put tote to wall
|Property|Type|Description|  
|---|---|---|
|name|String|name of api|
|clientId|String|ID of wall|
|bookstoreId|String|ID of bookstore|
|version|String|api version|
|value|String|name of the tote push to wall|
|key|String|stand for a complete action on the wall used on client side, just ignore it|
Example:
```json
"pushToWall": {
    name: "pushToWall",
    clientId: "wall-controller-M-1",
    bookstoreId: "67",
    version: "1.0.0",
    params: {
        value: "L-10"
    },
    date: "Mon Sep 13 2021 14:46:46 GMT+0700 (Indochina Time)",
    key: "1631519378148-q2i3o9"
} 
```
### 3.3. 
# IPC
Gateway process communicate with GPIO process via named-pipe located at /tmp/
- To emit event send to GPIO process: write to /tmp/emit_gpio
- To handle event from GPIO process: read from /tmp/gpio_callback
## 1. Emit event to GPIO
### Emit light
Message structure:
"light:bitmap:side\n"
|Property|Type|Description|  
|---|---|---|
|light|Constant||
|bitmap|Number|Light bitmap|
|side|String|Wall side {"front", "back"}|
Example:
```
light:512:front
```
### LCD print
Message structure:
"lcd:message\n"
|Property|Type|Description|  
|---|---|---|
|lcd|Constant||
|message|String|Message to print on lcd|
Example:
```
lcd:wall start
```

## 2. Handle event from GPIO
### Button on pin
Message structure:
"button:W.x.y\n"
|Property|Type|Description|  
|---|---|---|
|button|Constant||
|W|Constant||
|x|Number|column of bin on wall|
|y|Number|row of bin on wall|
Example:
```
button:W.3.4
```
### Button on Electrical cabin
Message structure:
"button:U.x.y\n"
|Property|Type|Description|  
|---|---|---|
|button|Constant||
|W|Constant||
|x|Number|column of bin on wall|
|y|Number|row of bin on wall|
Example:
```
button:W.3.4
```

## Get and build project
### 1. Clone frome github
```sh
$ cd ~/
$ git clone https://github.com/taminhnhat/wall-controller.git
$ npm install mongodb serialport socket.io-client dotenv
```

### 2. Build cpp
```sh
$ cd ~/wall-controller/gpio
$ make all
```
After running "make", a executable file named "main"
### 3. Named pipe
```sh
$ cd ~/wall-controller/pipe
$ mkfifo emit_gpio
$ mkfifo button_callback
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

