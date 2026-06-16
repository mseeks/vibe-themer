import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { COMMAND_IDS, commandHandlers } from '../src/commands';
import { harness } from './support/harness';

const VALID_KEY = `sk-${'x'.repeat(40)}`;

const changeTheme = (caps: ReturnType<typeof harness>['caps']): Promise<void> =>
  commandHandlers(caps)[COMMAND_IDS.changeTheme]();

describe('changeTheme command — notifications', () => {
  it('stays silent when the vibe picker is dismissed (NoVibe)', async () => {
    // A harness with no `vibe` makes pickVibe return None — the user dismissed the
    // picker. That is a benign exit and must not raise a notification.
    const h = harness({ storedKey: VALID_KEY });
    await changeTheme(h.caps);
    assert.deepEqual(h.captured.notifications, []);
  });

  it('still surfaces a provider failure as an error notification', async () => {
    // The same handler must keep reporting genuine failures, so dropping the
    // dismissed-vibe toast cannot silently swallow real errors too.
    const h = harness({ storedKey: VALID_KEY, vibe: 'cozy', streamError: { _tag: 'RateLimited' } });
    await changeTheme(h.caps);
    assert.equal(h.captured.notifications.length, 1);
    const [notification] = h.captured.notifications;
    assert.ok(notification);
    assert.equal(notification.severity, 'error');
  });
});
