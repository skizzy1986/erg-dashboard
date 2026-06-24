package com.ergdashboard.android.data

import com.ergdashboard.android.data.dto.SessionDto
import com.ergdashboard.android.domain.Session
import com.ergdashboard.android.domain.SessionRepository
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order

class SessionRepositoryImpl(private val supabase: SupabaseClient) : SessionRepository {
    override suspend fun getSessions(): List<Session> {
        return supabase.from("sessions")
            .select {
                order("date", Order.DESCENDING)
            }
            .decodeList<SessionDto>()
            .mapNotNull { it.toDomain() }
    }
}
