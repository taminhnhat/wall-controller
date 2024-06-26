# DESCRIPTION

This project has 2 processes:

- GPIO process: control gpio on rasberry pi board to turn on/off lights and read buttons
- GATEWAY process: main process that communicate with server using websocket

Two processes communicate to each other using ipc (named-pipe).

# REQUIREMENTS

- Platform: raspberry pi 3 B+/4
- Os: ubuntu server 20.04 LTS (without desktop)
- Mongodb server for raspberry pi using this [guide](https://developer.mongodb.com/how-to/mongodb-on-raspberry-pi/)

**Note**: Install mongodb 4.4.18. Higher mongodb version requires a Sandy Bridge or newer CPU. Get a newer processor or use an older version of MongoDB.

```sh
sudo apt-get install -y mongodb-org=4.4.18 mongodb-org-server=4.4.18 mongodb-org-shell=4.4.18 mongodb-org-mongos=4.4.18 mongodb-org-tools=4.4.18
```

- [Node.js](https://github.com/nodesource/distributions/blob/master/README.md) 14 or 16
- gcc, g++, make

```sh
sudo apt update
sudo apt install build-essential
```

- [pigpio](https://abyz.me.uk/rpi/pigpio/index.html) - an gpio library for c++

# INSTALLATION

- Install all [requirements](#requirements)
- [Set static dhcp](./documentation/static-dhcp/readme.md)
- [Set static usb port path for scanner](./documentation/static-serialport/readme.md)
- [Create database](./initDatabase/readme.md)
- [Clone and build source from github](#get-and-build-project)
- [Install openvpn](./documentation/openvpn/readme.md)

# OPERATING

- Do [THIS](#prepare-to-run) first!
- [Run test in console](#test)
- [Create pipes](#named-pipe)
- [Create and start service](./documentation/service/readme.md)

# SERIAL DEBUG

```
# get info
GETINFO
# config, T180: 180 leds (60 leds per metter), C6: 6 nodes, N20: 20 leds per column (must less than 180/6=30), B50: brihgtness 50 (from 50 to 255)
CFG:T180.C6.N20.B50
# send color to 6 nodes (1 color per node)
R1:00ff00:00ffff:0000ff:ffff00:ff00ff:ffffff
# send color to 6 nodes (multi colors)
T5:54321:543:2:5431:12:123
```

# API

## 1. Interface

Websockets using socket.io  
Wall-controller run as a client.

## 2. Incoming events

### 2.1. To turn on or off light on wall

| Property    | Type                            | Description                                                                 |
| ----------- | ------------------------------- | --------------------------------------------------------------------------- |
| name        | String: {"lightOn", "lightOff"} | name of api                                                                 |
| clientId    | String                          | Server id                                                                   |
| bookstoreId | String                          | ID of bookstore                                                             |
| wall        | String                          | name of the bin on the wall                                                 |
| side        | String: {"front", "back"}       | "front": stow package into wall; "back": take package from wall             |
| key         | String                          | stand for a complete action on the wall used on client side, just ignore it |

Example:

```json
"mergeWall/LightOn": {
    name: "mergeWall/lightOn",
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

### 2.2. Send put to light confirm

| Property    | Type   | Description                                                                 |
| ----------- | ------ | --------------------------------------------------------------------------- |
| name        | String | name of api                                                                 |
| clientId    | String | Server id                                                                   |
| bookstoreId | String | ID of bookstore                                                             |
| version     | String | api version                                                                 |
| tote        | String | name of the tote push to wall                                               |
| wall        | String | name of the wall                                                            |
| key         | String | stand for a complete action on the wall used on client side, just ignore it |

Example:

```json
"mergeWall/confirmPutToLight": {
    name: "mergeWall/confirmPutToLight",
    clientId: "server_name",
    bookstoreId: "67",
    version: "1.0.0",
    params: {
        tote: "L-10",
        wall: "M-1-4"
    },
    date: "Mon Sep 13 2021 14:46:46 GMT+0700 (Indochina Time)",
    key: "1631519378148-q2i3o9"
}
```

### 2.3. Send pick to light confirm

| Property    | Type   | Description                                                                 |
| ----------- | ------ | --------------------------------------------------------------------------- |
| name        | String | name of api                                                                 |
| clientId    | String | Server id                                                                   |
| bookstoreId | String | ID of bookstore                                                             |
| version     | String | api version                                                                 |
| tote        | String | name of the tote pick from wall                                             |
| wall        | String | name of the wall                                                            |
| key         | String | stand for a complete action on the wall used on client side, just ignore it |

Example:

```json
"mergeWall/confirmPickToLight": {
    name: "mergeWall/confirmPickToLight",
    clientId: "server_name",
    bookstoreId: "67",
    version: "1.0.0",
    params: {
        tote: "L-11",
        wall: "M-1-4"
    },
    date: "Mon Sep 13 2021 14:46:46 GMT+0700 (Indochina Time)",
    key: "1631519378148-q2i3o9"
}
```

## 3. Outgoing events

### 3.1. New tote scaned put to wall

| Property    | Type   | Description                                                                 |
| ----------- | ------ | --------------------------------------------------------------------------- |
| name        | String | name of api                                                                 |
| clientId    | String | ID of wall                                                                  |
| bookstoreId | String | ID of bookstore                                                             |
| version     | String | api version                                                                 |
| tote        | String | name of the tote scanned                                                    |
| key         | String | stand for a complete action on the wall used on client side, just ignore it |

Example:

```json
"mergeWall/scanTotePutToLight": {
    name: "mergeWall/scanTotePutToLight",
    clientId: "MERGE_WALL_M-1",
    bookstoreId: "67",
    version: "1.0.0",
    params: {
        wallIndex: 1,
        tote: "L-10"
    },
    date: "Mon Sep 13 2021 14:46:46 GMT+0700 (Indochina Time)",
    key: "1631519378148-q2i3o9",
    token: "wcygwcl4f8439f8"
}
```

### 3.2. Put tote to wall

| Property    | Type   | Description                                                                 |
| ----------- | ------ | --------------------------------------------------------------------------- |
| name        | String | name of api                                                                 |
| clientId    | String | ID of wall                                                                  |
| bookstoreId | String | ID of bookstore                                                             |
| version     | String | api version                                                                 |
| tote        | String | name of the tote push to wall                                               |
| wall        | String | name of the wall                                                            |
| key         | String | stand for a complete action on the wall used on client side, just ignore it |

Example:

```json
"mergeWall/putToLight": {
    name: "mergeWall/putToLight",
    clientId: "MERGE_WALL_M-1",
    bookstoreId: "67",
    version: "1.0.0",
    params: {
        tote: "L-10",
        wall: "M-1-4"
    },
    date: "Mon Sep 13 2021 14:46:46 GMT+0700 (Indochina Time)",
    key: "1631519378148-q2i3o9",
    token: "wcygwcl4f8439f8"
}
```

### 3.3. Pick tote from wall

| Property    | Type   | Description                                                                 |
| ----------- | ------ | --------------------------------------------------------------------------- |
| name        | String | name of api                                                                 |
| clientId    | String | ID of wall                                                                  |
| bookstoreId | String | ID of bookstore                                                             |
| version     | String | api version                                                                 |
| tote        | String | name of the tote pick from wall                                             |
| wall        | String | name of the wall                                                            |
| key         | String | stand for a complete action on the wall used on client side, just ignore it |

Example:

```json
"mergeWall/pickToLight": {
    name: "mergeWall/pickToLight",
    clientId: "MERGE_WALL_M-1",
    bookstoreId: "67",
    version: "1.0.0",
    params: {
        wall: "M-1-4",
        importTote: ["L-18", "L-19"],
        exportTote: "L-11"
    },
    date: "Mon Sep 13 2021 14:46:46 GMT+0700 (Indochina Time)",
    key: "1631519378148-q2i3o9",
    token: "wcygwcl4f8439f8"
}
```

### 3.4. Cancel put to light

| Property    | Type   | Description                                                                 |
| ----------- | ------ | --------------------------------------------------------------------------- |
| name        | String | name of api                                                                 |
| clientId    | String | ID of wall                                                                  |
| bookstoreId | String | ID of bookstore                                                             |
| version     | String | api version                                                                 |
| tote        | String | name of the tote pick from wall                                             |
| wall        | String | name of the wall                                                            |
| key         | String | stand for a complete action on the wall used on client side, just ignore it |

Example:

```json
"mergeWall/cancelPutToLight": {
    name: "mergeWall/cancelPutToLight",
    clientId: "wall-controller_M-1",
    bookstoreId: "67",
    version: "1.0.0",
    params: {
        tote: "L-11",
        wall: "M-1-4"
    },
    date: "Mon Sep 13 2021 14:46:46 GMT+0700 (Indochina Time)",
    key: "1631519378148-q2i3o9",
    token: "wcygwcl4f8439f8"
}
```

### 3.5. Error

| Property    | Type   | Description                                                                 |
| ----------- | ------ | --------------------------------------------------------------------------- |
| name        | String | name of api                                                                 |
| clientId    | String | ID of wall                                                                  |
| bookstoreId | String | ID of bookstore                                                             |
| version     | String | api version                                                                 |
| message     | String | message error                                                               |
| tote        | String | name of the tote                                                            |
| wall        | String | name of the wall                                                            |
| key         | String | stand for a complete action on the wall used on client side, just ignore it |

Example:

```json
"mergeWall/error": {
    name: "mergeWall/error",
    clientId: "wall-controller_M-1",
    bookstoreId: "67",
    version: "1.0.0",
    params: {
        message: "Invalid wall",
        tote: "L-11",
        wall: "M-1-4"
    },
    date: "Mon Sep 13 2021 14:46:46 GMT+0700 (Indochina Time)",
    key: "1631519378148-q2i3o9",
    token: "wcygwcl4f8439f8"
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

Create .env file

```
SERVER_URL=<server url>
DATABASE_URL=<mongodb url> # eg: mongodb://localhost:27017
LOG_DIR=/home/ubuntu/logs
NODE_ENV=development
WALL_ID=<>
WALL_INDEX=<>
BOOKSTORE_ID=<>
DB_NAME=<>
RGB_HUB_PATH=/dev/ttyUSB0
# sending message to rgb hub every cycle in milisecond
RGB_HUB_SERIAL_CYCLE=100
TOKEN=<>
ENABLE_RGB_HUB=true
RGB_HUB_BAUDRATE=115200
RGB_HUB_RF_ENABLE=false
ENABLE_SCANNER_HUB=true
MULTI_USER_MODE=true
TOGGLE_LED_STRIP=true
ENABLE_PANEL_HUB=true
NUM_OF_LEDS_PER_ONE_STRIP=180
NUM_OF_ROW_ON_WALL=6
NUM_OF_COLUMN_ON_WALL=6
# logging mode: console/file
LOG_MODE=file

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
