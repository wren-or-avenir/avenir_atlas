export interface Track {
  id: string;
  title: string;
  artist: string;
  durationSeconds: number;
  audioUrl: string;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: readonly Track[];
}

export type MusicProviderName = 'mock' | 'netease';

export interface MusicProvider {
  readonly name: MusicProviderName;
  fetchPlaylist(): Promise<Playlist>;
}
