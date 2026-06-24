package com.ergdashboard.android.ui.sessions

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
import androidx.compose.material3.Surface
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
import com.ergdashboard.android.domain.Session
import com.ergdashboard.android.domain.SessionType

@Composable
fun SessionsScreen(viewModel: SessionsViewModel = viewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    Column(modifier = Modifier.fillMaxSize()) {
        Text(
            text = "SESSIONS",
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
            items(state.sessions) { session ->
                SessionCard(session)
            }
        }
    }
}

@Composable
private fun SessionCard(session: Session) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        session.date.substring(5).replace("-", "/"),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    TypeBadge(session.type)
                }
                if (session.label.isNotEmpty()) {
                    Text(
                        session.label,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(top = 2.dp),
                    )
                }
            }
            if (session.durationMin > 0) {
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        "${session.durationMin} min",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        "sRPE ${session.srpe}",
                        style = MaterialTheme.typography.labelSmall,
                        color = srpeColor(session.srpe),
                    )
                }
            }
        }
    }
}

@Composable
private fun TypeBadge(type: SessionType) {
    val (bg, fg) = when (type) {
        SessionType.ERG -> Color(0xFF004E63) to Color(0xFF00D4FF)
        SessionType.STRENGTH -> Color(0xFF3D2000) to Color(0xFFFF6B35)
        SessionType.CYCLING -> Color(0xFF1A3000) to Color(0xFF7CFC00)
        SessionType.REST -> Color(0xFF1E1E2E) to Color(0xFF9898AA)
    }
    Surface(color = bg, shape = MaterialTheme.shapes.small) {
        Text(
            type.shortLabel,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
            style = MaterialTheme.typography.labelSmall,
            color = fg,
        )
    }
}

private fun srpeColor(srpe: Int): Color = when {
    srpe <= 3 -> Color(0xFF34D399)
    srpe <= 6 -> Color(0xFFFFD700)
    srpe <= 8 -> Color(0xFFFF6B35)
    else -> Color(0xFFFF2D55)
}
