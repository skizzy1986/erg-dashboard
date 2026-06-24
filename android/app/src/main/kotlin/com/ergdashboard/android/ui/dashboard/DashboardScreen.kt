package com.ergdashboard.android.ui.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun DashboardScreen(viewModel: DashboardViewModel = viewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "Training Load",
            style = MaterialTheme.typography.headlineMedium,
        )

        Spacer(modifier = Modifier.height(24.dp))

        val latest = uiState.latest
        if (latest != null) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                MetricCard(label = "CTL", value = latest.ctl, color = Color(0xFF00D4FF))
                MetricCard(label = "ATL", value = latest.atl, color = Color(0xFFFF6B35))
                MetricCard(label = "TSB", value = latest.tsb, color = tsbColor(latest.tsb))
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "as of ${latest.date}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun MetricCard(label: String, value: Double, color: Color) {
    Card {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium,
                color = color,
            )
            Text(
                text = "%.1f".format(value),
                style = MaterialTheme.typography.headlineSmall,
            )
        }
    }
}

private fun tsbColor(tsb: Double): Color = when {
    tsb > 10 -> Color(0xFF34D399)
    tsb > -10 -> Color(0xFFFFD700)
    tsb > -30 -> Color(0xFFFF6B35)
    else -> Color(0xFFFF2D55)
}
