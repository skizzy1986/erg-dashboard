package com.ergdashboard.android.data.dto

import com.ergdashboard.android.domain.Session
import com.ergdashboard.android.domain.SessionType
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import kotlin.math.roundToInt

private val SHORT_DATE_FMT = DateTimeFormatter.ofPattern("M/d/yy")

@Serializable
data class SessionDto(
    val date: String,
    val type: String,
    val label: String,
    val duration: String? = null,
    val srpe: Int? = null,
    @SerialName("avg_watts") val avgWatts: Int? = null,
    @SerialName("avg_hr") val avgHr: Int? = null,
    @SerialName("distance_m") val distanceM: Int? = null,
    val status: String? = null,
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
        val effectiveSrpe = srpe ?: 0
        val tss = ((durationMin / 60.0) * effectiveSrpe * 10).roundToInt()
        return Session(
            date = toIsoDate(date),
            type = sessionType,
            label = label,
            durationMin = durationMin,
            srpe = effectiveSrpe,
            tss = tss,
        )
    }

    private fun parseToMinutes(duration: String?): Int {
        if (duration == null) return 0
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

private fun toIsoDate(date: String): String {
    return try {
        LocalDate.parse(date).toString()
    } catch (_: Exception) {
        try {
            LocalDate.parse(date, SHORT_DATE_FMT).toString()
        } catch (_: Exception) {
            date
        }
    }
}
