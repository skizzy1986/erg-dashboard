package com.ergdashboard.android.ui.sessions

import androidx.lifecycle.ViewModel
import com.ergdashboard.android.domain.Session
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class SessionsUiState(val sessions: List<Session> = emptyList())

class SessionsViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(SessionsUiState(sessions = Session.STUB))
    val uiState: StateFlow<SessionsUiState> = _uiState.asStateFlow()
}
