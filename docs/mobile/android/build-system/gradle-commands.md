# Gradle CLI Commands

A practical reference of the most useful Gradle command-line flags — for debugging builds, inspecting the task graph, controlling execution, and diagnosing performance.

---

## Quick Reference

| Flag | Purpose | Phase |
|------|---------|-------|
| `--dry-run` (`-m`) | Print tasks that _would_ run without executing them | Execution |
| `--rerun-tasks` | Ignore up-to-date checks and cache — force all tasks to execute | Execution |
| `--no-build-cache` | Disable the build cache for this invocation | Execution |
| `--scan` | Generate a build scan with full profiling data | All |
| `--profile` | Generate a local HTML performance report | All |
| `--info` / `--debug` | Increase log verbosity | All |
| `--stacktrace` / `--full-stacktrace` | Print exception stack traces | All |
| `--configuration-cache-problems=warn` | Surface config cache violations without failing | Configuration |
| `--parallel` / `--no-parallel` | Override parallel execution setting | Execution |
| `--continue` | Keep going after a task failure | Execution |
| `--offline` | Disable network access for dependency resolution | Configuration |

---

## Inspecting the Task Graph

### --dry-run (-m)

Prints every task that _would_ execute — in order — without actually running anything. Essential for understanding task dependencies.

```bash
./gradlew assembleDebug --dry-run
```

```
:core:domain:compileDebugKotlin SKIPPED
:core:domain:javaPreCompileDebug SKIPPED
:app:mergeDebugResources SKIPPED
:app:packageDebug SKIPPED
:app:assembleDebug SKIPPED
```

!!! tip "Use it to verify task ordering"
    Before adding `dependsOn` or `mustRunAfter` to custom tasks, use `--dry-run` to confirm the graph looks correct without paying for a full build.

### tasks

```bash
# List tasks grouped by category
./gradlew tasks

# Include tasks from all modules (verbose)
./gradlew tasks --all

# Filter to a specific group
./gradlew tasks --group=build
```

### dependencies

Inspect the resolved dependency tree for a specific configuration:

```bash
# Full dependency tree for the app module
./gradlew :app:dependencies

# Filter to a specific configuration
./gradlew :app:dependencies --configuration=debugRuntimeClasspath

# Find why a specific dependency is included
./gradlew :app:dependencyInsight --dependency=okhttp --configuration=debugRuntimeClasspath
```

### properties

Dump all project properties — useful for verifying values from `gradle.properties`, environment variables, or plugin-injected properties:

```bash
./gradlew :app:properties
```

---

## Controlling Execution

### --rerun-tasks

Forces every task to re-execute, ignoring both up-to-date checks and the build cache. Useful when debugging flaky builds or validating that a clean build succeeds.

```bash
./gradlew assembleDebug --rerun-tasks
```

!!! warning "Expensive"
    This defeats all caching and incrementality. Use only for debugging — never in CI pipelines as a workaround for cache issues.

### --no-build-cache

Disables the build cache for a single run without modifying `gradle.properties`. Tasks still benefit from up-to-date checks but won't read or write cache entries.

```bash
./gradlew assembleDebug --no-build-cache
```

| Flag | Up-to-date Checks | Build Cache |
|------|-------------------|-------------|
| _(default)_ | Yes | Yes |
| `--no-build-cache` | Yes | No |
| `--rerun-tasks` | No | No |

### --continue

By default, Gradle stops at the first task failure. `--continue` keeps executing independent tasks so you can see all failures at once.

```bash
./gradlew check --continue
```

### --offline

Prevents Gradle from making network requests. Builds succeed only if all dependencies are already cached locally. Useful on planes or for verifying that dependency resolution is fully cached.

```bash
./gradlew assembleDebug --offline
```

### Excluding Tasks (-x)

Skip specific tasks without modifying the build script:

```bash
# Build without running tests
./gradlew build -x test -x lint

# Assemble without linting
./gradlew assembleRelease -x lintRelease
```

### --parallel / --no-parallel

Override the `org.gradle.parallel` setting from `gradle.properties` for a single invocation:

```bash
# Force sequential execution (useful for debugging race conditions)
./gradlew assembleDebug --no-parallel

# Force parallel even if not in gradle.properties
./gradlew assembleDebug --parallel
```

---

## Debugging & Logging

### Log Levels

Gradle has four log levels, each showing progressively more detail:

| Flag | Level | What You See |
|------|-------|-------------|
| _(default)_ | `LIFECYCLE` | Task outcomes, build result |
| `-q` / `--quiet` | `QUIET` | Errors only |
| `--info` (`-i`) | `INFO` | Task skip reasons, up-to-date explanations, dependency resolution |
| `--debug` (`-d`) | `DEBUG` | Everything — extremely verbose |

```bash
# Why was a task not UP-TO-DATE?
./gradlew :app:compileDebugKotlin --info

# Full debug output (pipe to file — massive output)
./gradlew assembleDebug --debug 2>&1 | tee build-debug.log
```

!!! tip "Targeted debugging"
    `--info` is the sweet spot for most debugging. Use `--debug` only when `--info` doesn't show enough — it generates thousands of lines per task.

### Stack Traces

```bash
# Print stack trace for build failures
./gradlew assembleDebug --stacktrace

# Full stack trace including internal Gradle frames
./gradlew assembleDebug --full-stacktrace
```

### --warning-mode

