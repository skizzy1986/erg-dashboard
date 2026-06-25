package com.ergdashboard.android.data

import com.ergdashboard.android.data.dto.VitalDto
import com.ergdashboard.android.domain.Vital
import com.ergdashboard.android.domain.VitalRepository
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order

class VitalRepositoryImpl(private val supabase: SupabaseClient) : VitalRepository {
    override suspend fun getVitals(): List<Vital> {
        return supabase.from("vitals")
            .select {
                order("date", Order.DESCENDING)
            }
            .decodeList<VitalDto>()
            .map { it.toDomain() }
    }
}
