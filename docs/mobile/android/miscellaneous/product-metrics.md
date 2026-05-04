# Product Metrics

## Core Metrics

| Metric | Definition | Benchmark |
|--------|-----------|-----------|
| **DAU** | Daily Active Users (new + old). Opened the app at least once that day. | -- |
| **MAU** | Monthly Active Users (new + old). | -- |
| **DAU/MAU** | Monthly retention ratio. | 16% is a good standard. |

---

## Retention

!!! info "How Retention is Measured"

    - **Day 0** = install day.
    - **D1 Retention** = percentage of Day 0 users who return the next day.
    - Similarly: **W1** (week 1), **M1** (month 1).
    - **30--40% M1 retention** is considered good.

---

## L28

- Count of **unique days** a user was active in a 28-day window.
- **7** is a good benchmark (user opens the app once a week on average).

---

## Engagement Metrics

| Metric | Definition | Good Benchmark |
|--------|-----------|---------------|
| **User Engagement** | Average daily usage time per user. | ~10 minutes |
| **Session Time** | One continuous usage block (configurable, e.g., 5 min of inactivity = new session). | Varies by app |

---

## Retention Ideas

!!! tip "Strategies to Improve Retention"

    - **Notification after 24 hours of install**: Remind users to come back and complete onboarding or explore features.
    - **Streak + rewards**: Encourage daily usage with streak counters. Offer the option to **pay to repair a broken streak** for monetization.

---

## Interview Q&A

??? question "What is DAU/MAU ratio and what does it indicate?"
    DAU/MAU is the ratio of Daily Active Users to Monthly Active Users and measures how frequently users return to the app within a month. A ratio of 16% is considered a good standard. A higher ratio indicates stronger daily engagement and stickiness, while a lower ratio suggests users open the app infrequently.

??? question "What is the difference between retention and engagement?"
    Retention measures whether users come back to the app over time (e.g., D1, W1, M1 retention rates). Engagement measures how deeply users interact during each visit, including metrics like session time and daily usage duration. An app can have high retention but low engagement if users open the app briefly each day.

??? question "What is L28 and why is it useful?"
    L28 counts the number of unique days a user was active within a 28-day window. A benchmark of 7 means the user opens the app about once a week on average. L28 is useful because it captures usage frequency in a single metric, providing a more nuanced view than binary active/inactive classifications.

??? question "How would you measure the success of a new feature from a metrics perspective?"
    Track feature adoption rate (what percentage of users try it), retention impact (does it improve D7/D30 retention for users who engage with it), engagement lift (does session time increase), and potential negative signals (does it increase uninstall rate or decrease usage of other features). Compare metrics between a control group and the feature group using A/B testing.

!!! tip "Further Reading"
    - [Google Analytics for Firebase - Android](https://firebase.google.com/docs/analytics/get-started?platform=android)
    - [Android Vitals - Google Play Console](https://developer.android.com/topic/performance/vitals)
    - [Measure app performance with Android Vitals - Android Developers](https://developer.android.com/distribute/best-practices/develop/android-vitals)
