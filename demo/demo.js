var imgUrl = 'rabbit-big.png';
var ele = document.getElementById('rabit');
var positions = ['0 -854', '-172 -852', '-349 -852', '-524 -852', '-698 -850', '-874 -847']

animation(ele, positions, imgUrl);
function animation(ele, positions, imgUrl) {
	ele.style.backgroundImage = 'url(' + imgUrl + ')';
	ele.style.backgroundRepeat = 'no-repeat';
	var index = 0;

	function run() {
		var position = positions[index].split(' ');
		ele.style.backgroundPosition = position[0] + 'px ' + position[1] + 'px';
		index++;
		if (index >= positions.length) {
			index = 0;
		}
		setTimeout(run, 80);
	}
	run();
}

