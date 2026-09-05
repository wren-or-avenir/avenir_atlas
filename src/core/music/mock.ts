import type { MusicProvider, Playlist } from './interface';

const MOCK_PLAYLIST: Playlist = {
  id: 'mock-playlist',
  name: 'Avenir 的 mock 歌单',
  tracks: [
    { id: 't1', title: 'Mock Song 1', artist: 'Avenir', durationSeconds: 240, audioUrl: '' },
    { id: 't2', title: 'Mock Song 2', artist: 'Avenir', durationSeconds: 200, audioUrl: '' },
    { id: 't3', title: 'Mock Song 3', artist: 'Avenir', durationSeconds: 260, audioUrl: '' },
  ],
};

export function createMockMusicProvider(): MusicProvider {
  return {
    name: 'mock',
    async fetchPlaylist(): Promise<Playlist> {
      return MOCK_PLAYLIST;
    },
  };
}
