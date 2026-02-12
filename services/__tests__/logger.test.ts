import { describe, it, expect, beforeEach } from 'vitest';
import { logger, LogEntry } from '../logger';

describe('logger service', () => {
  beforeEach(() => {
    logger.clearBuffer();
  });

  it('logs info messages', () => {
    logger.info('test', 'hello world');
    expect(logger.getBuffer().length).toBe(1);

    // Buffer is newest-first, so index 0 is the most recent entry
    const entry = logger.getBuffer()[0];
    expect(entry.level).toBe('info');
    expect(entry.module).toBe('test');
    expect(entry.message).toBe('hello world');
  });

  it('logs all levels', () => {
    const levels: Array<'debug' | 'info' | 'warn' | 'error'> = ['debug', 'info', 'warn', 'error'];

    levels.forEach(level => logger[level]('mod', `${level} msg`));

    const buf = logger.getBuffer();
    expect(buf.length).toBe(4);

    // Buffer is newest-first: index 0 = error (last logged), index 3 = debug (first logged)
    for (let i = 0; i < levels.length; i++) {
      const entry = buf[levels.length - 1 - i];
      expect(entry.level).toBe(levels[i]);
      expect(entry.message).toBe(`${levels[i]} msg`);
    }
  });

  it('includes timestamp in entries', () => {
    logger.info('test', 'timestamp check');
    const entry = logger.getBuffer()[0];
    expect(entry.timestamp).toBeLessThanOrEqual(Date.now());
    expect(entry.timestamp).toBeGreaterThan(0);
  });

  it('subscribe receives new entries', () => {
    const received: LogEntry[] = [];
    const unsub = logger.subscribe(entry => received.push(entry));

    logger.info('sub', 'message 1');
    logger.warn('sub', 'message 2');

    expect(received.length).toBe(2);
    expect(received[0].message).toBe('message 1');
    expect(received[1].level).toBe('warn');

    unsub();

    // After unsubscribe, no more entries
    logger.info('sub', 'message 3');
    expect(received.length).toBe(2);
  });

  it('getBuffer returns readonly array', () => {
    const buf = logger.getBuffer();
    expect(Array.isArray(buf)).toBe(true);
  });

  it('buffer caps at 200 entries', () => {
    for (let i = 0; i < 210; i++) {
      logger.info('bulk', `msg-${i}`);
    }
    const buf = logger.getBuffer();
    expect(buf.length).toBe(200);
    // Newest first: index 0 should be msg-209, index 199 should be msg-10
    expect(buf[0].message).toBe('msg-209');
    expect(buf[199].message).toBe('msg-10');
  });

  it('setMinLevel filters out lower-severity messages', () => {
    logger.setMinLevel('warn');
    logger.debug('filtered', 'should not appear');
    logger.info('filtered', 'should not appear');
    logger.warn('filtered', 'should appear');
    logger.error('filtered', 'should appear');

    const buf = logger.getBuffer();
    expect(buf.length).toBe(2);
    expect(buf.map(e => e.level)).toEqual(['error', 'warn']);

    // Reset for other tests
    logger.setMinLevel('debug');
  });

  it('multiple subscribers all receive entries', () => {
    const received1: LogEntry[] = [];
    const received2: LogEntry[] = [];
    const unsub1 = logger.subscribe(e => received1.push(e));
    const unsub2 = logger.subscribe(e => received2.push(e));

    logger.info('multi', 'broadcast');

    expect(received1.length).toBe(1);
    expect(received2.length).toBe(1);
    expect(received1[0].message).toBe('broadcast');

    unsub1();
    unsub2();
  });

  it('unsubscribe only removes the specific listener', () => {
    const received1: LogEntry[] = [];
    const received2: LogEntry[] = [];
    const unsub1 = logger.subscribe(e => received1.push(e));
    logger.subscribe(e => received2.push(e));

    unsub1(); // Remove listener 1

    logger.info('test', 'after unsub');
    expect(received1.length).toBe(0);
    expect(received2.length).toBe(1);
  });

  it('clearBuffer empties the buffer completely', () => {
    logger.info('test', 'msg1');
    logger.info('test', 'msg2');
    expect(logger.getBuffer().length).toBe(2);

    logger.clearBuffer();
    expect(logger.getBuffer().length).toBe(0);
  });

  it('buffer stores entries newest-first', () => {
    logger.info('order', 'first');
    logger.info('order', 'second');
    logger.info('order', 'third');

    const buf = logger.getBuffer();
    expect(buf[0].message).toBe('third');
    expect(buf[1].message).toBe('second');
    expect(buf[2].message).toBe('first');
  });
});
