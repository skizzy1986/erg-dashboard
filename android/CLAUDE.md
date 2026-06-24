# Android — Project Intelligence

## Constraints (enforced, not optional)

| Rule | Detail |
|---|---|
| **Kotlin only** | No Java files anywhere in `android/` |
| **Compose only** | No XML layouts, no View-system widgets |
| **KSP, not kapt** | All annotation processors via `alias(libs.plugins.ksp)` |
| **StateFlow, not LiveData** | ViewModels expose `StateFlow`; no `MutableLiveData` |
| **Version catalog** | Every dependency via `libs.versions.toml` — no hardcoded version strings in `build.gradle.kts` |

## Architecture (NiA-style, without NiA's full scaffolding)

```
:app
  ui/          Compose screens and navigation
  domain/      UseCases — pure Kotlin, no Android deps
  data/        Repositories — supabase-kt calls, mapping to domain models
```

- **UseCase**: pure Kotlin class, no Android imports, injected into ViewModel
- **Repository**: interface in domain, implementation in data
- **ViewModel**: holds `StateFlow<UiState>`, calls UseCases
- **Screen**: `@Composable` function, observes ViewModel via `collectAsStateWithLifecycle`

## Key decisions

- **No Kotlin Multiplatform** — CTL/ATL/TSB written twice (JS + Kotlin), both validated against `test-fixtures/training-load/fixtures.json` at repo root
- **No `build-logic/` convention plugins** yet — add when there are 3+ Gradle modules
- **Supabase client**: `supabase-kt` v3.5.x (`io.github.jan-tennant.supabase`), Ktor Android engine
- **Min SDK 26**, compile/target SDK 35
- **Java 21** (both `compileOptions` and `jvmTarget`)

## Tech stack

| Layer | Library |
|---|---|
| UI | Jetpack Compose + Material 3 |
| Navigation | `androidx.navigation:navigation-compose` |
| ViewModel | `androidx.lifecycle:lifecycle-viewmodel-compose` |
| Database | supabase-kt `postgrest-kt` |
| Auth | supabase-kt `auth-kt` |
| HTTP | Ktor Android engine |
| Unit tests | JUnit 4 (JVM, no emulator needed) |

## Key commands

```bash
# From android/ directory
./gradlew :app:assembleDebug          # build APK
./gradlew :app:testDebugUnitTest      # run JVM unit tests (no emulator)
./gradlew :app:lint                   # lint check
```

## Shared fixture contract

JUnit tests for `GetTrainingLoadUseCase` must validate against
`../test-fixtures/training-load/fixtures.json` (relative to repo root).
Read the file, deserialise each scenario, run the use case, assert
every output row matches `expected` exactly — same contract as the
Vitest suite.
