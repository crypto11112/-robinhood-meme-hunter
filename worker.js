--- /mnt/data/V963.txt	2026-09-29 08:49:53.284872142 +0000
+++ /mnt/data/V964.txt	2026-09-29 08:50:34.468526451 +0000
@@ -8421,7 +8421,7 @@
  * - Existing KV binding/key, request budgets and Telegram thresholds are unchanged
 */
 /* V949: smarter /holderprototype auto-selection chooses freshest token with verified launch/deployment anchor; legacy holder providers remain preserved and production logic unchanged. */
-const VERSION = "V963";
+const VERSION = "V964";
 /* V947: adds an isolated direct-chain ERC-20 holder reconstruction feasibility prototype.
  * V948 hotfix: /holderprototype reply formatter now uses the existing shortAddressV937 helper; fixes runtime ReferenceError without changing prototype logic.
  * /holderprototype [token] scans Transfer logs directly through the existing RPC router.
@@ -169279,12 +169279,13 @@
     parsed.command === "/blockscouttransport" ||
     parsed.command === "/transportusage"
   ) {
-    // V963: assign the diagnostic reply and continue through the proven
-    // Telegram send path. V962 returned early here, so Telegram never sent it.
+    // V964: keep this command inside the same exclusive command chain.
+    // V963 assigned the reply correctly, but the following independent `if` chain
+    // fell through to /help and overwrote it before Telegram send.
     reply = blockscoutTransportAuditTelegramV962(state);
   }
 
-  if (
+  else if (
     parsed.command === "/blockscoutrpc" ||
     parsed.command === "/rpcusage"
   ) {
