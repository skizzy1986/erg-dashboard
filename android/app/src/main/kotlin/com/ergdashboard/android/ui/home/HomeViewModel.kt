package com.ergdashboard.android.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.ergdashboard.android.ErgDashboardApplication
import com.ergdashboard.android.domain.GetTrainingLoadUseCase
import com.ergdashboard.android.domain.Session
import com.ergdashboard.android.domain.SessionRepository
import com.ergdashboard.android.domain.TssInput
import com.ergdashboard.android.domain.TrainingLoadEntry
import com.ergdashboard.android.domain.Vital
import com.ergdashboard.android.domain.VitalRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class HomeUiState(
    val latestLoad: TrainingLoadEntry? = null,
    val recentSessions: List<Session> = emptyList(),
    val latestVital: Vital? = null,
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
)

class HomeViewModel(
    private val sessionRepo: SessionRepository,
    private val vitalRepo: VitalRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    fun retry() {
        loadData()
    }

    private fun loadData() {
        _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
        viewModelScope.launch {
            try {
                val sessionsDeferred = async { sessionRepo.getSessions() }
                val vitalsDeferred = async { vitalRepo.getVitals() }
                val sessions = sessionsDeferred.await()
                val vitals = vitalsDeferred.await()

                val tssInputs = sessions.map { TssInput(it.date, it.tss, it.label) }
                val entries = if (tssInputs.isNotEmpty()) {
                    GetTrainingLoadUseCase()(tssInputs)
                } else {
                    emptyList()
                }

                _uiState.value = HomeUiState(
                    latestLoad = entries.lastOrNull(),
                    recentSessions = sessions.take(3),
                    latestVital = vitals.firstOrNull(),
                    isLoading = false,
                    errorMessage = null,
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = e.message,
                )
            }
        }
    }

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val app = this[APPLICATION_KEY] as ErgDashboardApplication
                HomeViewModel(
                    sessionRepo = app.container.sessionRepository,
                    vitalRepo = app.container.vitalRepository,
                )
            }
        }
    }
}