Controls how Gradle displays deprecation warnings:

```bash
# Show all deprecation warnings with stack traces
./gradlew assembleDebug --warning-mode all

# Fail the build on deprecation warnings (useful in CI)
./gradlew assembleDebug --warning-mode fail
```

---

## Profiling & Build Scans

### --scan

Uploads build data to [scans.gradle.com](https://scans.gradle.com/) and generates a detailed report:

```bash
./gradlew assembleDebug --scan
```

A build scan shows per-task timing, cache hit/miss rates, critical path, dependency resolution, and configuration breakdown. The single best tool for diagnosing slow builds.

### --profile

Generates a local HTML report without uploading anything:

```bash
./gradlew assembleDebug --profile
# → build/reports/profile/profile-<timestamp>.html
```

### Measuring Configuration vs Execution

```bash
# Measure configuration time alone (help does nothing in execution)
./gradlew help --scan

# Compare with and without configuration cache
./gradlew assembleDebug --no-configuration-cache --scan
./gradlew assembleDebug --configuration-cache --scan
```

---

## Daemon Management

The Gradle daemon is a long-running JVM process that speeds up builds by keeping classes loaded.

```bash
# Check running daemons
./gradlew --status

# Stop all daemons (frees memory, resets state)
./gradlew --stop

# Run without the daemon (CI environments)
./gradlew assembleDebug --no-daemon

# Force a specific JVM heap size for this invocation
./gradlew assembleDebug -Dorg.gradle.jvmargs="-Xmx6g"
```

---

## Configuration Cache Flags

```bash
# Enable config cache for this run
./gradlew assembleDebug --configuration-cache

# Disable config cache for this run
./gradlew assembleDebug --no-configuration-cache

# Show problems as warnings instead of failing
./gradlew assembleDebug --configuration-cache-problems=warn
```

---

## Useful Combinations

=== "Debug a Failing Build"

    ```bash
    # See why it fails + full stack trace + skip unrelated tasks
    ./gradlew :app:assembleDebug --info --stacktrace --continue
    ```

=== "Verify Clean Build"

    ```bash
    # Full rebuild from scratch — no caching, no incremental
    ./gradlew clean assembleRelease --rerun-tasks --no-build-cache
    ```

=== "Audit Dependencies"

    ```bash
    # Show dependency tree + find version conflicts
    ./gradlew :app:dependencies --configuration=releaseRuntimeClasspath
    ./gradlew :app:dependencyInsight --dependency=kotlin-stdlib \
        --configuration=releaseRuntimeClasspath
    ```

=== "Profile Before Optimizing"

    ```bash
    # Get a baseline build scan
    ./gradlew clean && ./gradlew assembleDebug --scan
    # Enable optimizations and compare
    ./gradlew assembleDebug --scan --parallel --configuration-cache
    ```

---

## Passing Properties

```bash
# System property (accessible via System.getProperty)
./gradlew assembleDebug -Dmy.property=value

# Project property (accessible via project.findProperty)
./gradlew assembleDebug -Pmy.property=value

# Environment variable (accessible via System.getenv)
MY_PROPERTY=value ./gradlew assembleDebug
```

| Method | In build script | Precedence |
|--------|----------------|------------|
| `-D` (system property) | `System.getProperty("my.property")` | Highest |
| `-P` (project property) | `project.findProperty("my.property")` | Medium |
| `gradle.properties` | `project.findProperty("key")` | Lower |
| Environment variable | `System.getenv("MY_PROPERTY")` | Lowest |

---

??? question "Interview Questions"

    **Q: What does `--dry-run` do and when would you use it?**

    `--dry-run` (or `-m`) prints the full task execution graph in order without running any tasks. Use it to verify task dependencies when writing custom tasks, to understand what `assembleRelease` actually triggers, or to check if a task exclusion (`-x`) has the intended effect.

    **Q: What's the difference between `--rerun-tasks` and `--no-build-cache`?**

    `--no-build-cache` disables the build cache but still respects up-to-date checks — if inputs haven't changed locally, tasks are skipped. `--rerun-tasks` disables both the cache AND up-to-date checks, forcing every task to re-execute. Use `--rerun-tasks` only for debugging non-determinism.

    **Q: How would you diagnose a slow Gradle build?**

    Start with `./gradlew assembleDebug --scan` for a build scan showing per-task timing, cache hit rates, and the critical path. Use `./gradlew help --scan` to isolate configuration time. Use `--info` to see why specific tasks aren't UP-TO-DATE. Compare builds with and without `--parallel` and `--configuration-cache` to quantify impact.

    **Q: Why might you use `--offline` in CI?**

    To guarantee that no build depends on external network access during execution — all dependencies must be pre-cached. This catches cases where a developer added a dependency without running a resolution step first, and prevents build failures from transient repository outages.

    **Q: How do you pass configuration to a Gradle build from the command line?**

    Three ways: `-D` for system properties (highest precedence, accessed via `System.getProperty`), `-P` for project properties (accessed via `project.findProperty`), and environment variables (accessed via `System.getenv`). Project properties can also be set in `gradle.properties` but CLI flags override them.

!!! tip "Further Reading"
    - [Gradle CLI Reference](https://docs.gradle.org/current/userguide/command_line_interface.html)
    - [Build Scans](https://scans.gradle.com/)
    - [Troubleshooting Builds](https://docs.gradle.org/current/userguide/troubleshooting.html)
