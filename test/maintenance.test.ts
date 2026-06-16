import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clearApiKey, resetModel, resetTheme, selectModel } from '../src/application/maintenance';
import { makeModel, sameModel } from '../src/domain/model';
import { harness, type Harness } from './support/harness';

const VALID_KEY = `sk-${'x'.repeat(40)}`;

const onlyNotification = (h: Harness): { severity: string; title: string } => {
  assert.equal(h.captured.notifications.length, 1);
  const [notification] = h.captured.notifications;
  assert.ok(notification);
  return notification;
};

describe('resetTheme', () => {
  it('resets customizations and acknowledges without an error toast', async () => {
    const h = harness();
    await resetTheme(h.caps);
    // Success is announced via announceReset (silent in the fake), not notify.
    assert.equal(h.captured.resets, 1);
    assert.deepEqual(h.captured.notifications, []);
  });

  it('surfaces an error notification when the reset fails', async () => {
    const h = harness({ failReset: true });
    await resetTheme(h.caps);
    assert.equal(h.captured.resets, 0);
    assert.equal(onlyNotification(h).severity, 'error');
  });
});

describe('clearApiKey', () => {
  it('clears every stored key and confirms with an info notification', async () => {
    const h = harness({ storedKey: VALID_KEY });
    await clearApiKey(h.caps);
    assert.equal(h.captured.keyCleared, true);
    assert.equal(onlyNotification(h).severity, 'info');
  });

  it('surfaces an error notification when clearing fails', async () => {
    const h = harness({ failClearKeys: true });
    await clearApiKey(h.caps);
    assert.equal(h.captured.keyCleared, false);
    assert.equal(onlyNotification(h).severity, 'error');
  });
});

describe('resetModel', () => {
  it('clears the selected model and confirms with an info notification', async () => {
    const h = harness({ selectedModel: makeModel('anthropic', 'claude-sonnet-4-6') });
    await resetModel(h.caps);
    assert.equal(h.caps.preferences.selectedModel()._tag, 'None');
    assert.equal(onlyNotification(h).severity, 'info');
  });
});

describe('selectModel', () => {
  it('stores the picked model and names it in an info notification', async () => {
    const chosen = makeModel('anthropic', 'claude-haiku-4-5');
    const h = harness({ pickedModel: chosen });
    await selectModel(h.caps);

    const selected = h.caps.preferences.selectedModel();
    assert.equal(selected._tag, 'Some');
    if (selected._tag === 'Some') {
      assert.ok(sameModel(selected.value, chosen));
    }
    const notification = onlyNotification(h);
    assert.equal(notification.severity, 'info');
    assert.ok(notification.title.includes('claude-haiku-4-5'), notification.title);
  });

  it('does nothing when the picker is dismissed', async () => {
    const h = harness();
    await selectModel(h.caps);
    assert.equal(h.caps.preferences.selectedModel()._tag, 'None');
    assert.deepEqual(h.captured.notifications, []);
  });
});
