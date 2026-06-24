package com.ergdashboard.android.data.dto

import com.ergdashboard.android.domain.Vital
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class VitalDto(
    val date: String,
    @SerialName("rhr_bpm") val rhrBpm: Int? = null,
    @SerialName("hrv_ms") val hrvMs: Int? = null,
    @SerialName("sleep_hours") val sleepHours: Double? = null,
    @SerialName("bodyweight_kg") val bodyweightKg: Double? = null,
) {
    fun toDomain(): Vital = Vital(
        date = date,
        rhr = rhrBpm ?: 0,
        hrv = hrvMs ?: 0,
        sleepHours = sleepHours ?: 0.0,
        weightKg = bodyweightKg ?: 0.0,
    )
}
