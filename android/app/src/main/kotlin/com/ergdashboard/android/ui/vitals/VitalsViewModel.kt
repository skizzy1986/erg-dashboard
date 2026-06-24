package com.ergdashboard.android.ui.vitals

import androidx.lifecycle.ViewModel
import com.ergdashboard.android.domain.Vital
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class VitalsUiState(val vitals: List<Vital> = emptyList())

class VitalsViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(VitalsUiState(vitals = Vital.STUB))
    val uiState: StateFlow<VitalsUiState> = _uiState.asStateFlow()
}
