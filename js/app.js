/**
 * Game class.
 * Handles all the logic of the game (rules, levels, player, enemies, ...)
 * @constructor
 */
var Game = function () {
    /**
     * Current level index of the game.
     * The first level index is 0.
     * It is initialized at -1 because the game has not yet started.
     */
    this.level = -1;

    /**
     * All the levels of the game.
     * The levels have not yet been created.
     */
    this.levels = [];

    /**
     * Player of the game. Initialized at position (0, 0)
     */
    this.player = new Player(this, 0, 0);

    /**
     * Enemies of the game.
     * The game has not yet started, then
     * there is no enemy (the array {@code this.ememies} is empty).
     */
    this.enemies = [];

    /**
     * Minimum enemy speed.
     */
    this.minEnemySpeed = 1;

    /**
     * Maximum enemy speed.
     */
    this.maxEnemySpeed = 5;

    /**
     * Maximum number of player's lives.
     */
    this.maxLives = 3;

    /**
     * Current number of player's lives.
     */
    this.lives = this.maxLives;

    /**
     * Current game board.
     * The game must be started at a level
     * to the appropriate board.
     */
    this.board = null;

    /**
     * Game character selector.
     */
    this.characterSelector = new CharacterSelector();

    // At the beginning, the character selector has the focus
    // to allow player selection.
    this.characterSelector.hasFocus = true;
    
    /**
     * Whether the game is paused or not.
     */
    this.paused = false;

    // Initializes {@code this.levels}.
    // (Creates the levels of the game)
    this.initializeLevels();

    // Initializes {@code this.player}
    this.initializePlayer();

    // Initializes in-game events handlers.
    this.initializeGameCallbacks();

    // Starts the game at level 0.
    this.levelUp();

    var that = this;
    document.addEventListener('keyup', function (e) {
        var allowedKeys = {
            37: 'left',
            38: 'up',
            39: 'right',
            40: 'down',
            72: 'help',
            13: 'enter',
            80: 'pause',
            81: 'quit'
        };

        if (that.characterSelector.hasFocus) {
            that.characterSelector.handleInput(allowedKeys[e.keyCode]);
        } else {
            that.player.handleInput(allowedKeys[e.keyCode]);
        }
    });
};

/**
 * Increments the current level index of the game. If
 * the level was the last level of the game, calls
 * {@code this.gameCompletedCallback(this)}, if not,
 * updates @code {Game} properties to match the
 * new current level.
 */
Game.prototype.levelUp = function () {
    // Goes to the next level.
    this.level++;

    // There is no remaining level.
    if (this.level === this.levels.length) {
        // All the levels have been cleared. Handles this
        // event by calling the following function.
        this.gameCompletedCallback(this);

        return;
    }

    // There are still some more levels to play.
    if (this.level < this.levels.length) {
        // For each level cleared, improve the chances of the enemies
        // to run faster.
        this.minEnemySpeed += 1;
        this.maxEnemySpeed += 1;

        // "Delete" the previous board.
        this.board = null;
        
        // Retrieves the current level {@code this.levels[this.level]} 
        // and uses it to construct the new board.
        this.board = new Board(this.levels[this.level]);

        // Resets the number of lives.
        this.lives = this.maxLives;
        
        // The player has gained {@code this.maxLives}.
        // Calls the function to execute in that case.
        this.lifeGainedCallback(this.lives);

        // Put the player on the screen.
        this.spawnPlayer();

        // "Delete" all the previous enemies.
        this.enemies = [];
        
        // The number of enemies equals the number
        // of "free roads" of the board.
        this.numEnemies = this.board.roads.length;
        for (var i = 0; i < this.numEnemies; ++i) {
            // Put an enemy on a free road of the board.
            var enemy = new Enemy(this, -1, this.board.roads[i]);
            
            // Assigns a random speed to each enemy.
            enemy.speed = this.randomInt(this.minEnemySpeed, this.maxEnemySpeed);

            this.enemies.push(enemy);
        }

        // The previous level was cleared. Handles this event
        // by calling the following function.
        this.levelClearedCallback(this.level);
    }
};

/**
 * Whether the player was hit by an enemy.
 */
Game.prototype.wasPlayerHit = function () {
    if (this.player.indestructible) {
        return false;
    }

    // Iterates through {@code this.enemies} and checks
    // if one of the enemies is sufficiently close to the
    // player to consider that it hits him.
    for (var i = 0; i < this.numEnemies; ++i) {
        var enemy = this.enemies[i];

        if (this.closeEnough(this.player.x, enemy.x) && this.player.y === enemy.y) {
            return true;
        }
    }

    return false;
};

