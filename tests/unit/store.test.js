import { expect, test } from 'vitest';
import { createStore } from '../../src/core/store.js';

test('subscribers read the canonical replacement after an account switch', () => {
  let state = { anime: ['first'] },
    owner = 'first';
  const events = [];
  const store = createStore(
    () => state,
    () => owner,
  );
  store.subscribe((value, event) => events.push({ value, event }));
  store.publish('saved');
  state = { anime: ['second'] };
  owner = 'second';
  store.publish('account');
  expect(store.getState()).toBe(state);
  expect(events[1].value).toBe(state);
  expect(events.map((x) => x.event.owner)).toEqual(['first', 'second']);
  expect(events[1].event.revision).toBe(2);
});

test('tentative changes and rollbacks do not announce a saved library', () => {
  let state = { anime: ['original'] };
  const store = createStore(
    () => state,
    () => 'owner',
  );
  const events = [];
  store.subscribe((value) => events.push(value));
  const original = state;
  state = { anime: ['draft'] };
  state = original;
  expect(events).toHaveLength(0);
  state = { anime: ['committed'] };
  store.publish('saved');
  expect(events).toEqual([state]);
});

test('unsubscribe during delivery and a failed subscriber cannot break other features', () => {
  const called = [],
    errors = [],
    store = createStore(
      () => ({ anime: [] }),
      () => 'owner',
      (error) => errors.push(error),
    );
  let stop = () => {};
  store.subscribe(() => {
    called.push('first');
    stop();
    throw Error('failed view');
  });
  stop = store.subscribe(() => called.push('removed'));
  store.subscribe(() => called.push('last'));
  store.publish('saved');
  expect(called).toEqual(['first', 'last']);
  expect(errors).toHaveLength(1);
});
