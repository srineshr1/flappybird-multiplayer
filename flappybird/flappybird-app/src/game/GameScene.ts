import * as Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  BIRD_X,
  JUMP_VELOCITY,
  PIPE_WIDTH,
  PIPE_HEIGHT,
  PIPE_GAP,
  PIPE_SPEED,
  PIPE_SPAWN_INTERVAL,
  GROUND_HEIGHT,
  BIRD_ANIMATION_KEY,
} from './config';

const GameState = {
  MENU: 0,
  PLAYING: 1,
  GAME_OVER: 2,
} as const;

type GameStateType = (typeof GameState)[keyof typeof GameState];

interface PipePair {
  top: Phaser.Physics.Arcade.Sprite;
  bottom: Phaser.Physics.Arcade.Sprite;
  scored: boolean;
}

export class GameScene extends Phaser.Scene {
  private bird!: Phaser.Physics.Arcade.Sprite;
  private pipePairs: PipePair[] = [];
  private ground!: Phaser.Physics.Arcade.Sprite;
  private groundTile!: Phaser.GameObjects.TileSprite;
  private scoreText!: Phaser.GameObjects.Image;
  private score = 0;
  private gameState: GameStateType = GameState.MENU;
  private message!: Phaser.GameObjects.Image;
  private gameOverImage!: Phaser.GameObjects.Image;
  private canJump = true;
  private groundScrollSpeed = PIPE_SPEED;