/**
 * Whether the player is not indesctructible and is on a water block on the board.
 */
Game.prototype.isPlayerDrowning = function () {
    return !this.player.indestructible && this.board.getBlock(this.player.y, this.player.x) === Block.Water;
};

/**
 * Pauses the game and call the function to execute when the game pauses.
 *
 */
Game.prototype.pause = function () {
    if (!this.paused) {
        this.paused = true;
        this.gamePausedCallback(this);
    }
};

/**
 * Resumes the game and call the function to execute when the game resumes.
 * 
 */
Game.prototype.resume = function () {
    if (this.paused) {
        this.paused = false;
        this.gameResumedCallback(this);
    }
};

/**
 * Resets the game at the current level, usually
 * after the player has lost a life.
 * 
 */
Game.prototype.reset = function () {
    this.lives--;

    if (this.lives < 0) {
        this.gameOverCallback(this);
    } else {
        this.lifeLostCallback(this.lives);
        this.board.resetItems();
        this.spawnPlayer();
    }
};

/**
 * Restarts the game at the first level.
 * @return {void}
 */
Game.prototype.restart = function () {
    this.level = -1;
    this.minEnemySpeed = 1;
    this.maxEnemySpeed = 5;
    this.gameRestartCallback(this);
    this.levelUp();
};

/**
 * Resets {@code this.player} x and y coordinates.
 */
Game.prototype.spawnPlayer = function () {
    this.player.x = this.randomInt(0, this.board.width - 1);
    this.player.y = this.board.height - 1;
};

/**
 * Resets {@code this.player} (x, y) coordinates to
 * ({@code 0}, {@code this.board.height - 1}) and puts
 * an item at the bottom row of the board.
 */
Game.prototype.helpPlayer = function () {
    if (this.lives >= 1) {
        this.player.x = 0;
        this.player.y = this.board.height - 1;

        var items = [Item.Heart, Item.Star, Item.Key, Item.Rock, Item.BlueGem, Item.GreenGem];
        var item = items[this.randomInt(0, items.length - 1)];

        // Put the item in the first free cell of the last row of the board.
        var row = this.board.height - 1;
        for (var col = this.board.width - 1; col > 0; --col) {
            if (this.board.getItem(row, col) === Item.None) {
                this.board.setItem(row, col, item);
                this.lives--;
                this.lifeLostCallback(this.lives);

                break;
            }
        }
    }
};


/**
 * Assigns an array of string (each string describing a level) to {@code this.levels}.
 * <p>Each string of the array will be
*/
Game.prototype.initializeLevels = function () {
    this.levels = [
        '5:3:1:GGGGGSSSSSGGGGG:nnnnnnnnnnnnnnn',
        '5:5:2,3:GGGGGWSWSWSSSSSSSSSSGGGGG:nnnnnnnnnnnnnnnngnnnnnnnn',
        '6:6:1,4:GGGGGGSSSSSSWWWWWWWWWWWWSSSSSSGGGGGG:nnnnnnnnnnnnnnnnnnnnnnnnnnnnrnnnnnnn',
        '5:6:2,3,4:GGGGGWWSWWSSSSSSSSSSSSSSSGGGGG:nnnnnnnnnnnnnnnnbnnnnnnnnnnnnn',
        '5:6:1,3,4:GGGGGSSSSSSSWSSSSSSSSSSSSGGGGG:nnnnnnnnnnngnbnnnnnnnnnnnnnnnn',
        '7:7:1,2,3,5:GGGGGGGSSSSSSSSSSSSSSSSSSSSSWWWSWWWSSSSSSSGGGGGGG:nnnnnnnnnnnnnnnnnnnnnnnnnnnnsnnnnnnnnrnnnnnnnnnnn',
        '5:5:1,3:GGGGGSSSSSSWSWSSSSSSGGGGG:nnnnnnnnnnnnnnnnnnnnnnnnn',
        '6:7:1,5:GGGGGGSSSSSSWSWSWSSWSWSWWSWSWSSSSSSSGGGGGG:nnnnnnnnnnnnnnnnnnnnnnnnnrnnnnnnnnnnnnnnnn',
        '5:5:1,2,3:WGWGWSSSSSSSSSSSSSSSGGGGG:nnnnnnnnnnnnnnnnnnnnnnnnn',
        '8:7:1,3,5:GGWWWWGGSSSSSSSSWWSSWWSSSSSSSSSSSSWWSSWWSSSSSSSSGGGGGGGG:nnnnnnnnnnnnnnnnnnnnnnngnnnnsnnnbnnnnnnnnnnnnnnnnnnnnnnn'
    ];
};

