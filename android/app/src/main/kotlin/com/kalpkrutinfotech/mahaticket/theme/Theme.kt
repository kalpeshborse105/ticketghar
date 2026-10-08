package com.kalpkrutinfotech.mahaticket.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val MahaTicketColorScheme = lightColorScheme(
    primary = MahaOrange,
    onPrimary = Color.White,
    primaryContainer = MahaWarm,
    onPrimaryContainer = MahaOrangeDeep,
    secondary = MahaOrangeLight,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFFFEDD5),
    onSecondaryContainer = MahaOrangeDeep,
    tertiary = WarningAmber,
    onTertiary = Color.White,
    background = MahaBg,
    onBackground = TextPrimary,
    surface = MahaSurface,
    onSurface = TextPrimary,
    surfaceVariant = MahaSurfaceVariant,
    onSurfaceVariant = TextSecondary,
    outline = MahaBorder,
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
        colorScheme = MahaTicketColorScheme,
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
