package com.ergdashboard.android.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.ergdashboard.android.ErgDashboardApplication
import com.ergdashboard.android.domain.GetTrainingLoadUseCase
import com.ergdashboard.android.domain.SessionRepository
import com.ergdashboard.android.domain.TrainingLoadEntry
import com.ergdashboard.android.domain.TssInput
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class DashboardUiState(
    val entries: List<TrainingLoadEntry> = emptyList(),
    val latest: TrainingLoadEntry? = null,
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
)

class DashboardViewModel(
    private val sessionRepo: SessionRepository,
) : ViewModel() {

    private val useCase = GetTrainingLoadUseCase()

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

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
                val sessions = sessionRepo.getSessions()
                val tssInputs = sessions.map { TssInput(it.date, it.tss, it.label) }
                val entries = if (tssInputs.isNotEmpty()) useCase(tssInputs) else emptyList()
                _uiState.value = DashboardUiState(
                    entries = entries,
                    latest = entries.lastOrNull(),
                    isLoading = false,
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
                DashboardViewModel(sessionRepo = app.container.sessionRepository)
            }
        }
    }
}
