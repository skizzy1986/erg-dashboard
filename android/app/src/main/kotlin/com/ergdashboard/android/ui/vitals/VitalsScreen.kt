package com.ergdashboard.android.ui.vitals

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.ergdashboard.android.domain.Vital

@Composable
fun VitalsScreen(viewModel: VitalsViewModel = viewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    Column(modifier = Modifier.fillMaxSize()) {
        Text(
            text = "VITALS",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
        )
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
        ) {
            items(state.vitals) { vital ->
                VitalCard(vital)
            }
        }
    }
}

@Composable
private fun VitalCard(vital: Vital) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                vital.date.substring(5).replace("-", "/"),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(end = 4.dp),
            )
            VitalMetric("RHR", "${vital.rhr}", "bpm", rhrColor(vital.rhr))
            VitalMetric("HRV", "${vital.hrv}", "ms", hrvColor(vital.hrv))
            VitalMetric("Sleep", "${"%.1f".format(vital.sleepHours)}", "h", sleepColor(vital.sleepHours))
            VitalMetric("Wt", "${"%.1f".format(vital.weightKg)}", "kg", MaterialTheme.colorScheme.onSurface)
        }
    }
}

@Composable
private fun VitalMetric(label: String, value: String, unit: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(1.dp)) {
            Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = color)
            Text(unit, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

private fun rhrColor(rhr: Int): Color = when {
    rhr < 48 -> Color(0xFF34D399)
    rhr < 55 -> Color(0xFFFFD700)
    else -> Color(0xFFFF6B35)
}

private fun hrvColor(hrv: Int): Color = when {
    hrv >= 70 -> Color(0xFF34D399)
    hrv >= 55 -> Color(0xFFFFD700)
    else -> Color(0xFFFF6B35)
}

private fun sleepColor(hours: Double): Color = when {
    hours >= 7.5 -> Color(0xFF34D399)
    hours >= 6.5 -> Color(0xFFFFD700)
    else -> Color(0xFFFF6B35)
}
