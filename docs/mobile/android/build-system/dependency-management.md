# Dependency Management

How Gradle resolves, caches, and manages dependencies — from declaration to classpath.

---

## Dependency Configurations

Configurations define the scope and visibility of a dependency.

| Configuration | Compile Classpath | Runtime Classpath | Transitive to Consumers | When to Use |
|--------------|:-:|:-:|:-:|-------------|
| `implementation` | Yes | Yes | No | **Default choice.** Internal usage only |
| `api` | Yes | Yes | Yes | When your public API exposes types from the dependency |
| `compileOnly` | Yes | No | No | Compile-time annotations, compile checks (e.g., `@Nullable`) |
| `runtimeOnly` | No | Yes | No | Needed at runtime but not compile time (e.g., SLF4J impl) |
| `ksp` / `kapt` | — | — | — | Annotation processors |
| `testImplementation` | Test only | Test only | No | Unit test dependencies |
| `androidTestImplementation` | Instrumented test | Instrumented test | No | UI/integration test dependencies |

```kotlin
dependencies {
    implementation(libs.retrofit)              // internal HTTP client
    api(libs.retrofit.response)               // Response<T> exposed in public API
    compileOnly(libs.javax.annotation)        // @Nullable, stripped at runtime
    runtimeOnly(libs.slf4j.android)           // logging impl chosen at runtime
    ksp(libs.room.compiler)                   // Room annotation processor
    testImplementation(libs.junit)            // unit tests only
    debugImplementation(libs.leakcanary)      // debug builds only
}
```

!!! warning "api vs implementation"
    Using `api` where `implementation` suffices breaks encapsulation and hurts build performance. When an `api` dependency changes, **all transitive consumers** must recompile. Default to `implementation` — promote to `api` only when the compiler requires it.

---

## Version Catalogs

Centralized dependency management via `gradle/libs.versions.toml`:

```toml
[versions]
agp = "8.7.3"
kotlin = "2.0.21"
compose-bom = "2024.12.01"
coroutines = "1.9.0"
hilt = "2.51.1"
retrofit = "2.11.0"
room = "2.6.1"
ksp = "2.0.21-1.0.28"

[libraries]
# AndroidX
androidx-core-ktx = { module = "androidx.core:core-ktx", version = "1.15.0" }
androidx-lifecycle-runtime = { module = "androidx.lifecycle:lifecycle-runtime-ktx", version = "2.8.7" }

# Compose (BOM-managed)
compose-bom = { module = "androidx.compose:compose-bom", version.ref = "compose-bom" }
compose-ui = { module = "androidx.compose.ui:ui" }
compose-material3 = { module = "androidx.compose.material3:material3" }

# Networking
retrofit = { module = "com.squareup.retrofit2:retrofit", version.ref = "retrofit" }
retrofit-gson = { module = "com.squareup.retrofit2:converter-gson", version.ref = "retrofit" }
okhttp-logging = { module = "com.squareup.okhttp3:logging-interceptor", version = "4.12.0" }

# DI
hilt-android = { module = "com.google.dagger:hilt-android", version.ref = "hilt" }
hilt-compiler = { module = "com.google.dagger:hilt-compiler", version.ref = "hilt" }

# Database
room-runtime = { module = "androidx.room:room-runtime", version.ref = "room" }
room-ktx = { module = "androidx.room:room-ktx", version.ref = "room" }
room-compiler = { module = "androidx.room:room-compiler", version.ref = "room" }

[bundles]
compose = ["compose-ui", "compose-material3"]
room = ["room-runtime", "room-ktx"]

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
android-library = { id = "com.android.library", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
hilt = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }
ksp = { id = "com.google.devtools.ksp", version.ref = "ksp" }
```

Usage in build scripts:

```kotlin
dependencies {
    implementation(platform(libs.compose.bom))
    implementation(libs.bundles.compose)
    implementation(libs.bundles.room)
    ksp(libs.room.compiler)
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
}
```

!!! tip "Bundles"
    Group commonly-used-together libraries into `[bundles]` to reduce boilerplate. A single `libs.bundles.compose` replaces listing 5+ compose dependencies.

---

## BOMs (Bill of Materials)

A BOM defines compatible versions for a set of libraries. You declare the BOM once, then use libraries without specifying versions.

```kotlin
dependencies {
    // Compose BOM — sets versions for ALL compose libraries
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)           // version from BOM
    implementation(libs.compose.material3)    // version from BOM

    // OkHttp BOM
    implementation(platform("com.squareup.okhttp3:okhttp-bom:4.12.0"))
    implementation("com.squareup.okhttp3:okhttp")
    implementation("com.squareup.okhttp3:logging-interceptor")
}
```

**How it works:** `platform()` imports the BOM's dependency constraints. Libraries matching those constraints get their version from the BOM. You can still override individual versions if needed.

---

## Dependency Resolution

When multiple versions of the same library appear in the dependency graph, Gradle must resolve the conflict.

### Default Strategy: Highest Version Wins

