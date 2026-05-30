import { useAudioPlayer } from 'expo-audio';

const sound1 = require('./assets/sounds/meme.mp3');
const sound2 = require('./assets/sounds/faah.mp3');

const sounds = [sound1, sound2];

function getRandomSound() {
  return sounds[Math.floor(Math.random() * sounds.length)];
}

export function useRandomClickSound() {
  const player = useAudioPlayer(getRandomSound());

  function playRandomClick() {
    player.play();
  }

  return { playRandomClick };
}
