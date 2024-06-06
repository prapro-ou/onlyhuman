const debug = true;

////////////////////////////////////////////////////////////////
/// Player
////////////////////////////////////////////////////////////////

class Player {
  /// Spawn player with ID at X, Y
  constructor(id, x = 0, y = 0) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.pose = 0; // current sprite patern.
    this.speed_factor = 0.5; // player's speed.
  }

  /// Draw player at SCREEN
  draw(screen) {
    if (debug) {
      console.log(`Player.draw id:${this.id}+${this.pose} at ${this.x}, ${this.y}`);
    }
    screen.put_sprite(this.x, this.y, this.id, this.pose);
  }

  /// Update player's state (location, pose, etc.) according to
  /// DELTA (time) and KEYSTATE
  update(delta, keystates) {
    // Adjust speed; average delta would be 1/60 seconds (17ms),
    // so, factor = 0.5 will make 8.
    delta = Math.trunc(delta * this.speed_factor);

    if (keystates[Key.Left]) {
      this.x -= delta;
      this.pose = 3 + (Math.trunc(this.x / 8) % 3);
    }
    if (keystates[Key.Right]) {
      this.x += delta;
      this.pose = 6 + (Math.trunc(this.x / 8) % 3);
    }
    if (keystates[Key.Up]) {
      this.y -= delta;
      this.pose = 9 + (Math.trunc(this.y / 8) % 3);
    }
    if (keystates[Key.Down]) {
      this.y += delta;
      this.pose = 0 + (Math.trunc(this.y / 8) % 3);
    }
    if (keystates[Key.Button1]) {
      // do nothing for now.
    }
  }
}

////////////////////////////////////////////////////////////////
/// GameState
////////////////////////////////////////////////////////////////

/// GameState は，ゲームの状態を表現するオブジェクト
///
/// 外部のタイマから，定期的 (約1/60) に update と draw が呼ばれます．
/// また，キーボードやゲームパッドの押下のコールバックとして toggle_key が呼ばれます．
///
class GameState {
  constructor() {
    this.players = [];
    this.keystates = [[], []];

    /// spawn two players id = 0, 1
    this.players.push(new Player(0, 100, 100));
    this.players.push(new Player(1, 200, 200));
  }

  draw(screen) {
    screen.clear();
    this.players.forEach(player => {
      player.draw(screen);
    });
  }

  toggle_key(player_id, key_symbol, state) {
    this.keystates[player_id][key_symbol] = state
  }

  update(delta) {
    this.players.forEach(player => {
      player.update(delta, this.keystates[player.id]);
    });
  }
}

////////////////////////////////////////////////////////////////
/// Screen and Sprites
////////////////////////////////////////////////////////////////

/// スクリーンをクリアする関数
///
/// ctx: canvas 要素の 2D コンテキスト
///
class Screen {
  constructor(width, height, ctx, sprites) {
    this.width = width;
    this.height = height;
    this.ctx = ctx;
    this.sprites = sprites;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  /// id に対応するキャラクタの pose パターンを描画
  put_sprite(x, y, id, pose = 0) {
    this.sprites.put_sprite(this.ctx, x, y, id, pose);
  }
}

/// スプライト画像を管理するクラス
///
/// image_path: スプライト並べた画像ファイルへのパス
/// grid_size:  スプライト1枚当りのサイズ
///
/// スプライト画像は grid_size の正方形をタイル状に並べたものタイル画
/// 像は，y軸方向に異なるキャラクタ，x軸方向に1キャラクタの pose 変
/// 化を並べたもの
///
/// 参考: assets/sprites.png
///
class Sprite {
  constructor(image_path, grid_size) {
    this.image = new Image();
    this.image.src = image_path;
    this.grid_size = grid_size
  }

