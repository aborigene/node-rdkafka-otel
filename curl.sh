#!/bin/bash
while [ 0 ]; do
	#curl 127.0.0.1:3000
	curl  "127.0.0.1:8081?message=Sample%20Message%20$RANDOM"
	sleep 1
done
