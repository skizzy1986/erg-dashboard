package com.ergdashboard.android.data

import android.content.Context
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.postgrest.Postgrest
import com.ergdashboard.android.BuildConfig
import com.ergdashboard.android.domain.SessionRepository
import com.ergdashboard.android.domain.VitalRepository

class AppContainer(context: Context) {
    val supabase = createSupabaseClient(BuildConfig.SUPABASE_URL, BuildConfig.SUPABASE_ANON_KEY) {
        install(Auth)
        install(Postgrest)
    }

    val sessionRepository: SessionRepository by lazy {
        SessionRepositoryImpl(supabase)
    }

    val vitalRepository: VitalRepository by lazy {
        VitalRepositoryImpl(supabase)
    }
}