/**
 * Initializes the player, in particular sets up
 */
Game.prototype.initializePlayer = function () {
    this.player.onGain(Item.Heart, function (game) {
        game.lives++;
        game.lifeGainedCallback(game.lives);
    });

    this.player.onGain(Item.Star, function (game) {
        if (game.player.indestructible) {
            return;
        }
        
        game.player.indestructible = true;

        var sprite = game.player.sprite;

     
        game.player.sprite = sprite.substring(0, sprite.length - 4) + '-star.png';

        // The player will return to normal (sadly) after 1 second.
        setTimeout(function () {
            game.player.indestructible = false;
            game.player.sprite = sprite;
        }, 1000);
    });

    this.player.onGain(Item.Key, function (game) {
        game.levelUp();
    });

    // All the water blocks on the board are turned into stone blocks
    // when the player gains a 'rock' item.
    this.player.onGain(Item.Rock, function (game) {
        var pos = []; // To keep track of the positions of the water blocks.
        var level = game.level;

        for (var row = 0; row < game.board.height; ++row) {
            for (var col = 0; col < game.board.width; ++col) {
                var block = game.board.getBlock(row, col);

                if (block === Block.Water) {
                    pos.push({row: row, col: col});
                    game.board.setBlock(row, col, Block.Stone);
                }
            }
        }

        setTimeout(function () {
            if (level === game.level) { // No need to undo the effects of this item if the player has already cleared the level.
                for (var i = 0; i < pos.length; ++i) {
                    game.board.setBlock(pos[i].row, pos[i].col, Block.Water);
                }
            }
        }, 1000);
    });

    // Each enemy speed will be divided by 3 if the
    // player gains a blue gem ...
    this.player.onGain(Item.BlueGem, function (game) {
        var level = game.level;
        for (var i = 0; i < game.enemies.length; ++i) {
            game.enemies[i].speed /= 3;
        }

        // ... for 1 second.
        setTimeout(function () {
            if (game.level === level) {
                for (var i = 0; i < game.enemies.length; ++i) {
                    game.enemies[i].speed *= 3;
                }
            }
        }, 1000);
    });

    // The enemies will be freezed for 1 second if the
    // player is in possession of a green gem.
    this.player.onGain(Item.GreenGem, function (game) {
        var speeds = []; // To keep track of the enemies previous speed.
        var level = game.level;

        for (var i = 0; i < game.numEnemies; ++i) {
            speeds.push(game.enemies[i].speed);
            game.enemies[i].speed = 0;
        }

        setTimeout(function () {
            if (game.level === level) {
                for (var i = 0; i < game.enemies.length; ++i) {
                    game.enemies[i].speed = speeds[i];
                }
            }
        }, 1000);
    });

    this.player.onGain(Item.OrangeGem, function (game) {
        // Nothing for now.
    });
};

/**
 * Sets up the default in-game events (life lost, life gained, game over, ...)
 *
 */
Game.prototype.initializeGameCallbacks = function () {
    /**
     * Function to call when the player looses a live.
     * Takes 1 argument (the remaining lives).
     * @type {function(number): void}
     */
    this.lifeLostCallback = function (lives) { };

    /**
     * Function to call when the player gains a live.
     * Takes 1 argument (the new lives).
     * @type {function(number): void}
     */
    this.lifeGainedCallback = function (lives) { };

    /**
     * Function to call when the player clears a level.
     * Takes 1 argument (the new level).
     * @type {function(number): void}
     */
    this.levelClearedCallback = function (level) { };

    /**
     * Function to call when the player has lost all his lives.
     * Takes 1 argument (the current game).
     */
    this.gameOverCallback = function (game) { };

    /**
     * Function to call when the game starts or restarts.
     * Takes 1 argument (the current game).
     */
    this.gameRestartCallback = function (game) { };

    /**
     * Function to call when all the levels of the game are cleared.
     *
     */
    this.gameCompletedCallback = function (game) { };

    /**
     * Function to call just after the game is paused.
     * Takes 1 argument (the current game).
     */
    this.gamePausedCallback = function (game) { };

    /**
     * Function to call just after the game resumes.
        *
     */
    this.gameResumedCallback = function (game) { };
};

// The following Game.prototype.onXXXX functions are


Game.prototype.onLifeLost = function (callback) {
    this.lifeLostCallback = callback;
};


Game.prototype.onLifeGained = function (callback) {
    this.lifeGainedCallback = callback;
};

Game.prototype.onLevelCleared = function (callback) {
    this.levelClearedCallback = callback;
};

