/* Engine.js
 * This file provides the game loop functionality (update entities and render),
 * draws the initial game board on the screen, and then calls the update and
 * render methods on your player and enemy objects (defined in your app.js).
 *
 * A game engine works by drawing the entire game screen over and over, kind of
 * like a flipbook you may have created as a kid. When your player moves across
 * the screen, it may look like just that image/character is moving or being
 * drawn but that is not the case. What's really happening is the entire "scene"
 * is being drawn over and over, presenting the illusion of animation.
 *
 * This engine makes the canvas' context (ctx) object globally available to make
 * writing app.js a little simpler to work with.
 */

var Engine = (function (global) {
    /* Predefine the variables we'll be using within this scope,
     * create the canvas element, grab the 2D context for that canvas
     * set the canvas element's height/width and add it to the DOM.
     */
    var doc = global.document,
        win = global.window,
        canvas = doc.createElement('canvas'),
        ctx = canvas.getContext('2d'),
        lastTime;
    animate = true,
        game = new Game();
    initializeGame(game);
    canvas.width = 505;
    canvas.height = 606;

    doc.getElementById('game-area').appendChild(canvas);


    /* This function serves as the kickoff point for the game loop itself
     * and handles properly calling the update and render methods.
     */
    function main() {
        /* Get our time delta information which is required if your game
         * requires smooth animation. Because everyone's computer processes
         * instructions at different speeds we need a constant value that
         * would be the same for everyone (regardless of how fast their
         * computer is) - hurray time!
         */

        var now = Date.now(),
            dt = (now - lastTime) / 1000.0;

        /* Call our update/render functions, pass along the time delta to
         * our update function since it may be used for smooth animation.
         */
        update(dt);
        render();

        /* Set our lastTime variable which is used to determine the time delta
         * for the next time this function is called.
         */
        lastTime = now;

        /* Use the browser's requestAnimationFrame function to call this
         * function again as soon as the browser is able to draw another frame.
         */
        if (animate) {
            win.requestAnimationFrame(main);
        }
    }

    /* This function does some initial setup that should only occur once,
     * particularly setting the lastTime variable that is required for the
     * game loop.
     */
    var audio_start_game = doc.querySelector('.start-game-audio');

    function init() {
        restart();
        lastTime = Date.now();
        main();
        
        var context = new AudioContext();
        audio_start_game.play();

        window.addEventListener('load', function () {
            context.resume().then(() => {
                console.log('Playback resumed successfully');
            });
        });
//         audio_start_game.play();
        audio_start_game.currentTime = 0;
    }

    /* This function is called by main (our game loop) and itself calls all
     * of the functions which may need to update entity's data. Based on how
     * you implement your collision detection (when two entities occupy the
     * same space, for instance when your character should die), you may find
     * the need to add an additional function call here. For now, we've left
     * it commented out - you may or may not want to implement this
     * functionality this way (you could just implement collision detection
     * on the entities themselves within your app.js file).
     */
    function update(dt) {
        updateEntities(dt);
        checkCollisions();
    }

    /* This is called by the update function and loops through all of the
     * objects within your allEnemies array as defined in app.js and calls
     * their update() methods. It will then call the update function for your
     * player object. These update methods should focus purely on updating
     * the data/properties related to the object. Do your drawing in your
     * render methods.
     */
    function updateEntities(dt) {
        game.enemies.forEach(function (enemy) {
            enemy.update(dt);
        });
        game.player.update();
    }

    /* This function initially draws the "game level", it will then call
     * the renderEntities function. Remember, this function is called every
     * game tick (or loop of the game engine) because that's how games work -
     * they are flipbooks creating the illusion of animation but in reality
     * they are just drawing the entire screen over and over.
     */

    function render() {
        if (game.characterSelector.hasFocus) {
            renderCharacterSelector();
        } else {
            renderGame();
        }

    }

    function renderGame() {
        var Images = {};

        Images[Block.Water] = 'images/water-block.png';
        Images[Block.Stone] = 'images/stone-block.png';
        Images[Block.Grass] = 'images/grass-block.png';

        Images[Item.BlueGem] = 'images/gem-blue.png';
        Images[Item.GreenGem] = 'images/gem-green.png';
        Images[Item.OrangeGem] = 'images/gem-orange.png';
        Images[Item.Heart] = 'images/heart.png';
        Images[Item.Key] = 'images/key.png';
        Images[Item.Star] = 'images/star.png';
        Images[Item.Rock] = 'images/rock.png';

        for (var row = 0; row < game.board.height; ++row) {
            for (var col = 0; col < game.board.width; ++col) {
                var block = game.board.getBlock(row, col);
                var item = game.board.getItem(row, col);

                if (row === 0) { // Clear the top row of the board to remove any previous frame's remaining pixel.
                    ctx.clearRect(col * 101, row * 83, 101, 171);
                }

                ctx.drawImage(Resources.get(Images[block]), col * 101, row * 83);

                if (item != Item.None) {
                    ctx.drawImage(Resources.get(Images[item]), col * 101, row * 83);
                }
            }
        }

        renderEntities();
    }

    /* This function is called by the render function and is called on each game
     * tick. Its purpose is to then call the render functions you have defined
     * on your enemy and player entities within app.js
     */
    function renderEntities() {
        game.enemies.forEach(function (enemy) {
            enemy.render();
        });

        game.player.render();

    }

    /**
     * Displays the character selector on the screen.
     */
    function renderCharacterSelector() {
        $('#info_score').css('visibility', 'hidden');

        $('#select-player').css('display', 'block');

        var selectorImage = 'images/selector.png';

        var characters = game.characterSelector.characters;

        canvas.width = characters.length * 101;
        canvas.height = 171;

        ctx.drawImage(Resources.get(selectorImage), game.characterSelector.position * 101, 0);

        for (var i = 0; i < characters.length; ++i) {
            ctx.drawImage(Resources.get(characters[i].sprite), i * 101, 0);
        }

    }
    /**
     * Checks if the player was hit or is on a water block.
     */
    function checkCollisions() {
        if (game.wasPlayerHit() || game.isPlayerDrowning()) {
            game.reset();
        }
    }

    function restart() {
        game.restart();
    }


    /**
     * Initializes the game and setup in-game events
     * handlers.
     */
    function initializeGame(game) {
        initializeCharacterSelector(game);

        game.onLifeLost(function (lives) {
            $('.lives').text(lives);
        });

        game.onLifeGained(function (lives) {
            $('.lives').text(lives);
        });

        game.onLevelCleared(function (nextLevel) {
            clearCanvas();

            $('.level').text(nextLevel + 1);
        });
        var audio_lost_game = doc.querySelector('.lost-game-audio');
        game.onGameOver(function (game) {
            animate = false;
            audio_start_game.pause();
            audio_lost_game.play();
            audio_lost_game.currentTime = 0;

            $('#game-area').css('display', 'none');
            $('#play-game').css('display', 'block');
            Swal.fire({
                title: 'Game Over!',
                text: 'Try Again :)',
                imageUrl: './images/feeling_sad.svg',
                imageWidth: 400,
                imageHeight: 200,
                imageAlt: 'Custom image',
                confirmButtonText: 'Play Again',
                animation: true
            }).then((result) => {
                if (result.value) {

                    animate = true;

                    init();
                    $('#game-area').css('display', 'block');
                    $('#play-game').css('display', 'none');
                    audio_lost_game.pause();

                }
            })

            $('#play').click(function () {
                animate = true;

                init();

                $('#play-game').css('display', 'none');
                $('#game-area').css('display', 'block');
            });
        });

        game.onGameRestart(function (game) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            game.characterSelector.hasFocus = true;
        });
        var audio_won_game = doc.querySelector('.won-game-audio');
        game.onGameCompleted(function (game) {
            animate = false;

            $('#game-area').css('display', 'none');
            $('#play-game').css('display', 'block');
            audio_start_game.pause();
            audio_won_game.play();
            audio_won_game.currentTime = 0;
            Swal.fire({
                title: 'Great💥🏆🏅',
                text: `You've finished the game 💪👏`,
                imageUrl: './images/superhero.svg',
                imageWidth: 400,
                imageHeight: 200,
                imageAlt: 'Custom image',
                confirmButtonText: 'Play Again',
                animation: true
            }).then((result) => {
                if (result.value) {

                    animate = true;

                    init();
                    $('#game-area').css('display', 'block');
                    $('#play-game').css('display', 'none');
                    audio_won_game.pause();

                }
            })

            $('#play').click(function () {
                animate = true;

                init();

                $('#play-game').css('display', 'none');
                $('#game-area').css('display', 'block');
            })
        });

        game.onGamePaused(function (game) {
            animate = false;
            audio_start_game.pause();
        });

        game.onGameResumed(function (game) {
            animate = true;
            lastTime = Date.now();
            main();
            audio_start_game.play();
        });
    }

    function initializeCharacterSelector(game) {
        var characters = [{
                name: 'boy',
                sprite: 'images/char-boy.png'
            },
            {
                name: 'cat-girl',
                sprite: 'images/char-cat-girl.png'
            },
            {
                name: 'horn-girl',
                sprite: 'images/char-horn-girl.png'
            },
            {
                name: 'pink-girl',
                sprite: 'images/char-pink-girl.png'
            },
            {
                name: 'princess-girl',
                sprite: 'images/char-princess-girl.png'
            }
        ];

        game.characterSelector.characters = characters;

        game.characterSelector.onCharacterSelected(function (character) {
            clearCanvas();

            game.player.sprite = character.sprite;

            $('#select-player').css('display', 'none');
            $('#info_score').css('visibility', 'visible');

            game.characterSelector.hasFocus = false;
        });
    }

    /**
     * Erases everything on the canvas.
     */
    function clearCanvas() {
        canvas.width = game.board.width * 101;
        canvas.height = game.board.height * 101 + 101;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    /**
     * function setting theme and sound
     */
    var checkTheme = document.querySelector('#switch-theme'),
        checkSound = document.querySelector('#switch-audio'),
        rootCss = document.documentElement.style;
    // swtich theme
    checkTheme.onchange = function () {
        if (checkTheme.checked) {
            changeTheme('--bg-theme', '#1b1919');
            changeTheme('--color', '#f3e7e7');
        } else {
            changeTheme('--bg-theme', '#DFDBE5');
            changeTheme('--color', '#534c4c');
        }
    }
    // switch sound
    checkSound.onchange = function () {
        if (checkSound.checked) {
            audio_start_game.pause();
        } else {
            audio_start_game.play();
        }
    }
    // change theme
    function changeTheme(par1, color) {
        rootCss.setProperty(par1, color)
    }
    /* Go ahead and load all of the images we know we're going to need to
     * draw our game level. Then set init as the callback method, so that when
     * all of these images are properly loaded our game will start.
     */
    Resources.load([
        'images/stone-block.png',
        'images/water-block.png',
        'images/grass-block.png',
        'images/enemy-bug.png',
        'images/char-boy.png',
        'images/gem-orange.png',
        'images/gem-blue.png',
        'images/gem-green.png',
        'images/heart.png',
        'images/star.png',
        'images/key.png',
        'images/rock.png',
        'images/char-boy.png',
        'images/char-boy-star.png',
        'images/char-cat-girl.png',
        'images/char-cat-girl-star.png',
        'images/char-horn-girl.png',
        'images/char-horn-girl-star.png',
        'images/char-pink-girl.png',
        'images/char-pink-girl-star.png',
        'images/char-princess-girl.png',
        'images/char-princess-girl-star.png',
        'images/selector.png'
    ]);

    Resources.onReady(init);

    global.ctx = ctx;
})(this);
