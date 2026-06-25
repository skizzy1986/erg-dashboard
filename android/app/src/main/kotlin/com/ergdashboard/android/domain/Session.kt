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
)