Game.prototype.onGameOver = function (callback) {
    this.gameOverCallback = callback;
};


Game.prototype.onGameRestart = function (callback) {
    this.gameRestartCallback = callback;
};


Game.prototype.onGameCompleted = function (callback) {
    this.gameCompletedCallback = callback;
};


Game.prototype.onGamePaused = function (callback) {
    this.gamePausedCallback = callback;
};


Game.prototype.onGameResumed = function (callback) {
    this.gameResumedCallback = callback;
};

/**
 * Checks if the player has cleared the current level.
 */
Game.prototype.isLevelCleared = function () {
    return (this.player.y === 0) && (this.board.getBlock(this.player.y, this.player.x) === Block.Grass);
};

/**
 * Checks if 2 real numbers are close enough (can be considered equal in the purpose of the game).
 */
Game.prototype.closeEnough = function (a, b) {
    return Math.abs(a - b) < 0.1;
};

/**
 * Generates a random integer between 2 numbers.
 */
Game.prototype.randomInt = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};


/**
 * Block types which compose the board.
 */
var Block = {
    Water: 'W',
    Grass: 'G',
    Stone: 'S'
};

/**
 * Kinds of items which can be available on the board.
 */
var Item = {
    BlueGem: 'b',
    GreenGem: 'g',
    OrangeGem: 'o',
    Heart: 'h',
    Key: 'k',
    Rock: 'r',
    Star: 's',
    None: 'n'
};

/**
 * Board class.
 * Represents the board on which the game is played.

 */
var Board = function (level) {
    // Array of strings containing the different parts of the board.

    var data = level.split(':');

    /**
     * Number of columns of the board.
     */
    this.width = parseInt(data[0]);

    /**
     * Number of rows of the board.
     */
    this.height = parseInt(data[1]);
    
    /**
     * List of row indexes on which enemies can be spawned.
     */
    this.roads = [];

    // An array of string, each string is a row index.
    var roadsData = data[2].split(',');
    for (var i = 0; i < roadsData.length; ++i) {
        // Convert each roadsData element to int and
        // append it to {@code this.roads}
        this.roads.push(parseInt(roadsData[i]));
    }

    /**
     * Blocks composing the board. Each block value must be
     */
    this.blocks = data[3];

    // The items part of the string {@code level} may be
   
    if (data.length > 4) {
        /**
         * Items available on the board. Each item value
         */
        this.items = data[4];

        /**
         * Initial items configuration of the board.
         */
        this.initialItems = this.items;
    }
};

/**
 * Gets the block at position (row, col).
 */
Board.prototype.getBlock = function (row, col) {
    return this.blocks.charAt(row * this.width + col);
};

/**
 * Changes the value of the block at position (row, col).
 */
Board.prototype.setBlock = function (row, col, newBlock) {
    var index = row * this.width + col;

    this.blocks = this.blocks.substring(0, index) + newBlock + this.blocks.substring(index + 1);
};

/**
 * Gets the item at position (row, col).
 */
Board.prototype.getItem = function (row, col) {
    return this.items === undefined ? Item.None : this.items.charAt(row * this.width + col);
};

/**
 * Changes the value of the item at position (row, col).
 */
Board.prototype.setItem = function (row, col, newItem) {
    // In case, there were no items at the beginning of the game,
    // initialize {@code this.items} before modifying it.
    if (this.items === undefined) {
        this.items = '';
        for (var i = 0; i < this.blocks.length; ++i) {
            this.items += 'n';
        }
    }

    var index = row * this.width + col;

    this.items = this.items.substring(0, index) + newItem + this.items.substring(index + 1);
};

/**
 * Sets the item at position (row, col) to {@code Item.None}
 */
Board.prototype.removeItem = function (row, col) {
    this.setItem(row, col, Item.None);
};

/**
 * Restores {@code this.items} at its initial value.
 */
Board.prototype.resetItems = function () {
    this.items = this.initialItems;
};

/**
 * Character class.
 * Represents any character on the board.
 */
var Character = function (game, x, y) {
    /**
     * Game the character belongs to.
     */
    this.game = game;
    
    /**
     * x position of the character.
     */
    this.x = x;

    /**
     * y position of the character.
     */
    this.y = y;

    /**
     * Path to the sprite file of the character.
     */
    this.sprite = null;
};

/**
 * Draws the character on the game canvas.
 */
Character.prototype.render = function () {
    ctx.drawImage(Resources.get(this.sprite), this.x * 101, this.y * 83 - 20); // -20 to "center" the character on a block.
};


