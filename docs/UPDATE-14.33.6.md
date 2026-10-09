# AnimeTrack 14.33.6 — Account startup recovery

The startup watchdog previously stopped when the JavaScript controller loaded, before asynchronous account verification completed. A stalled session or cloud request could therefore leave the installed app on “Po hap llogarinë…” indefinitely.

Session verification now has a 12-second deadline. A late session result cannot invoke the account-opening path. Startup clock calibration and cloud-library reads also have a 12-second deadline around the complete SDK operation, including response parsing. Late results are ignored by the account-opening path. The existing cloud-library path retains the account's validated local copy when a read fails; session failure shows the public welcome page without removing stored sessions, libraries, backups or pending changes.

The watchdog remains active through account startup and offers “Provo përsëri” while the account is delayed. Reloading retries normal verification. No storage schema, database policy, CSP host or public window global changes.

Regression coverage exercises stalled session verification, late results, stalled cloud operations, retained SDK errors, retained library storage and successful recovery after reload. Browser checks use desktop Chromium and the iPhone Chromium viewport; they do not establish Safari behavior on a physical device.

Validation: typecheck, lint, format:check, npm test (635 tests in 92 files), build and the existing JavaScript budget check all passed. Twelve browser scenarios passed across desktop Chromium and the iPhone Chromium viewport, including stalled session/read recovery, registration and PWA release consistency. Startup JavaScript is 307,794 bytes gzip; total is 346,678 bytes gzip. Existing budgets were retained.
