There are 2 pipes:

"emit_gpio" used to transmit messages from nodejs process to c++ process

"gpio_callback" used to transmit message from c++ process to nodejs process

### Create pipes in terminal:
>cd /tmp
>mkfifo emit_gpio
>mkfifo gpio_callback
>ls -al
--------output-------------
    total 8
    drwxrwxr-x 2 ubuntu ubuntu 4096 May 19 08:08 .
    drwxrwxr-x 4 ubuntu ubuntu 4096 May 19 08:27 ..
    prw-rw-r-- 1 ubuntu ubuntu    0 May 19 08:36 emit_gpio
    prw-rw-r-- 1 ubuntu ubuntu    0 May 19 08:08 gpio_callback
---------------------------.
### makesure pipes were not created by root (user here is "ubuntu"), or you must run script as root to access pipes in the future

[HOME](../README.md)