  /// x, y 位置に character を pose パターンで描画
  ///
  /// ctx: canvas 要素の 2D コンテキスト
  ///
  put_sprite(ctx, x, y, character, pose = 0) {
    ctx.drawImage(this.image,
                  this.grid_size * pose, this.grid_size * character,
                  this.grid_size, this.grid_size,
                  x, y,
                  this.grid_size, this.grid_size);
  }
}

////////////////////////////////////////////////////////////////
// Key and Gamepads handling
////////////////////////////////////////////////////////////////

/// Key.Left などの Enum を定義
///
const Key = Object.freeze({
  Left:    0,
  Right:   1,
  Up:      2,
  Down:    3,
  Button1: 4,
})

/// プレイヤー毎のキーバインド表
///
/// "ArrowLeft" → [0, Key.Left] のような変換をする
/// 0 は，Player1 を表す (0 始まり)
///
const KeyBind = {
  // Player 1
  "ArrowLeft":  [0, Key.Left],
  "ArrowRight": [0, Key.Right],
  "ArrowUp":    [0, Key.Up],
  "ArrowDown":  [0, Key.Down],
  " ":          [0, Key.Button1],

  // Player 2
  "a":          [1, Key.Left],
  "d":          [1, Key.Right],
  "w":          [1, Key.Up],
  "s":          [1, Key.Down],
  "q":          [1, Key.Button1],
};

/// キーが押されたときと離されたときに呼ばれる関数
///
/// key は "ArrowLeft" 等の押されたキーに対する文字列が入ってくる．
/// key に対応する動作が KeyBind 内にあれば，gs (GameState) に反映．
///
function process_key(gs, key, state) {
  if (debug) console.log(key);
  let bind = KeyBind[key];
  if (bind)
    // bind[0] はプレイヤー番号，bind[1] は，Key.Left 等の Enum
    // state は，押されていれば true
    gs.toggle_key(bind[0], bind[1], state);
}

/// USB ゲームパッドが接続されたときに呼ばれる関数
///
/// この関数内では，特に何もすることはないが，ブラウザによってはゲーム
/// パッド接続時のコールバック関数が設定されていないと以降の入力を受け
/// 付けないようになっているので，ダミーでもこの関数が必要．
///
function init_gamepads(gp) {
  if (debug) {
    console.log("Gamepad connected at index:%d buttons:%d axes:%d [%s]",
                gp.index, gp.buttons.length, gp.axes.length, gp.id);
  }
}

/// USB ゲームパッドの状態を GameSate に反映する関数
///
/// 参考:
/// https://developer.mozilla.org/ja/docs/Web/API/Navigator/getGamepads
///
/// ゲームパッドの状態は，キー入力のようにコールバック関数にはならない
/// ので，game loop の中から明示的に呼出さなければならない．
///
function scan_gamepads(gs) {
  // Chrome should refresh gamepads everytime you read.
  var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

  for (var i = 0; i < gamepads.length; i++) {
    var pad = gamepads[i];

    if (pad) {
      // Send state to GameState
      gs.toggle_key(i, Key.Left,    pad.axes[0] < -0.5);
      gs.toggle_key(i, Key.Right,   pad.axes[0] >  0.5);
      gs.toggle_key(i, Key.Up,      pad.axes[1] < -0.5);
      gs.toggle_key(i, Key.Down,    pad.axes[1] >  0.5);
      gs.toggle_key(i, Key.Button1, pad.buttons[0].pressed);
    }
  }
}

////////////////////////////////////////////////////////////////
// Main loop
////////////////////////////////////////////////////////////////

let screen = new Screen(
  900,
  780,
  document.getElementById('canvas').getContext('2d'),
  new Sprite('assets/sprites.png', 60)
);
let gs = new GameState();

let start = null;
let prev_timestamp = null;

let game_loop = (timestamp) => {
  if (!prev_timestamp) {
    start = timestamp;
    prev_timestamp = timestamp;
    requestAnimationFrame(game_loop);
    return;
  }

  let delta = (timestamp - prev_timestamp);

  scan_gamepads(gs);
  gs.update(delta);
  gs.draw(screen);

  prev_timestamp = timestamp;
  requestAnimationFrame(game_loop);
};

////////////////////////////////////////////////////////////////
// Main
////////////////////////////////////////////////////////////////

function start_game() {
  document.addEventListener('keydown', e => process_key(gs, e.key, true));
  document.addEventListener('keyup',   e => process_key(gs, e.key, false));
  document.addEventListener("gamepadconnected", e => init_gamepads(e.gamepad));
  game_loop();
}

start_game();
