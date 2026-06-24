package com.ergdashboard.android.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF00D4FF),
    onPrimary = Color(0xFF003744),
    primaryContainer = Color(0xFF004E63),
    onPrimaryContainer = Color(0xFF9DEFFB),
    secondary = Color(0xFFFF6B35),
    onSecondary = Color(0xFF4A1A00),
    background = Color(0xFF0A0A0F),
    onBackground = Color(0xFFE2E2E8),
    surface = Color(0xFF16161E),
    onSurface = Color(0xFFE2E2E8),
    surfaceVariant = Color(0xFF1E1E2E),
    onSurfaceVariant = Color(0xFF9898AA),
    outline = Color(0xFF2A2A3A),
    error = Color(0xFFFF2D55),
    onError = Color(0xFF5C0018),
)

@Composable
fun AppTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content,
    )
}
