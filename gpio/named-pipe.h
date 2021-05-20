/**
 * 
 */
#include <iostream>
#include <stdio.h>
#include <string.h>
#include <fcntl.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>


/*Init pipes
*/
class mypipe {
private:
    char readPipe_path[50];
    char writePipe_path[50];
    int rpipe, wpipe;
    char readBuffer[100];
    bool log;
    bool started;
public:
    mypipe(char*, char*);
    ~mypipe();
    int writePipe(char*, int);
    int readPipe(char*);
    int readAvailable();
    void init(char*, char*);
    void startPipe();
    void closePipe();
    void setEnableLog(bool);
};

/*Init pipes with input paths
*/
mypipe::mypipe(char* readPipe_path, char* writePipe_path){
    strcpy(this->readPipe_path, readPipe_path);
    strcpy(this->writePipe_path, writePipe_path);
    this->log = true;
    this->started = false;
}

mypipe::~mypipe(){
    //
}

/* Write to pipe
Return -1:"not start pipe yet"|1:"write success"
*/
int mypipe::writePipe(char* str, int sz){
    if(!this->started){
        return -1;
    }
    else{
        write(this->wpipe, str, sz);
        if(this->log) std::cout << "Write to pipe:" << str << std::endl;
        return 1;
    }
}

/* Read from pipe
Return -1:"not start pipe yet"|1:"read complete"
*/
int mypipe::readPipe(char* dest){
    if(!this->started){
        return -1;
    }
    else{
        strcpy(dest, this->readBuffer);
        return 1;
    }
}

int mypipe::readAvailable(){
    char arr[100];
    int rlen = read(this->rpipe, arr, sizeof(arr));
    if(rlen > 0){
        strcpy(this->readBuffer, arr);
        return 1;
    }
    else return 0;
}

void mypipe::init(char*readpipe_path, char*writepipe_path){
    std::cout << readpipe_path << "|" << writepipe_path << std::endl;
    char * str1, *str2;
    str1 = strcpy(this->readPipe_path, readPipe_path);
    str2 = strcpy(this->writePipe_path, writePipe_path);
}

void mypipe::startPipe(){
    std::cout << "pipe start:" << this->readPipe_path << "|" << this->writePipe_path << std::endl;
    mkfifo(this->readPipe_path, 0666);
    mkfifo(this->writePipe_path, 0666);

    rpipe = open(this->readPipe_path, O_RDONLY|O_NONBLOCK);
    if(this->log) std::cout << "read pipe opened" << std::endl;

    wpipe = open(this->writePipe_path, O_WRONLY|O_NONBLOCK);
    if(this->log) std::cout << "write pipe opened" << std::endl;

    this->started = true;
}

void mypipe::closePipe(){
    close(this->rpipe);
    close(this->wpipe);

    this->started = false;
}

void mypipe::setEnableLog(bool flag){
    this->log = flag;
}