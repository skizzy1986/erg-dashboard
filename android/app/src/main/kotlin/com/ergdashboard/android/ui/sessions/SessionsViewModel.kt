package com.ergdashboard.android.ui.sessions

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.ergdashboard.android.ErgDashboardApplication
import com.ergdashboard.android.domain.Session
import com.ergdashboard.android.domain.SessionRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class SessionsUiState(
    val sessions: List<Session> = emptyList(),
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
)

class SessionsViewModel(private val sessionRepo: SessionRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(SessionsUiState())
    val uiState: StateFlow<SessionsUiState> = _uiState.asStateFlow()

    init {
        loadSessions()
    }

    fun retry() {
        _uiState.value = SessionsUiState()
        loadSessions()
    }

    private fun loadSessions() {
        viewModelScope.launch {
            try {
                val sessions = sessionRepo.getSessions()
                _uiState.value = SessionsUiState(sessions, false)
            } catch (e: Exception) {
                _uiState.value = SessionsUiState(emptyList(), false, e.message)
            }
        }
    }

    companion object {
        val Factory = viewModelFactory {
            initializer {
                val app = this[APPLICATION_KEY] as ErgDashboardApplication
                SessionsViewModel(app.container.sessionRepository)
            }
        }
    }
}
