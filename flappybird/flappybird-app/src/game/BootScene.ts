import * as Phaser from 'phaser';
import { BIRD_ANIMATION_KEY, BIRD_FRAME_RATE } from './config';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.load.image('background-day', '/sprites/background-day.png');
    this.load.image('background-night', '/sprites/background-night.png');
    this.load.image('ground', '/sprites/base.png');
    this.load.image('pipe-green', '/sprites/pipe-green.png');
    this.load.image('pipe-red', '/sprites/pipe-red.png');
    this.load.image('message', '/sprites/message.png');
    this.load.image('gameover', '/sprites/gameover.png');

    this.load.image('yellowbird-upflap', '/sprites/yellowbird-upflap.png');
    this.load.image('yellowbird-midflap', '/sprites/yellowbird-midflap.png');
    this.load.image('yellowbird-downflap', '/sprites/yellowbird-downflap.png');

    this.load.image('redbird-upflap', '/sprites/redbird-upflap.png');
    this.load.image('redbird-midflap', '/sprites/redbird-midflap.png');
    this.load.image('redbird-downflap', '/sprites/redbird-downflap.png');

    this.load.image('bluebird-upflap', '/sprites/bluebird-upflap.png');
    this.load.image('bluebird-midflap', '/sprites/bluebird-midflap.png');
    this.load.image('bluebird-downflap', '/sprites/bluebird-downflap.png');

    for (let i = 0; i <= 9; i++) {
      this.load.image(`${i}`, `/sprites/${i}.png`);
    }

    this.load.audio('wing', '/audio/wing.ogg');
    this.load.audio('point', '/audio/point.ogg');
    this.load.audio('hit', '/audio/hit.ogg');
    this.load.audio('die', '/audio/die.ogg');
  }

  create(): void {
    this.createAnimations();
    this.scene.start('GameScene');
  }

  private createAnimations(): void {
    this.anims.create({
      key: BIRD_ANIMATION_KEY,
      frames: [
        { key: 'yellowbird-upflap' },
        { key: 'yellowbird-midflap' },
        { key: 'yellowbird-downflap' },
        { key: 'yellowbird-midflap' },
      ],
      frameRate: BIRD_FRAME_RATE,
      repeat: -1,
    });
  }
}
