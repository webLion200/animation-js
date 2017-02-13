'use strict';

var loadImage = require('./imageloader');
var Timeline = require('./timeline');

var STATE_INITIAL = 0;
var STATE_START = 1;
var STATE_STOP = 2;
//同步任务
var TASK_SYNC = 0;
//异步任务
var TASK_ASYNC = 1;
/**
 * 简单的函数封装，执行callback
 * @param callback 执行的函数
 */
function next(callback) {
	callback && callback();
}

/**
 * 帧动画库
 * @constructor
 */
function Animation() {
	this.taskQueue = [];
	this.state = STATE_INITIAL;
	this.timeline = new Timeline();
	this.index = 0;
}
/**
 * 添加一个同步任务，预加载图片
 * @param imglist 图片数组
 */
Animation.prototype.loadImage = function (imglist) {
	var taskFn = function (next) {
		loadImage(imglist.slice(), next);
	};
	var type = TASK_SYNC;
	return this._add(taskFn, type);
};
/**
 * 添加一个异步定时任务，改变图片背景位置，实现帧动画
 * @param ele dom对象
 * @param positions 背景位置数组
 * @param imageUrl 图片地址
 */
Animation.prototype.changePosition = function (ele, positions, imgUrl) {
	var len = positions.length;
	var taskFn;
	var type;
	if (len) {
		var me = this;
		taskFn = function (next, time) {
			//如果指定图片，则设置dom对象的背景图片地址
			if (imgUrl) {
				ele.style.backgroundImage = 'url(' + imgUrl + ')';
			}
			//获得当前背景图片位置索引
			var index = Math.min(time / me.interval | 0, len);
			var position = positions[index - 1].split(' ');
			ele.style.backgroundPosition = position[0] + 'px ' + position[1] + 'px';
			//当前任务执行完毕
			if (index === len) {
				next();
			}
		};
		type = TASK_ASYNC;
	} else {
		taskFn = next;
		type = TASK_SYNC;
	}

	return this._add(taskFn, type);
};
/**
 * 添加一个异步定时任务，改变图片地址，实现帧动画
 * @param ele dom对象
 * @param imglist 图片地址数组
 */
Animation.prototype.changeSrc = function (ele, imglist) {
	var len = imglist.length;
	var taskFn;
	var type;
	if (len) {
		var me = this;
		taskFn = function (next, time) {
			//获得当前的图片索引
			var index = Math.min(time / me.interval | 0, len);
			//改变image对象的图片地址
			ele.src = imglist[index - 1];
			//当前任务执行完毕
			if (index === len) {
				next();
			}
		};
		type = TASK_ASYNC
	} else {
		taskFn = next;
		type = TASK_SYNC;
	}
	return this._add(taskFn, type);
};
/**
 * 添加一个异步定时执行的任务
 * 该任务自定义动画每帧执行的函数
 * @param taskFn 每帧执行的任务函数
 */
Animation.prototype.enterFrame = function (taskFn) {
	return this_add(taskFn, TASK_ASYNC);
};
/**
 * 添加一个同步任务，上一个任务完成后执行的回掉函数
 * @param callback 回掉函数
 */
Animation.prototype.then = function (callback) {
	var taskFn = function (next) {
		callback(this);
		next();
	};
	var type = TASK_SYNC;
	return this._add(taskFn, type);
};
/**
 * 开始执行任务
 * @param interval 异步定时任务执行的时间间隔
 */
Animation.prototype.start = function (interval) {
	if (this.state === STATE_START) {
		return this;
	}
	if (!this.taskQueue.length) {
		return this;
	}
	this.state = STATE_START;

	this.interval = interval;
	this._runTask();
	return this;
};
/**
 * 添加一个同步任务，回退到上一个任务中，实现重复上一个任务的效果
 * @param times 重复次数
 */
Animation.prototype.repeat = function (times) {
	var me = this;
	var taskFn = function () {
		if (typeof times === 'undefined') {
			//无限回退到上一个任务
			me.index--;
			me._runTask();
			return;
		}
		if (times) {
			times--;
			//回退到上一个任务
			me.index--;
			me._runTask();
		} else {
			//达到重复执行次数，则跳转到下一个任务
			var task = me.taskQueue[me.index];
			me._next(task);
		}
	};
	var type = TASK_SYNC;

	return this._add(taskFn, type);
};
/**
 * 添加一个同步任务，无线循环上一次任务
 */
Animation.prototype.repeatForever = function () {
	return this.repeat();
};
/**
 * 设置当前任务结束后下一个任务开始前需要等待的时间
 * @param time 等待时长
 */
Animation.prototype.wait = function (time) {
	if (this.taskQueue && this.taskQueue.length > 0) {
		this.taskQueue[this.taskQueue.length - 1].wait = time;
	}
	return this;
};
/**
 * 暂停当前执行的异步定时任务
 */
Animation.prototype.pause = function () {
	if (this.state === STATE_START) {
		this.state = STATE_STOP;
		this.timeline.stop();
		return this;
	}
	return this;
};
/**
 * 重新开始执行当前的异步定时任务
 */
Animation.prototype.restart = function () {
	if (this.state === STATE_STOP) {
		this.state = STATE_START;
		this.timeline.restart();
		return this;
	}
	return this;
};
/**
 * 释放资源
 */
Animation.prototype.dispose = function () {
	if (this.state !== STATE_INITIAL) {
		this.state = STATE_INITIAL;
		this.taskQueue = null;
		this.timeline.stop();
		this.timeline = null;
		return this;
	}
	return this;
};
/**
 * 添加一个任务到任务队列中
 * @param taskFn 任务方法
 * @param type 任务类-型
 * @returns {Animation}
 * @private
 */
Animation.prototype._add = function (taskFn, type) {
	this.taskQueue.push({
		taskFn: taskFn,
		type: type
	});
	return this;
};
/**
 * 执行任务
 * @private
 */
Animation.prototype._runTask = function () {
	if (!this.taskQueue || this.state !== STATE_START) {
		return;
	}
	if (this.index === this.taskQueue.length) {
		this.dispose();
		return;
	}
	var task = this.taskQueue[this.index];
	if (task.type === TASK_SYNC) {
		this._syncTask(task);
	} else {
		this._asyncTask(task);
	}
};
/**
 * 同步任务
 * @param task 执行任务的函数
 * @private
 */
Animation.prototype._syncTask = function (task) {
	var me = this;
	var next = function () {
		// 切换到笑一个任务
		me._next(task);
	};
	var taskFn = tash.taskFn;
	taskFn(next);
};
/**
 * 异步任务
 * @param task
 * @private
 */
Animation.prototype._asyncTask = function (task) {
	var me = this;
	// 每一帧执行的回调函数
	var enterframe = function (time) {
		var taskFn = task.taskFn;
		var next = function () {
			// 停止执行当前任务
			me.timeline.stop();
			// 执行下一个任务
			me._next(task);
		};
		taskFn(next, time);
	};

	this.timeline.onenterframe = enterframe;
	this.timeline.start(this.interval);
};
/**
 * 切换到下一个任务
 * @param task 下一个任务
 * @private
 */
Animation.prototype._next = function (task) {
	this.index++;
	this._runTask();
};