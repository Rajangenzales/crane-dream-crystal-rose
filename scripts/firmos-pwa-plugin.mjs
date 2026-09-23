/**
 * FirmOS PWA boundary.
 *
 * The implementation is temporarily delegated to the legacy platform PWA
 * plugin so we can migrate behavior without changing runtime behavior in one
 * large step. New application code should import this boundary, not the
 * legacy platform module.
 */
import { grokPwaPlugin } from "./grok-pwa-plugin.mjs";

export function firmosPwaPlugin() {
  const plugin = grokPwaPlugin();
  return {
    ...plugin,
    name: "firmos:pwa",
  };
}
