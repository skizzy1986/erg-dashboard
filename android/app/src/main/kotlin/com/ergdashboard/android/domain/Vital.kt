package com.ergdashboard.android.domain

data class Vital(
    val date: String,
    val rhr: Int,
    val hrv: Int,
    val sleepHours: Double,
    val weightKg: Double,
) {
    companion object {
        val STUB = listOf(
            Vital("2026-06-24", 47, 72, 7.8, 78.2),
            Vital("2026-06-23", 49, 68, 7.5, 78.4),
            Vital("2026-06-22", 51, 61, 6.9, 78.6),
            Vital("2026-06-21", 48, 74, 8.1, 78.3),
            Vital("2026-06-20", 46, 78, 8.2, 78.1),
            Vital("2026-06-19", 50, 65, 7.2, 78.5),
            Vital("2026-06-18", 52, 59, 6.8, 78.7),
            Vital("2026-06-17", 53, 55, 6.5, 78.8),
            Vital("2026-06-16", 49, 69, 7.6, 78.4),
            Vital("2026-06-15", 47, 73, 8.0, 78.2),
        )
    }
}