```
:app → :feature:home → okhttp:4.11.0
:app → :feature:profile → okhttp:4.12.0
Result: okhttp:4.12.0 (highest wins)
```

### Force a Specific Version

```kotlin
configurations.all {
    resolutionStrategy {
        // Force specific version
        force("com.squareup.okhttp3:okhttp:4.12.0")

        // Fail on version conflict instead of silently resolving
        failOnVersionConflict()
    }
}
```

### Exclude Transitive Dependencies

```kotlin
dependencies {
    implementation(libs.some.library) {
        exclude(group = "org.json", module = "json")
    }
}

// Or globally for a configuration
configurations.implementation {
    exclude(group = "org.json", module = "json")
}
```

### Substitution Rules

```kotlin
configurations.all {
    resolutionStrategy.dependencySubstitution {
        // Replace a remote dependency with a local module
        substitute(module("com.example:my-lib"))
            .using(project(":local-my-lib"))

        // Replace one artifact with another
        substitute(module("com.android.support:support-v4"))
            .using(module("androidx.legacy:legacy-support-v4:1.0.0"))
    }
}
```

---

## Dependency Locking

Pin resolved dependency versions to ensure reproducible builds across environments.

```kotlin
// Enable dependency locking
dependencyLocking {
    lockAllConfigurations()
}
```

```bash
# Generate lock files
./gradlew dependencies --write-locks

# Lock files are created at:
# module/gradle.lockfile
```

The lock file contains exact resolved versions:

```
# This is a Gradle generated file for dependency locking.
com.squareup.okhttp3:okhttp:4.12.0=releaseCompileClasspath,releaseRuntimeClasspath
com.squareup.retrofit2:retrofit:2.11.0=releaseCompileClasspath,releaseRuntimeClasspath
```

!!! tip "When to use locking"
    Dependency locking is most valuable for libraries (to ensure consumers get tested combinations) and CI builds (to prevent non-deterministic resolution). For apps with a version catalog, locking is less critical but still useful as a safety net.

---

## Inspecting Dependencies

```bash
# Full dependency tree for a configuration
./gradlew :app:dependencies --configuration releaseRuntimeClasspath

# Why was a specific dependency included?
./gradlew :app:dependencyInsight \
    --dependency okhttp \
    --configuration releaseRuntimeClasspath

# Find unused and misused dependencies
# (requires dependency-analysis-gradle-plugin)
./gradlew buildHealth
```

Sample `dependencyInsight` output:

```
com.squareup.okhttp3:okhttp:4.12.0
  Variant releaseRuntimeClasspath:
    - Was requested: 4.11.0 → upgraded to 4.12.0
    - By constraint: platform com.squareup.okhttp3:okhttp-bom:4.12.0
```

---

## KSP vs KAPT

| Aspect | KAPT | KSP |
|--------|------|-----|
| **Mechanism** | Generates Java stubs, runs Java annotation processors | Kotlin-native compiler plugin |
| **Speed** | Slow — requires stub generation (essentially compiles twice) | 2-3x faster — no stub generation |
| **Incremental** | Limited | Full incremental support |
| **Kotlin features** | Limited Kotlin awareness | Full Kotlin type information |
| **Compatibility** | Works with all Java annotation processors | Library must provide KSP processor |

```kotlin
plugins {
    id("com.google.devtools.ksp")
}

dependencies {
    // KSP (preferred)
    ksp(libs.room.compiler)
    ksp(libs.hilt.compiler)

    // KAPT (legacy, only if no KSP processor available)
    kapt(libs.some.legacy.processor)
}
```

!!! tip "Migrate KAPT to KSP"
    Most major libraries (Room, Hilt, Moshi) now support KSP. Replace `kapt` with `ksp` and remove the `kotlin-kapt` plugin. Expect 20-40% faster builds for annotation-heavy modules.

---

??? question "Interview Questions"

    **Q: What's the difference between `implementation` and `api`?**

    `implementation` hides the dependency from consumers — changes only recompile the declaring module. `api` exposes it transitively — changes recompile the declaring module AND all its consumers. Default to `implementation` for encapsulation and build speed.

    **Q: How does Gradle resolve version conflicts?**

    By default, highest version wins. You can customize with `resolutionStrategy`: force specific versions, fail on conflict, or substitute modules. BOMs provide coordinated version sets to avoid conflicts.

    **Q: What's a BOM and why use it?**

    A Bill of Materials defines compatible versions for a library family (e.g., all Compose libraries). Import it with `platform()` and omit versions from individual library declarations. Ensures version compatibility and simplifies upgrades.

    **Q: Why prefer KSP over KAPT?**

    KSP is 2-3x faster because it doesn't require generating Java stubs (no double-compilation). It also has full Kotlin-native type information and better incremental processing support.

    **Q: What is dependency locking?**

    Locking records the exact resolved versions of all dependencies to a lock file. This ensures builds are reproducible — the same dependency graph resolves identically on CI and other developers' machines, even if new versions are published.
