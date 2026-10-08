import { expect, it, vi } from 'vitest';
import { createScopedRender } from '../../src/core/render-pass.js';

function fixture() {
  const state = { scope: {}, owner: 'a', visible: true };
  const frames = [];
  const render = vi.fn();
  const request = createScopedRender(
    {
      scope: () => state.scope,
      owner: () => state.owner,
      visible: () => state.visible,
      render,
    },
    (callback) => frames.push(callback),
  );
  return { state, frames, render, request };
}

it('coalesces background updates into one render with the latest message', () => {
  const { frames, render, request } = fixture();
  request('loading');
  request('comments ready');
  request('metadata ready');
  expect(frames).toHaveLength(1);
  expect(render).not.toHaveBeenCalled();
  frames.shift()();
  expect(render).toHaveBeenCalledExactlyOnceWith('metadata ready');
  request('later');
  frames.shift()();
  expect(render).toHaveBeenLastCalledWith('later');
});

it.each(['scope', 'owner', 'visible'])('discards queued updates when %s changes', (key) => {
  const { state, frames, render, request } = fixture();
  request('old panel');
  state[key] = key === 'scope' ? {} : key === 'owner' ? 'b' : false;
  frames.shift()();
  expect(render).not.toHaveBeenCalled();
});

it('an immediate render can cancel an obsolete queued message', () => {
  const { frames, render, request } = fixture();
  request('old');
  request.cancel();
  frames.shift()();
  expect(render).not.toHaveBeenCalled();
  request('new');
  frames.shift()();
  expect(render).toHaveBeenCalledExactlyOnceWith('new');
});

it('a new selection can replace an older queued request in the same frame', () => {
  const { state, frames, render, request } = fixture();
  request('old episode');
  state.scope = {};
  request('new episode');
  frames.shift()();
  expect(render).toHaveBeenCalledExactlyOnceWith('new episode');
});
