package `in`.ticketghar.mahaticket.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColorScheme = lightColorScheme(
    primary = MahaPrimaryLight,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFEEF2FF), // Indigo-50
    onPrimaryContainer = MahaPrimaryDark,
    secondary = MahaSecondary,
    onSecondary = Color.White,
    background = MahaBackground,
    onBackground = MahaTextPrimary,
    surface = MahaSurface,
    onSurface = MahaTextPrimary,
    surfaceVariant = MahaSurfaceVariant,
    onSurfaceVariant = MahaTextSecondary,
    outline = MahaBorder,
    error = MahaError,
    onError = Color.White
)

@Composable
fun MahaTicketTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    // Force light theme - premium light design
    MaterialTheme(
        colorScheme = LightColorScheme,
        content = content
    )
}
