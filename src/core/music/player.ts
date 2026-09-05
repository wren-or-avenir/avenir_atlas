import type { Playlist, Track } from './interface';

export type RepeatMode = 'off' | 'all' | 'one';

export interface PlayerState {
  playlist: Playlist | null;
  currentIndex: number;
  isPlaying: boolean;
  repeat: RepeatMode;
  progressSeconds: number;
}

export type PlayerAction =
  | { type: 'LOAD_PLAYLIST'; playlist: Playlist }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'TOGGLE' }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'PLAY_TRACK'; index: number }
  | { type: 'SET_PROGRESS'; seconds: number }
  | { type: 'CYCLE_REPEAT' }
  | { type: 'TICK'; seconds: number };

const REPEAT_ORDER: readonly RepeatMode[] = ['off', 'all', 'one'];

export function createPlayerState(): PlayerState {
  return {
    playlist: null,
    currentIndex: 0,
    isPlaying: false,
    repeat: 'off',
    progressSeconds: 0,
  };
}

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'LOAD_PLAYLIST':
      return {
        playlist: action.playlist,
        currentIndex: 0,
        isPlaying: false,
        repeat: state.repeat,
        progressSeconds: 0,
      };
    case 'PLAY':
      return hasTrack(state) ? { ...state, isPlaying: true } : state;
    case 'PAUSE':
      return { ...state, isPlaying: false };
    case 'TOGGLE':
      return hasTrack(state) ? { ...state, isPlaying: !state.isPlaying } : state;
    case 'NEXT':
      return hasTrack(state)
        ? { ...state, currentIndex: wrap(state.currentIndex + 1, trackCount(state)), progressSeconds: 0 }
        : state;
    case 'PREV':
      return hasTrack(state)
        ? { ...state, currentIndex: wrap(state.currentIndex - 1, trackCount(state)), progressSeconds: 0 }
        : state;
    case 'PLAY_TRACK': {
      assertIndex(state, action.index);
      return { ...state, currentIndex: action.index, isPlaying: true, progressSeconds: 0 };
    }
    case 'SET_PROGRESS': {
      const duration = getCurrentTrack(state)?.durationSeconds ?? 0;
      return { ...state, progressSeconds: clamp(action.seconds, 0, duration) };
    }
    case 'CYCLE_REPEAT':
      return { ...state, repeat: nextRepeat(state.repeat) };
    case 'TICK':
      return tick(state, action.seconds);
  }
}

export function getCurrentTrack(state: PlayerState): Track | undefined {
  const { playlist, currentIndex } = state;
  if (!playlist || playlist.tracks.length === 0) {
    return undefined;
  }
  return playlist.tracks[currentIndex];
}

function hasTrack(state: PlayerState): boolean {
  return getCurrentTrack(state) !== undefined;
}

function trackCount(state: PlayerState): number {
  return state.playlist?.tracks.length ?? 0;
}

function assertIndex(state: PlayerState, index: number): void {
  if (index < 0 || index >= trackCount(state)) {
    throw new Error(`music: 非法曲目序号 ${index}（歌单共 ${trackCount(state)} 首）`);
  }
}

function tick(state: PlayerState, seconds: number): PlayerState {
  const track = getCurrentTrack(state);
  if (!track) {
    return state;
  }
  const progress = state.progressSeconds + seconds;
  if (progress < track.durationSeconds) {
    return { ...state, progressSeconds: progress };
  }
  switch (state.repeat) {
    case 'one':
      return { ...state, progressSeconds: 0 };
    case 'all':
      return {
        ...state,
        currentIndex: wrap(state.currentIndex + 1, trackCount(state)),
        progressSeconds: 0,
      };
    case 'off':
      return { ...state, progressSeconds: track.durationSeconds, isPlaying: false };
  }
}

function wrap(index: number, length: number): number {
  return ((index % length) + length) % length;
}

function nextRepeat(repeat: RepeatMode): RepeatMode {
  const current = REPEAT_ORDER.indexOf(repeat);
  return REPEAT_ORDER[(current + 1) % REPEAT_ORDER.length];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
