import * as Phaser from 'phaser';
import { BootScene } from './BootScene';
import { GameScene } from './GameScene';
import { GAME_WIDTH, GAME_HEIGHT } from './config';

export const createGame = (parent: HTMLElement): Phaser.Game => {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [BootScene, GameScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    audio: {
      disableWebAudio: true,
    },
  };

  return new Phaser.Game(config);
};
