# DESCRIPTION
This project has 2 processes:
- GPIO process: control gpio on rasberry pi board to turn on/off lights and read buttons
- GATEWAY process: main process that communicate with server using websocket  

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
- [Create pipes](#named-pipe)
- [Create and start service](./service/readme.md)

# API
## 1. Interface
Websockets using socket.io  
Wall-controller run as a client.
## 2. Incoming events
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
    clientId: "server_name",
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


## 3. Outgoing events
### 3.1. New tote scaned put to wall
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
    clientId: "wall-controller_M-1",
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
    clientId: "wall-controller_M-1",
    bookstoreId: "67",
    version: "1.0.0",
    params: {
        value: "L-10"
    },
    date: "Mon Sep 13 2021 14:46:46 GMT+0700 (Indochina Time)",
    key: "1631519378148-q2i3o9"
} 
```
### 3.3. Pick tote from wall
|Property|Type|Description|  
|---|---|---|
|name|String|name of api|
|clientId|String|ID of wall|
|bookstoreId|String|ID of bookstore|
|version|String|api version|
|value|String|name of the tote pick from wall|
|key|String|stand for a complete action on the wall used on client side, just ignore it|
Example:
```json
"pickToLight": {
    name: "pickToLight",
    clientId: "wall-controller_M-1",
    bookstoreId: "67",
    version: "1.0.0",
    params: {
        value: "L-11",
        wall: "M-2-3"
    },
    date: "Mon Sep 13 2021 14:46:46 GMT+0700 (Indochina Time)",
    key: "1631519378148-q2i3o9"
} 
```
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

# Get and build project
## 1. Clone frome github
```sh
$ cd ~/
$ git clone https://github.com/taminhnhat/wall-controller.git
$ npm install mongodb serialport socket.io-client dotenv
```

## 2. Build cpp
```sh
$ cd ~/wall-controller/gpio
$ make all
```
After running "make", a executable file named "main"
# Named pipe
Create pipes for communication between to process
```sh
$ cd ~/wall-controller/pipe
$ mkfifo emit_gpio
$ mkfifo button_callback
```

# Prepare to run
After installed all the requirements

Before run, find and kill pigoiod pid if exist
```sh
$ cat /var/run/pigpio.pid
$ sudo kill -9 <pid>
```
!!! Do not run 'sudo pigpiod'

# Error

Sometimes c++ process cannot run, this line printed on the console eternally
> gpioTick: pigpio uninitialised, call gpioInitialise()




