var DEFAULT_TIME_CONTROL      = 600000,            // milliseconds
    DEFAULT_STARTING_PLAYER   = 0,                 // index in PLAYERS
    DEFAULT_WARNING_THRESHOLD = 0.2,
    PAUSE_KEYCODE             = 80,
    START_KEYCODE             = 32,
    PLAYERS                   = ['left', 'right'];

function padNumber(number, zeroes) {
  var paddedNumber = '00' + number;
  return paddedNumber.substr(paddedNumber.length - zeroes);
}

function Player(side) {
  this.time = [];
  this.timer = {
    container: document.querySelector('#' + side + '-time'),
    hours: document.querySelector('#' + side + '-time :first-child'),
    minutes: document.querySelector('#' + side + '-time :nth-child(3)'),
    seconds: document.querySelector('#' + side + '-time :nth-child(5)'),
    milliseconds: document.querySelector('#' + side + '-time :last-child')
  };
}

function GameClock(players) {
  this.currentPlayer = null;
  this.referenceTime = null;
  this.active = null;
  this.players = [];

  for (i = 0, len = players.length; i < len; i++) {
    var player = new Player(players[i]);
    this.players.push(player);
  }
}

GameClock.prototype.parse = function(timer) {
  var milliseconds = timer.milliseconds.value || 0,
      seconds      = timer.seconds.value || 0,
      minutes      = timer.minutes.value || 0,
      hours        = timer.hours.value || 0;
  return parseInt(milliseconds) + (parseInt(seconds) * 1000) + (parseInt(minutes) * 60000) + (parseInt(hours) * 3600000);
};

GameClock.prototype.display = function(time, timer) {
  var milliseconds,
      seconds,
      hours,
      minutes;
  milliseconds = time % 1000;
  timer.milliseconds.value = padNumber(milliseconds,3);
  hours = time - milliseconds;
  hours /= 1000;
  seconds = hours % 60;
  timer.seconds.value = padNumber(seconds,2);
  hours -= seconds;
  hours /= 60;
  minutes = hours % 60;
  timer.minutes.value = padNumber(minutes,2);
  hours -= minutes;
  hours /= 60;
  timer.hours.value = padNumber(hours,2);
};

GameClock.prototype.save = function() {
  var inputs = document.querySelectorAll('.time input:enabled');

  for (var i = 0, l = inputs.length; i < l; i++) {
    inputs[i].setAttribute('disabled', 'disabled');
  }

  for (var i = 0, l = this.players.length; i < l; i++) {
    this.players[i].time.push(this.parse(this.players[i].timer));
    this.players[i].time.push(this.players[i].time[0] * DEFAULT_WARNING_THRESHOLD);
    this.players[i].timer.container.classList.remove('configuring');
  }

  this.currentPlayer = this.players[DEFAULT_STARTING_PLAYER];
};

GameClock.prototype.run = function() {
  var currentTime = new Date().getTime();

  this.currentPlayer.time[0] -= currentTime - this.referenceTime;
  this.referenceTime = currentTime;

  if (this.currentPlayer.time[0] <= 0) {
    this.currentPlayer.timer.container.classList.remove('running', 'warning')
    this.currentPlayer.timer.container.classList.add('finished');
    this.display(0, this.currentPlayer.timer);
    this.stop();
  } else {
    if (this.currentPlayer.time[0] <= this.currentPlayer.time[1]) {
      this.currentPlayer.timer.container.classList.remove('running');
      this.currentPlayer.timer.container.classList.add('warning');
    } else {
      this.currentPlayer.timer.container.classList.add('running');
    }

    this.display(this.currentPlayer.time[0], this.currentPlayer.timer);
  }
};

GameClock.prototype.start = function() {
  var self = this;

  this.referenceTime = new Date().getTime();
  this.active = setInterval(function() {
    self.run();
  }, 1);
};

GameClock.prototype.stop = function() {
  clearInterval(this.active);
  this.active = false;
};

GameClock.prototype.operate = function(key) {
  switch (key) {
    case START_KEYCODE:
      if (this.active) {
        this.currentPlayer.timer.container.classList.remove('running', 'warning');
        this.currentPlayer = this.players[this.players.indexOf(this.currentPlayer) + 1] || this.players[0];
      } else {
        if (this.active == null) {
          this.save();
        }
        this.start();
      }
      break;
    case PAUSE_KEYCODE:
      if (this.active) {
        this.stop();
      } else if (this.active == false) {
        this.start();
      }
      break;
  }
};

window.onload = function main() {
  var gameClock = new GameClock(PLAYERS);

  for (var i = 0, l = gameClock.players.length; i < l; i++) {
    gameClock.display(DEFAULT_TIME_CONTROL, gameClock.players[i].timer);
    gameClock.players[i].timer.container.classList.add('configuring');
  }

  gameClock.players[0].timer.hours.focus();

  document.onkeydown = function(evt) {
    evt = evt || window.event;
    gameClock.operate(evt.keyCode);
  }
};
