package com.ergdashboard.android.ui.vitals

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.ergdashboard.android.ErgDashboardApplication
import com.ergdashboard.android.domain.Vital
import com.ergdashboard.android.domain.VitalRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class VitalsUiState(
    val vitals: List<Vital> = emptyList(),
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
)

class VitalsViewModel(private val vitalRepo: VitalRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(VitalsUiState())
    val uiState: StateFlow<VitalsUiState> = _uiState.asStateFlow()

    init {
        loadVitals()
    }

    fun retry() {
        _uiState.value = VitalsUiState()
        loadVitals()
    }

    private fun loadVitals() {
        viewModelScope.launch {
            try {
                val vitals = vitalRepo.getVitals()
                _uiState.value = VitalsUiState(vitals, false)
            } catch (e: Exception) {
                _uiState.value = VitalsUiState(emptyList(), false, e.message)
            }
        }
    }

    companion object {
        val Factory = viewModelFactory {
            initializer {
                val app = this[APPLICATION_KEY] as ErgDashboardApplication
                VitalsViewModel(app.container.vitalRepository)
            }
        }
    }
}