/**
 * Enemy class.
 * Represents an enemy in the game.
 */
var Enemy = function(game, x, y, speed) {
    Character.call(this, game, x, y);

    this.sprite = 'images/enemy-bug.png';

    /**
     * Current speed of the enemy.
     */
    this.speed = speed;
}

Enemy.prototype = Object.create(Character.prototype);
Enemy.prototype.constructor = Enemy;

/**
 * Updates the enemy position at each frame.
 */
Enemy.prototype.update = function (dt) {
    this.x += this.speed * dt; // this.x = this.x + ds where ds (distance travelled during dt) = speed * dt.

    if (this.x >= this.game.board.width) {
        // Spawn an enemy at the left, off the board to have the impression that
        this.x = -1;

        // Randomely choose a road on which spawn the enemy.
        this.y = this.game.board.roads[this.game.randomInt(0, this.game.board.roads.length - 1)];

        // Randomely choose a speed at which the enemy will run between enemies minimal and maximal speeds.
        this.speed = this.game.randomInt(this.game.minEnemySpeed, this.game.maxEnemySpeed);
    }
};


/**
 * Player class.
 * Represents the player in the game.
 */
var Player = function (game, x, y) {
    Character.call(this, game, x, y);
    this.sprite = 'images/char-boy.png';

    /**
     * Object mapping keys of type {@code Item}
     */
    this.gainCallbacks = { };

    /**
     * If this is true, the player does not undergo any
     * damage by enemies and can not drown.
     * @type {boolean}
     */
    this.indestructible = false;
};

Player.prototype = Object.create(Character.prototype);
Player.prototype.constructor = Player;

/**
 * Checks if the player has cleared the level at each frame.
 */
Player.prototype.update = function () {
    if (this.game.isLevelCleared()) {
        this.game.levelUp();
    }
};

/**
 * Defines a callback function to call when the player
 */
Player.prototype.onGain = function (item, callback) {
    this.gainCallbacks[item] = callback;
};

/**
 * Handles keyboard events.
 */
Player.prototype.handleInput = function (key) {
    switch (key) {
        case 'left':
            if (this.x > 0) {
                this.moveTo(this.x - 1, this.y);
            }
            break;
        case 'up':
            if (this.y > 0) {
                this.moveTo(this.x, this.y - 1);
            }
            break;
        case 'right':
            if (this.x < this.game.board.width - 1) {
                this.moveTo(this.x + 1, this.y);
            }
            break;
        case 'down':
            if (this.y < this.game.board.height - 1) {
                this.moveTo(this.x, this.y + 1);
            }
            break;
        case 'help':
            this.game.helpPlayer();
            break;
        case 'pause':
            if (!this.game.paused) {
                this.game.pause();
            } else {
                this.game.resume();
            }
            break;
        case 'quit':
            this.game.resume(); // Just in case the game was paused before quitting.
            this.game.characterSelector.hasFocus = true;
            this.game.restart();
        default:
            break;
    }

};

/**
 * Moves the player to a new position.
 */
Player.prototype.moveTo = function (x, y) {
    if (this.game.paused) {
        return;
    }

    this.x = x;
    this.y = y;

    var item = this.game.board.getItem(this.y, this.x);

    // If there is an item at the new position
    if (item != Item.None) {
        if (this.gainCallbacks.hasOwnProperty(item)) {

            // Call its associated callback.
            this.gainCallbacks[item](this.game);
        }

        // Remove the item of the board.
        this.game.board.removeItem(y, x);
    }
};


/**
 * CharacterSelector class.
 */
var CharacterSelector = function () {
    /**
     * List of characters between which one should be selected.
     */
    this.characters = null;

    /**
     * The current position of the selector.
     */
    this.position = 0;

    /**
     * Whether the selector has focus, then should be
     */
    this.hasFocus = false;

    /**
     * Function to call when a character has been selected.
     */
    this.characterSelectedCallback = function (character) { };
};

/**
 * Defines the function to call on a character has been selected.
 */
CharacterSelector.prototype.onCharacterSelected = function (callback) {
    this.characterSelectedCallback = callback;
};

/**
 * Handles keyboard key pressed events
 */
CharacterSelector.prototype.handleInput = function (key) {
    switch (key) {
        case 'left':
            if (this.position > 0) {
                this.position--;
            }
            break;
        case 'right':
            if (this.position < this.characters.length - 1) {
                this.position++;
            }
            break;
        case 'enter':
            if (this.position >= 0 && this.position <= this.characters.length - 1) {
                this.characterSelectedCallback(this.characters[this.position]);
            }
            break;
        default:
            break;
    }
}
