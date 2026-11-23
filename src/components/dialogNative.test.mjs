import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";

const require = createRequire(import.meta.url);
const typescript = require("typescript");
const dialogShimPath = fileURLToPath(new URL("./dialogNative.ts", import.meta.url));

const dialogConsumers = [
  "../app/(auth)/complete-profile.tsx",
  "../app/(auth)/mfa.tsx",
  "../app/(auth)/sign-in.tsx",
  "../app/(tabs)/index.tsx",
  "../app/(tabs)/settings.tsx",
  "../app/(tabs)/vehicle.tsx",
  "../app/crud_vehicle/add.tsx",
  "../app/crud_vehicle/edit.tsx",
  "../app/diagnosis.tsx",
  "../app/edit_profile.tsx",
  "../app/emergency_contacts.tsx",
  "./CardManagementModal.tsx",
  "./RescueChatModal.tsx",
  "./VehicleSelectionModal.tsx",
];

test("dialog shim does not re-export removed React Native APIs", async () => {
  const source = await readFile(dialogShimPath, "utf8");
  const compiled = typescript.transpileModule(source, {
    compilerOptions: { module: typescript.ModuleKind.CommonJS },
  }).outputText;
  const alert = {};
  const modal = {};
  let reactNativeWasRequested = false;
  const reactNative = new Proxy(
    {},
    {
      ownKeys: () => ["InteractionManager"],
      get: (_target, name) => {
        if (name === "InteractionManager") {
          throw new Error("InteractionManager has been removed from react-native core");
        }
        return undefined;
      },
      getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true }),
    },
  );
  const module = { exports: {} };
  const mockedRequire = (specifier) => {
    if (specifier === "react-native") {
      reactNativeWasRequested = true;
      return reactNative;
    }
    if (specifier === "@/components/AppDialog") {
      return { Alert: alert, DialogModal: modal };
    }
    throw new Error(`Unexpected import: ${specifier}`);
  };

  runInNewContext(compiled, { exports: module.exports, module, require: mockedRequire });

  assert.equal(reactNativeWasRequested, false);
  assert.deepEqual(Object.keys(module.exports).sort(), ["Alert", "Modal"]);
  assert.equal(module.exports.Alert, alert);
  assert.equal(module.exports.Modal, modal);
});

test("dialog consumers import only Alert and Modal from the custom shim", async () => {
  for (const consumer of dialogConsumers) {
    const source = await readFile(new URL(consumer, import.meta.url), "utf8");
    const imports = [...source.matchAll(/\bimport\s*\{([^}]+)\}\s*from\s*["']@\/components\/dialogNative["']/gs)];

    assert.ok(imports.length > 0, `${consumer} should import its dialog API from dialogNative`);
    for (const [, bindings] of imports) {
      const importedNames = bindings
        .split(",")
        .map((binding) => binding.trim().split(/\s+as\s+/)[0])
        .filter(Boolean);
      assert.ok(
        importedNames.every((name) => name === "Alert" || name === "Modal"),
        `${consumer} imports non-dialog React Native exports from dialogNative`,
      );
    }
  }
});