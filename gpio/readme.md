There are 2 pipes:

"pipe_emit_light" used to transmit light events from nodejs process to c++ process

"pipe_button_callback" used to transmit button events from c++ process to nodejs process

### Create pipes in terminal:
>cd (...)/wall-controller/pipe
>mkfifo pipe_emit_light
>mkfifo pipe_button_callback
>ls -al
--------output-------------
    total 8
    drwxrwxr-x 2 ubuntu ubuntu 4096 May 19 08:08 .
    drwxrwxr-x 4 ubuntu ubuntu 4096 May 19 08:27 ..
    prw-rw-r-- 1 ubuntu ubuntu    0 May 19 08:36 pipe_emit_light
    prw-rw-r-- 1 ubuntu ubuntu    0 May 19 08:08 pipe_button_callback
---------------------------
# makesure pipes were not created by root (user here is "ubuntu"), or you cannot access it in the future


### Compile c++
>cd (...)/wall-controller/pipe
>g++ -Wall gpio.cpp -o gpio -pthread -lpigpio -lrt