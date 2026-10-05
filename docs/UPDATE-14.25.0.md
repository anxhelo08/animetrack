# AnimeTrack 14.25.0

Mobile navigation refreshes the destination once instead of rendering the previous mobile page and then the destination. Discovery retains unchanged cards, reducing sanitization, DOM replacement and image churn. All-time profile/badge analysis is shared until a store event, state replacement, account change or local date change invalidates it. Library progress and cloud persistence continue through the existing controller.

A Chromium phone-layout comparison with 100 titles, 50 synchronous navigation clicks and 4× CPU throttling measured a median of 27 ms before and 22 ms after these changes; maximum click-handler duration was 115 ms before and 101 ms after. A repeated final-build run measured 24 ms median and 74 ms maximum, illustrating normal measurement variation. These are local fixture measurements, not physical-device startup or network benchmarks. Browser checks preserve cached library/discovery nodes, styles, progress, Diary, episode images and mobile reading.

The existing Android APK opens the live web application and receives these web improvements without a native-shell rebuild. Its download metadata still correctly identifies native shell version 14.24.0.
