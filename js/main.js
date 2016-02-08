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

function getCaretPosition(element) {
  var caretOffset = 0;
  var doc = element.ownerDocument || element.document;
  var win = doc.defaultView || doc.parentWindow;
  var sel;
  if (typeof win.getSelection != "undefined") {
    sel = win.getSelection();
    if (sel.rangeCount > 0) {
      var range = win.getSelection().getRangeAt(0);
      var preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      caretOffset = preCaretRange.toString().length;
    }
  } else if ( (sel = doc.selection) && sel.type != "Control") {
    var textRange = sel.createRange();
    var preCaretTextRange = doc.body.createTextRange();
    preCaretTextRange.moveToElementText(element);
    preCaretTextRange.setEndPoint("EndToEnd", textRange);
    caretOffset = preCaretTextRange.text.length;
  }
  return caretOffset;
}

function Player(side) {
  this.time = [];
  this.timer = document.querySelector('#' + side + '-time');
}

function GameClock(players) {
  this.referenceTime = null;
  this.active = null;
  this.players = [];

  for (i = 0, len = players.length; i < len; i++) {
    var player = new Player(players[i]);
    this.players.push(player);
  }

  this.currentPlayer = this.players[DEFAULT_STARTING_PLAYER];
}

GameClock.prototype.parse = function(timer) {
  var values       = timer.innerHTML.split(':'),
      mayHaveMS    = values[values.length - 1].split('.'),    
      milliseconds = mayHaveMS[1] ? mayHaveMS[1].substr(0, 3) : 0,
      seconds      = mayHaveMS[0] || 0,
      minutes      = values[values.length - 2] || 0,
      hours        = values[values.length - 3] || 0;
  return parseInt(milliseconds) + (parseInt(seconds) * 1000) + (parseInt(minutes) * 60000) + (parseInt(hours) * 3600000);
};

GameClock.prototype.display = function(time, timer) {
  var milliseconds,
      seconds,
      hours,
      minutes;

  milliseconds = time % 1000;

  hours = time - milliseconds;
  hours /= 1000;
  seconds = hours % 60;

  hours -= seconds;
  hours /= 60;
  minutes = hours % 60;

  hours -= minutes;
  hours /= 60;

  timer.innerHTML = padNumber(hours, 2) + ':' + padNumber(minutes, 2) + ':' + padNumber(seconds, 2) + '.' + padNumber(milliseconds, 3);
};

GameClock.prototype.warn = function(timer, warning, times) {
  var original = timer.innerHTML,
      iter     = times * 2;

  timer.setAttribute('contenteditable', 'false');
  timer.innerHTML = warning;

  var interval = setInterval(function() {
        timer.classList.toggle('configuring');
        timer.classList.toggle('warning');
        iter--;
        if (iter == 0) {
          clearInterval(interval);
          timer.innerHTML = original;
          timer.setAttribute('contenteditable', 'true');
        }
      }, 500);
}

GameClock.prototype.save = function() {
  var l = this.players.length;
  for (var i = 0; i < l; i++) {
    var time = this.parse(this.players[i].timer)
    if (Number.isNaN(time)) {
      this.warn(this.players[i].timer, "INVALID TIME", 3);
      throw "NaN";
    }
    this.players[i].time.push(time);
    this.players[i].time.push(time * DEFAULT_WARNING_THRESHOLD);
    this.display(time, this.players[i].timer);
  }
  for (var i = 0; i < l; i++) {
    this.players[i].timer.classList.remove('configuring');
    this.players[i].timer.setAttribute('contenteditable', 'false');
  }
};

GameClock.prototype.run = function() {
  var currentTime = new Date().getTime();

  this.currentPlayer.time[0] -= currentTime - this.referenceTime;
  this.referenceTime = currentTime;

  if (this.currentPlayer.time[0] <= 0) {
    this.currentPlayer.timer.classList.remove('running', 'warning')
    this.currentPlayer.timer.classList.add('finished');
    this.display(0, this.currentPlayer.timer);
    this.stop();
  } else {
    if (this.currentPlayer.time[0] <= this.currentPlayer.time[1]) {
      this.currentPlayer.timer.classList.remove('running');
      this.currentPlayer.timer.classList.add('warning');
    } else {
      this.currentPlayer.timer.classList.add('running');
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

GameClock.prototype.operate = function(evt) {
  switch (evt.keyCode) {

    case START_KEYCODE:

      evt.preventDefault();
      if (this.active) {
        this.currentPlayer.timer.classList.remove('running', 'warning');
        this.currentPlayer = this.players[this.players.indexOf(this.currentPlayer) + 1] || this.players[0];
      } else if (this.active == false) {
        this.start();
      }
      break;

    case PAUSE_KEYCODE:

      evt.preventDefault();
      if (this.active) {
        this.stop();
      } else if (this.active == false) {
        this.start();
      }
      break;
  }
};

GameClock.prototype.input = function(evt) {
  var keycode = evt.keyCode;
  switch (true) {

    case (keycode == 13 || keycode == 32): // enter & spacebar key

      evt.preventDefault();
      try {
          this.save();
      }
      catch (err) {
        break;
      }
      this.start();
      break;

    case ((keycode > 47 && keycode < 58) || // number keys
          (keycode > 95 && keycode < 112)): // numpad keys

      var position = getCaretPosition(document.activeElement),
          text     = document.activeElement.innerHTML;

    if (position == text.length || text[position].search(/[:.]/) == 0) {
        evt.preventDefault();
      } else if (text[position].search(/[\d\-]/) == 0) {
        document.activeElement.innerHTML = text.slice(0, position) + text.slice(position + 1, text.length);
        var range = document.createRange();
        var sel = window.getSelection();
        range.setStart(document.activeElement.childNodes[0], position);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      break;

    case (keycode == 13 ||                    // return key
          (keycode > 64 && keycode < 91) ||   // letter keys
          (keycode > 185 && keycode < 193) || // ;=,-./` (in order)
          (keycode > 218 && keycode < 223)):  // [\]' (in order)

      evt.preventDefault();
      break;

    case (keycode == 8): // backspace key

      var position = getCaretPosition(document.activeElement),
          text     = document.activeElement.innerHTML;

      if (position > 0) {
        evt.preventDefault();
        if (text[position - 1].search(/[\d\-]/) == 0) {
          document.activeElement.innerHTML = text.slice(0, position - 1) + '-' + text.slice(position, text.length);
        }
        var range = document.createRange();
        var sel = window.getSelection();
        range.setStart(document.activeElement.childNodes[0], position - 1);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      break;

    case (keycode == 46): // delete key

      var position = getCaretPosition(document.activeElement),
          text     = document.activeElement.innerHTML;

      evt.preventDefault();

      if (text[position].search(/[\d\-]/) == 0) {
        document.activeElement.innerHTML = text.slice(0, position) + '-' + text.slice(position + 1, text.length);
        var range = document.createRange();
        var sel = window.getSelection();
        range.setStart(document.activeElement.childNodes[0], position);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      break;
  }
}

window.onload = function main() {
  var gameClock = new GameClock(PLAYERS);

  for (var i = 0, l = gameClock.players.length; i < l; i++) {
    gameClock.display(DEFAULT_TIME_CONTROL, gameClock.players[i].timer);
    gameClock.players[i].timer.classList.add('configuring');
  }
  gameClock.players[0].timer.focus();

  document.onkeydown = function(evt) {
    evt = evt || window.event;
    if (document.activeElement.classList.contains('time')) {
      gameClock.input(evt);
    } else if (document.activeElement.classList.length == 0 && !evt.repeat) {
      gameClock.operate(evt);
    }
  }
};
