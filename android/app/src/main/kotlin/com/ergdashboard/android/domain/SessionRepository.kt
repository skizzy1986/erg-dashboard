package com.ergdashboard.android.domain

interface SessionRepository {
    suspend fun getSessions(): List<Session>
}
