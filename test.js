var counter = 50;
var pack = 5;
var i =0;
for(i = 0; i< counter; i++){
	var remainder = i % pack;
	console.log("Counter: " + i + ", pack: "+ remainder);
}
console.log(10 % 5);
