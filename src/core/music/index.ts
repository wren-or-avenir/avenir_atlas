import type { MusicProvider } from './interface';
import { createMockMusicProvider } from './mock';

export function resolveMusicProvider(
  env: Record<string, string | undefined> = {},
): MusicProvider {
  const name = env.MUSIC_PROVIDER ?? 'mock';
  if (name === 'mock') {
    return createMockMusicProvider();
  }
  throw new Error(`music: Provider "${name}" 未实现，当前仅支持 mock（netease 待接入）`);
}

export type { MusicProvider, Playlist, Track } from './interface';
export type { PlayerAction, PlayerState, RepeatMode } from './player';
export { createPlayerState, getCurrentTrack, playerReducer } from './player';
