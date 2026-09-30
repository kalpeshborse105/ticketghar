package `in`.ticketghar.mahaticket.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = MahaOrange,
    onPrimary = Color.White,
    primaryContainer = MahaOrangeDark,
    background = MahaDarkBackground,
    surface = MahaSurface,
    surfaceVariant = MahaSurfaceElevated,
    onBackground = MahaTextPrimary,
    onSurface = MahaTextPrimary,
    outline = MahaBorder
)

@Composable
fun MahaTicketTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}
