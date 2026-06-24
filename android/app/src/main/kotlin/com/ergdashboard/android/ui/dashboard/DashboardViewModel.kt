package com.ergdashboard.android.ui.dashboard

import androidx.lifecycle.ViewModel
import com.ergdashboard.android.domain.GetTrainingLoadUseCase
import com.ergdashboard.android.domain.TrainingLoadEntry
import com.ergdashboard.android.domain.TssInput
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class DashboardUiState(
    val entries: List<TrainingLoadEntry> = emptyList(),
    val latest: TrainingLoadEntry? = null,
)

class DashboardViewModel : ViewModel() {

    private val useCase = GetTrainingLoadUseCase()

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        val entries = useCase(STUB_TSS_DATA)
        _uiState.value = DashboardUiState(entries = entries, latest = entries.lastOrNull())
    }

    companion object {
        // Stub data — will be replaced by a Repository/Supabase source in a later step.
        private val STUB_TSS_DATA = listOf(
            TssInput("2026-05-25", tss = 80, note = ""),
            TssInput("2026-05-27", tss = 100, note = ""),
            TssInput("2026-05-29", tss = 60, note = ""),
            TssInput("2026-06-01", tss = 90, note = ""),
            TssInput("2026-06-03", tss = 110, note = ""),
            TssInput("2026-06-05", tss = 70, note = ""),
            TssInput("2026-06-08", tss = 85, note = ""),
            TssInput("2026-06-10", tss = 95, note = ""),
            TssInput("2026-06-12", tss = 75, note = ""),
            TssInput("2026-06-13", tss = 80, note = ""),
        )
    }
}
