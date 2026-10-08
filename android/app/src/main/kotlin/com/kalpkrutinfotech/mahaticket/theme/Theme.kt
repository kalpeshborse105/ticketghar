package com.kalpkrutinfotech.mahaticket.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val TicketGharColorScheme = darkColorScheme(
    primary = GoldAccent,
    onPrimary = Color(0xFF1E1402),
    primaryContainer = TheatricalCrimson,
    onPrimaryContainer = Color.White,
    secondary = TheatricalCrimsonLight,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFF3B1020),
    onSecondaryContainer = Color(0xFFFFD9E2),
    tertiary = GoldBright,
    onTertiary = Color.Black,
    background = CinemaBg,
    onBackground = TextPrimary,
    surface = CinemaSurface,
    onSurface = TextPrimary,
    surfaceVariant = CinemaSurfaceVariant,
    onSurfaceVariant = TextSecondary,
    outline = CinemaBorder,
    error = ErrorRose,
    onError = Color.White
)

@Composable
fun MahaTicketTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = TicketGharColorScheme,
        typography = Typography,
        content = content
    )
}

@Composable
fun MyApplicationTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    MahaTicketTheme(darkTheme = darkTheme, dynamicColor = dynamicColor, content = content)
}
