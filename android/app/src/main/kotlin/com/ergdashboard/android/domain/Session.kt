package com.ergdashboard.android.domain

enum class SessionType(val label: String, val shortLabel: String) {
    ERG("Erg", "ERG"),
    STRENGTH("Strength", "STR"),
    CYCLING("Cycling", "CYC"),
    REST("Rest", "REST"),
}

data class Session(
    val date: String,
    val type: SessionType,
    val label: String,
    val durationMin: Int,
    val srpe: Int,
    val tss: Int = 0,
) {
    companion object {
        val STUB = listOf(
            Session("2026-06-24", SessionType.ERG, "2k intervals", 60, 7, 95),
            Session("2026-06-22", SessionType.STRENGTH, "Deadlift + squat", 50, 6, 65),
            Session("2026-06-20", SessionType.CYCLING, "Z2 recovery ride", 75, 4, 55),
            Session("2026-06-18", SessionType.ERG, "UT2 steady state", 45, 8, 80),
            Session("2026-06-16", SessionType.STRENGTH, "Power clean + row", 55, 7, 70),
            Session("2026-06-14", SessionType.ERG, "L1 distance", 90, 5, 75),
            Session("2026-06-12", SessionType.REST, "", 0, 0, 0),
            Session("2026-06-11", SessionType.ERG, "Race pace 6×500m", 60, 9, 110),
            Session("2026-06-09", SessionType.CYCLING, "Z2 long ride", 90, 5, 65),
            Session("2026-06-07", SessionType.STRENGTH, "Full body", 45, 6, 60),
        )
    }
}
