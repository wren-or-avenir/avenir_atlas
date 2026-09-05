import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createPlayerState,
  getCurrentTrack,
  playerReducer,
  type PlayerState,
} from '../src/core/music/player';
import type { Playlist } from '../src/core/music/interface';
import { resolveMusicProvider } from '../src/core/music/index';

const PLAYLIST: Playlist = {
  id: 'p1',
  name: '测试歌单',
  tracks: [
    { id: 'a', title: 'A', artist: 'x', durationSeconds: 10, audioUrl: '' },
    { id: 'b', title: 'B', artist: 'x', durationSeconds: 20, audioUrl: '' },
    { id: 'c', title: 'C', artist: 'x', durationSeconds: 30, audioUrl: '' },
  ],
};

function loaded(): PlayerState {
  return playerReducer(createPlayerState(), { type: 'LOAD_PLAYLIST', playlist: PLAYLIST });
}

describe('resolveMusicProvider', () => {
  it('默认返回 mock provider 与 mock 歌单', async () => {
    const provider = resolveMusicProvider({});
    assert.equal(provider.name, 'mock');
    const playlist = await provider.fetchPlaylist();
    assert.equal(playlist.tracks.length, 3);
  });

  it('未实现的 provider 与未知值报错', () => {
    assert.throws(() => resolveMusicProvider({ MUSIC_PROVIDER: 'netease' }));
    assert.throws(() => resolveMusicProvider({ MUSIC_PROVIDER: 'spotify' }));
  });
});

describe('playerReducer 基础动作', () => {
  it('初始状态为空歌单且暂停', () => {
    const state = createPlayerState();
    assert.equal(state.playlist, null);
    assert.equal(state.isPlaying, false);
    assert.equal(getCurrentTrack(state), undefined);
  });

  it('加载歌单后回到第一首且暂停', () => {
    const state = loaded();
    assert.equal(getCurrentTrack(state)?.id, 'a');
    assert.equal(state.isPlaying, false);
  });

  it('PLAY / PAUSE / TOGGLE', () => {
    const playing = playerReducer(loaded(), { type: 'PLAY' });
    assert.equal(playing.isPlaying, true);
    assert.equal(playerReducer(playing, { type: 'PAUSE' }).isPlaying, false);
    assert.equal(playerReducer(playing, { type: 'TOGGLE' }).isPlaying, false);
  });

  it('空歌单下播放类动作是空操作', () => {
    const empty = playerReducer(createPlayerState(), {
      type: 'LOAD_PLAYLIST',
      playlist: { id: 'e', name: '空', tracks: [] },
    });
    const after = playerReducer(empty, { type: 'PLAY' });
    assert.equal(after, empty);
    assert.equal(playerReducer(after, { type: 'NEXT' }), empty);
  });
});

describe('playerReducer 切歌与循环', () => {
  it('NEXT 到尾后回绕到第一首', () => {
    let state = loaded();
    state = playerReducer(state, { type: 'NEXT' });
    assert.equal(getCurrentTrack(state)?.id, 'b');
    state = playerReducer(state, { type: 'NEXT' });
    state = playerReducer(state, { type: 'NEXT' });
    assert.equal(getCurrentTrack(state)?.id, 'a');
  });

  it('PREV 在头时回绕到最后一首', () => {
    const state = playerReducer(loaded(), { type: 'PREV' });
    assert.equal(getCurrentTrack(state)?.id, 'c');
  });

  it('PLAY_TRACK 越界抛错', () => {
    assert.throws(() => playerReducer(loaded(), { type: 'PLAY_TRACK', index: 3 }));
  });

  it('CYCLE_REPEAT 按 off → all → one → off 循环', () => {
    let state = loaded();
    state = playerReducer(state, { type: 'CYCLE_REPEAT' });
    assert.equal(state.repeat, 'all');
    state = playerReducer(state, { type: 'CYCLE_REPEAT' });
    assert.equal(state.repeat, 'one');
    state = playerReducer(state, { type: 'CYCLE_REPEAT' });
    assert.equal(state.repeat, 'off');
  });
});

describe('playerReducer 进度', () => {
  it('TICK 推进进度，SET_PROGRESS 夹取到时长内', () => {
    let state = playerReducer(loaded(), { type: 'PLAY' });
    state = playerReducer(state, { type: 'TICK', seconds: 3 });
    assert.equal(state.progressSeconds, 3);
    state = playerReducer(state, { type: 'SET_PROGRESS', seconds: 99 });
    assert.equal(state.progressSeconds, 10);
  });

  it('播完且 repeat=off：停在末尾并暂停', () => {
    const state = playerReducer(loaded(), { type: 'TICK', seconds: 10 });
    assert.equal(state.progressSeconds, 10);
    assert.equal(state.isPlaying, false);
  });

  it('播完且 repeat=all：自动切下一首', () => {
    let state = loaded();
    state = playerReducer(state, { type: 'CYCLE_REPEAT' });
    state = playerReducer(state, { type: 'PLAY' });
    state = playerReducer(state, { type: 'TICK', seconds: 10 });
    assert.equal(getCurrentTrack(state)?.id, 'b');
    assert.equal(state.progressSeconds, 0);
    assert.equal(state.isPlaying, true);
  });

  it('播完且 repeat=one：同曲重播', () => {
    let state = loaded();
    state = playerReducer(state, { type: 'CYCLE_REPEAT' });
    state = playerReducer(state, { type: 'CYCLE_REPEAT' });
    state = playerReducer(state, { type: 'PLAY' });
    state = playerReducer(state, { type: 'TICK', seconds: 10 });
    assert.equal(getCurrentTrack(state)?.id, 'a');
    assert.equal(state.progressSeconds, 0);
    assert.equal(state.isPlaying, true);
  });
});
