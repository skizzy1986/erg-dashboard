package com.ergdashboard.android.data.dto

import com.ergdashboard.android.domain.Session
import com.ergdashboard.android.domain.SessionType
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlin.math.roundToInt

@Serializable
data class SessionDto(
    val date: String,
    val type: String,
    val label: String,
    val duration: String,
    val srpe: Int,
    @SerialName("avg_watts") val avgWatts: Int? = null,
    @SerialName("avg_hr") val avgHr: Int? = null,
    @SerialName("distance_m") val distanceM: Int? = null,
    val status: String,
) {
    fun toDomain(): Session? {
        if (status == "planned") return null
        val sessionType = when (type.lowercase()) {
            "erg" -> SessionType.ERG
            "strength" -> SessionType.STRENGTH
            "cycling" -> SessionType.CYCLING
            "rest" -> SessionType.REST
            else -> SessionType.REST
        }
        val durationMin = parseToMinutes(duration)
        val tss = ((durationMin / 60.0) * srpe * 10).roundToInt()
        return Session(
            date = date,
            type = sessionType,
            label = label,
            durationMin = durationMin,
            srpe = srpe,
            tss = tss,
        )
    }

    private fun parseToMinutes(duration: String): Int {
        val parts = duration.split(":")
        return when (parts.size) {
            3 -> {
                val hours = parts[0].toIntOrNull() ?: 0
                val minutes = parts[1].toIntOrNull() ?: 0
                hours * 60 + minutes
            }
            2 -> parts[0].toIntOrNull() ?: 0
            else -> duration.toIntOrNull() ?: 0
        }
    }
}
