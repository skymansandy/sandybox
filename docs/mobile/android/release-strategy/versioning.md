# Versioning

## Version Code vs Version Name

| Property | Type | Purpose | User-Visible? |
|----------|------|---------|---------------|
| `versionCode` | Integer | Unique build identifier for Play Store ordering | No |
| `versionName` | String | Human-readable version displayed to users | Yes |

```kotlin
android {
    defaultConfig {
        versionCode = 42
        versionName = "2.3.1"
    }
}
```

!!! warning "Version Code Rules"
    - Must be strictly increasing for each upload to Play Store
    - Maximum value: 2,100,000,000
    - Cannot be reused — even if you remove a published version
    - Higher version code always supersedes lower, regardless of version name

---

## Semantic Versioning

Format: `MAJOR.MINOR.PATCH` (e.g., `2.3.1`)

| Component | When to Bump | Example |
|-----------|-------------|---------|
| **MAJOR** | Breaking changes, major redesigns | 1.x.x → 2.0.0 |
| **MINOR** | New features, non-breaking | 2.2.x → 2.3.0 |
| **PATCH** | Bug fixes, hotfixes | 2.3.0 → 2.3.1 |

---

## Automated Version Code Strategies

=== "Timestamp-Based"

    ```kotlin
    // build.gradle.kts
    android {
        defaultConfig {
            // Format: YYMMDDHHMM — always increasing
            val date = java.time.LocalDateTime.now()
            versionCode = date.format(
                java.time.format.DateTimeFormatter.ofPattern("yyMMddHHmm")
            ).toInt()
        }
    }
    ```

=== "Git Commit Count"

    ```kotlin
    // build.gradle.kts
    fun gitCommitCount(): Int {
        val process = ProcessBuilder("git", "rev-list", "--count", "HEAD")
            .directory(projectDir)
            .start()
        return process.inputStream.bufferedReader().readText().trim().toInt()
    }

    android {
        defaultConfig {
            versionCode = gitCommitCount()
        }
    }
    ```

=== "Manual with CI Override"

    ```kotlin
    // build.gradle.kts
    android {
        defaultConfig {
            versionCode = (System.getenv("BUILD_NUMBER") ?: "1").toInt()
            versionName = System.getenv("VERSION_NAME") ?: "1.0.0-dev"
        }
    }
    ```

---

## Multi-Module Version Management

### Version Catalogs

```toml
# gradle/libs.versions.toml
[versions]
app-version-code = "42"
app-version-name = "2.3.1"
compileSdk = "34"
minSdk = "24"
targetSdk = "34"
```

```kotlin
// build.gradle.kts
android {
    defaultConfig {
        versionCode = libs.versions.app.version.code.get().toInt()
        versionName = libs.versions.app.version.name.get()
    }
}
```

---

## Version Code with Build Variants

When publishing multiple APKs (e.g., per-ABI splits), each needs a unique version code:

```kotlin
android {
    splits {
        abi {
            isEnable = true
            include("armeabi-v7a", "arm64-v8a", "x86", "x86_64")
        }
    }
}

// Assign unique version codes per ABI
val abiCodes = mapOf(
    "armeabi-v7a" to 1,
    "arm64-v8a" to 2,
    "x86" to 3,
    "x86_64" to 4
)

applicationVariants.all {
    outputs.all {
        val output = this as com.android.build.gradle.internal.api.BaseVariantOutputImpl
        val abi = output.getFilter(com.android.build.OutputFile.ABI)
        if (abi != null) {
            output.versionCodeOverride = (abiCodes[abi] ?: 0) * 1_000_000 + defaultConfig.versionCode!!
        }
    }
}
```

!!! note "AAB Eliminates This"
    If you upload an AAB instead of split APKs, Google Play handles per-device optimization automatically — no version code multiplexing needed.

---

## Version Display in App

```kotlin
// Read version at runtime
val versionName = context.packageManager
    .getPackageInfo(context.packageName, 0)
    .versionName

val versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
    context.packageManager
        .getPackageInfo(context.packageName, 0)
        .longVersionCode
} else {
    @Suppress("DEPRECATION")
    context.packageManager
        .getPackageInfo(context.packageName, 0)
        .versionCode.toLong()
}
```

---

## Version Comparison

```kotlin
data class AppVersion(
    val major: Int,
    val minor: Int,
    val patch: Int
) : Comparable<AppVersion> {

    override fun compareTo(other: AppVersion): Int {
        return compareValuesBy(this, other, { it.major }, { it.minor }, { it.patch })
    }

    companion object {
        fun parse(version: String): AppVersion {
            val parts = version.split(".").map { it.toInt() }
            return AppVersion(
                major = parts.getOrElse(0) { 0 },
                minor = parts.getOrElse(1) { 0 },
                patch = parts.getOrElse(2) { 0 }
            )
        }
    }
}

// Usage
val current = AppVersion.parse("2.3.1")
val minimum = AppVersion.parse("2.0.0")
if (current < minimum) showForceUpdateDialog()
```

---

??? question "Common Interview Questions"

    **Q: Why is version code separate from version name?**
    Version code is a monotonically increasing integer used by the Play Store to determine update ordering — newer versions must have higher codes. Version name is a human-readable string with no constraints. This separation allows semantic versioning for users while maintaining strict ordering for the distribution system.

    **Q: What happens if you upload a build with a lower version code?**
    Play Store rejects it. Version codes must always increase. Even if you unpublish a version, its code is consumed — you cannot reuse it.

    **Q: How do you handle versioning across flavors?**
    For AAB: use a single version code; Google handles per-device optimization. For split APKs: multiply a base version code by an ABI/density prefix to create unique codes per split while maintaining ordering. Convention: `<abi_prefix> * 1_000_000 + base_version_code`.

    **Q: Timestamp vs commit-count for automated version codes?**
    Timestamp is simpler and always increases, but can collide if two builds run in the same minute. Commit count is deterministic and reproducible from git history, but rebases/squashes can cause non-monotonic values. CI build numbers (from the CI system) are the most reliable — always increasing, no local state dependency.

!!! tip "Further Reading"
    - [Android versioning documentation](https://developer.android.com/studio/publish/versioning)
    - [Semantic Versioning spec](https://semver.org/)
