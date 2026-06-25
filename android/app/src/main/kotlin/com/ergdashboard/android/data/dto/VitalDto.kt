package com.ergdashboard.android.data.dto

import com.ergdashboard.android.domain.Vital
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class VitalDto(
    val date: String,
    @SerialName("rhr_bpm") val rhrBpm: Int,
    @SerialName("hrv_ms") val hrvMs: Int,
    @SerialName("sleep_hours") val sleepHours: Double,
    @SerialName("bodyweight_kg") val bodyweightKg: Double,
) {
    fun toDomain(): Vital = Vital(
        date = date,
        rhr = rhrBpm,
        hrv = hrvMs,
        sleepHours = sleepHours,
        weightKg = bodyweightKg,
    )
}
