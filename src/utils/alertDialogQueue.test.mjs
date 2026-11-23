import assert from "node:assert/strict";
import test from "node:test";
import { AlertDialogQueue } from "./alertDialogQueue.ts";

test("shows queued dialogs in order and runs the selected callback once", () => {
  const queue = new AlertDialogQueue();
  let accepted = 0;
  const first = queue.show("Confirm", "Continue?", [
    { text: "Cancel", style: "cancel" },
    { text: "Continue", onPress: () => accepted++ },
  ]);
  const second = queue.show("Next");

  assert.equal(queue.getCurrent()?.id, first);
  queue.pressButton(first, 1);
  assert.equal(accepted, 1);
  assert.equal(queue.getCurrent()?.id, second);
  queue.pressButton(first, 1);
  assert.equal(accepted, 1);
});

test("backdrop cancellation is ignored unless the dialog is cancelable", () => {
  const queue = new AlertDialogQueue();
  let dismissed = 0;
  const protectedDialog = queue.show("Required", "Complete this action first.", undefined, {
    onDismiss: () => dismissed++,
  });

  assert.equal(queue.getCurrent()?.id, protectedDialog);
  assert.equal(queue.getCurrent()?.cancelable, false);

  const cancelableDialog = queue.show("Notice", undefined, undefined, {
    cancelable: true,
    onDismiss: () => dismissed++,
  });
  queue.dismiss(protectedDialog);
  assert.equal(queue.getCurrent()?.id, protectedDialog);
  queue.pressButton(protectedDialog, 0);
  assert.equal(dismissed, 1);
  assert.equal(queue.getCurrent()?.id, cancelableDialog);
  queue.dismiss(cancelableDialog);
  assert.equal(dismissed, 2);
});

test("routes dialogs to the foremost visible native modal", () => {
  const queue = new AlertDialogQueue();
  queue.setModalVisible("request", true);
  queue.setModalVisible("chat", true);
  assert.equal(queue.getActiveModalId(), "chat");

  queue.setModalVisible("chat", false);
  assert.equal(queue.getActiveModalId(), "request");
  queue.setModalVisible("request", false);
  assert.equal(queue.getActiveModalId(), null);
});