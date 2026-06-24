package com.ergdashboard.android.domain

data class Vital(
    val date: String,
    val rhr: Int,
    val hrv: Int,
    val sleepHours: Double,
    val weightKg: Double,
)