  private wingSound!: Phaser.Sound.HTML5AudioSound | Phaser.Sound.NoAudioSound | Phaser.Sound.WebAudioSound;
  private pointSound!: Phaser.Sound.HTML5AudioSound | Phaser.Sound.NoAudioSound | Phaser.Sound.WebAudioSound;
  private hitSound!: Phaser.Sound.HTML5AudioSound | Phaser.Sound.NoAudioSound | Phaser.Sound.WebAudioSound;
  private dieSound!: Phaser.Sound.HTML5AudioSound | Phaser.Sound.NoAudioSound | Phaser.Sound.WebAudioSound;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.createBackground();
    this.createGround();
    this.createBird();
    this.createUI();
    this.createSounds();
    this.setupInput();
  }

  private createBackground(): void {
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'background-day');
  }

  private createGround(): void {
    this.ground = this.physics.add.sprite(GAME_WIDTH / 2, GAME_HEIGHT - GROUND_HEIGHT / 2, 'ground');
    (this.ground.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.ground.setImmovable(true);
    this.ground.setSize(GAME_WIDTH, GROUND_HEIGHT);

    this.groundTile = this.add.tileSprite(
      GAME_WIDTH / 2,
      GAME_HEIGHT - GROUND_HEIGHT / 2,
      GAME_WIDTH,
      GROUND_HEIGHT,
      'ground'
    );
    this.groundTile.setOrigin(0.5, 0.5);
  }

  private createBird(): void {
    this.bird = this.physics.add.sprite(BIRD_X, GAME_HEIGHT / 2, 'yellowbird');
    this.bird.setCollideWorldBounds(true);
    this.bird.body?.setSize(30, 24);
    this.bird.body?.setOffset(2, 0);
    this.bird.play(BIRD_ANIMATION_KEY);
    (this.bird.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
  }

  private createUI(): void {
    this.message = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, 'message');
    this.message.setScale(1.5);

    this.gameOverImage = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, 'gameover');
    this.gameOverImage.setVisible(false);
    this.gameOverImage.setScale(1.5);

    this.scoreText = this.add.image(GAME_WIDTH / 2, 50, '0');
    this.scoreText.setVisible(false);
  }

  private createSounds(): void {
    this.wingSound = this.sound.add('wing') as Phaser.Sound.HTML5AudioSound | Phaser.Sound.NoAudioSound | Phaser.Sound.WebAudioSound;
    this.pointSound = this.sound.add('point') as Phaser.Sound.HTML5AudioSound | Phaser.Sound.NoAudioSound | Phaser.Sound.WebAudioSound;
    this.hitSound = this.sound.add('hit') as Phaser.Sound.HTML5AudioSound | Phaser.Sound.NoAudioSound | Phaser.Sound.WebAudioSound;
    this.dieSound = this.sound.add('die') as Phaser.Sound.HTML5AudioSound | Phaser.Sound.NoAudioSound | Phaser.Sound.WebAudioSound;
  }

  private setupInput(): void {
    this.input.on('pointerdown', () => this.handleInput());
    this.input.keyboard?.on('keydown-SPACE', () => this.handleInput());
    this.input.keyboard?.on('keydown-UP', () => this.handleInput());
  }

  private handleInput(): void {
    if (this.gameState === GameState.MENU) {
      this.startGame();
    } else if (this.gameState === GameState.PLAYING && this.canJump) {
      this.jump();
    } else if (this.gameState === GameState.GAME_OVER) {
      this.restartGame();
    }
  }

  private startGame(): void {
    this.gameState = GameState.PLAYING;
    this.message.setVisible(false);
    this.scoreText.setVisible(true);
    this.score = 0;
    this.updateScoreDisplay();
    (this.bird.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
    this.bird.setVelocityY(JUMP_VELOCITY);
    this.bird.angle = 0;
    this.canJump = true;

    this.time.addEvent({
      delay: PIPE_SPAWN_INTERVAL,
      callback: this.spawnPipe,
      callbackScope: this,
      loop: true,
    });

    this.physics.add.collider(this.bird, this.ground, this.onHitGround, undefined, this);
  }

  private jump(): void {
    this.canJump = false;
    this.wingSound.play();
    this.bird.setVelocityY(JUMP_VELOCITY);
    this.time.delayedCall(100, () => {
      this.canJump = true;
    });
  }

  private spawnPipe(): void {
    const minY = 80 + PIPE_GAP / 2;
    const maxY = GAME_HEIGHT - GROUND_HEIGHT - PIPE_GAP / 2 - 80;
    const gapCenterY = Phaser.Math.Between(minY, maxY);

    const topPipeY = gapCenterY - PIPE_GAP / 2 - PIPE_HEIGHT / 2;
    const bottomPipeY = gapCenterY + PIPE_GAP / 2 + PIPE_HEIGHT / 2;

    const topPipe = this.physics.add.sprite(GAME_WIDTH + PIPE_WIDTH, topPipeY, 'pipe-green');
    topPipe.body?.setAllowGravity(false);
    topPipe.setVelocityX(-PIPE_SPEED);
    topPipe.setImmovable(true);

    const bottomPipe = this.physics.add.sprite(GAME_WIDTH + PIPE_WIDTH, bottomPipeY, 'pipe-green');
    bottomPipe.body?.setAllowGravity(false);
    bottomPipe.setVelocityX(-PIPE_SPEED);
    bottomPipe.setImmovable(true);

    this.physics.add.collider(this.bird, topPipe, this.onHitPipe, undefined, this);
    this.physics.add.collider(this.bird, bottomPipe, this.onHitPipe, undefined, this);

    const pair: PipePair = {
      top: topPipe,
      bottom: bottomPipe,
      scored: false,
    };
    this.pipePairs.push(pair);
  }

  private onHitGround(): void {
    if (this.gameState === GameState.PLAYING) {
      this.gameOver();
    }
  }

  private onHitPipe(): void {
    if (this.gameState === GameState.PLAYING) {
      this.gameOver();
    }
  }

  private gameOver(): void {
    this.gameState = GameState.GAME_OVER;
    this.hitSound.play();
    this.dieSound.play();
    (this.bird.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.bird.setVelocity(0, 0);
    this.bird.angle = 90;

    this.time.removeAllEvents();

    this.pipePairs.forEach(pair => {
      pair.top.destroy();
      pair.bottom.destroy();
    });
    this.pipePairs = [];

    this.scoreText.setVisible(false);
    this.gameOverImage.setVisible(true);
  }

  private restartGame(): void {
    this.scene.restart();
  }

  private updateScoreDisplay(): void {
    this.scoreText.setTexture(this.score.toString());
  }

  private updateBirdRotation(): void {
    const velocity = this.bird.body?.velocity?.y ?? 0;
    const targetAngle = Phaser.Math.Linear(this.bird.angle, (velocity / 300) * 30, 0.1);
    this.bird.angle = Phaser.Math.Clamp(targetAngle, -30, 70);
  }

  update(): void {
    if (this.gameState === GameState.PLAYING) {
      this.groundTile.tilePositionX += this.groundScrollSpeed * (1 / 60);

      this.updateBirdRotation();

      this.pipePairs = this.pipePairs.filter(pair => {
        if (pair.bottom.getBounds().right < 0) {
          pair.top.destroy();
          pair.bottom.destroy();
          return false;
        }
        return true;
      });

      for (const pair of this.pipePairs) {
        if (!pair.scored && pair.bottom.getBounds().right < this.bird.x) {
          pair.scored = true;
          this.score++;
          this.updateScoreDisplay();
          this.pointSound.play();
        }
      }

      if (this.bird.y >= GAME_HEIGHT - GROUND_HEIGHT - this.bird.height / 2) {
        this.bird.y = GAME_HEIGHT - GROUND_HEIGHT - this.bird.height / 2;
        if (this.gameState === GameState.PLAYING) {
          this.gameOver();
        }
      }
    }
  }
}
