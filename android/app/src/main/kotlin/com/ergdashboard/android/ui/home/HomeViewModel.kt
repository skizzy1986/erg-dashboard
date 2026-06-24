package com.ergdashboard.android.ui.home

import androidx.lifecycle.ViewModel
import com.ergdashboard.android.domain.GetTrainingLoadUseCase
import com.ergdashboard.android.domain.Session
import com.ergdashboard.android.domain.TssInput
import com.ergdashboard.android.domain.TrainingLoadEntry
import com.ergdashboard.android.domain.Vital
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class HomeUiState(
    val latestLoad: TrainingLoadEntry? = null,
    val recentSessions: List<Session> = emptyList(),
    val latestVital: Vital? = null,
)

class HomeViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        val entries = GetTrainingLoadUseCase()(STUB_TSS)
        _uiState.value = HomeUiState(
            latestLoad = entries.lastOrNull(),
            recentSessions = Session.STUB.take(3),
            latestVital = Vital.STUB.firstOrNull(),
        )
    }

    companion object {
        private val STUB_TSS = listOf(
            TssInput("2026-05-25", 80, ""), TssInput("2026-05-27", 100, ""),
            TssInput("2026-05-29", 60, ""), TssInput("2026-06-01", 90, ""),
            TssInput("2026-06-03", 110, ""), TssInput("2026-06-05", 70, ""),
            TssInput("2026-06-08", 85, ""), TssInput("2026-06-10", 95, ""),
            TssInput("2026-06-12", 75, ""), TssInput("2026-06-13", 80, ""),
            TssInput("2026-06-16", 95, ""), TssInput("2026-06-18", 85, ""),
            TssInput("2026-06-20", 65, ""), TssInput("2026-06-22", 80, ""),
            TssInput("2026-06-24", 90, ""),
        )
    }
}
