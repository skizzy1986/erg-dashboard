package com.ergdashboard.android.domain

interface VitalRepository {
    suspend fun getVitals(): List<Vital>
}
