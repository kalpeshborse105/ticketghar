package com.kalpkrutinfotech.mahaticket.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForwardIos
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kalpkrutinfotech.mahaticket.BuildConfig
import com.kalpkrutinfotech.mahaticket.theme.*

@Composable
fun ProfileScreen(
    onNavigateToLogin: () -> Unit = {},
    onNavigateToTickets: () -> Unit = {}
) {
    val context = LocalContext.current
    var isLoggedIn by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Profile Header Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = androidx.compose.foundation.BorderStroke(1.dp, MahaBorder),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primaryContainer),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Person,
                            contentDescription = null,
                            modifier = Modifier.size(40.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = if (isLoggedIn) "महाटिकिट सदस्य" else "अतिथी वापरकर्ता (Guest)",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    Text(
                        text = if (isLoggedIn) "+91 98765 43210" else "लॉगिन करून तिकिटे सुरक्षित ठेवा",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    if (!isLoggedIn) {
                        Button(
                            onClick = onNavigateToLogin,
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.Login, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("लॉगिन करा / Sign In", fontWeight = FontWeight.SemiBold)
                        }
                    } else {
                        OutlinedButton(
                            onClick = { isLoggedIn = false },
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("लॉगआउट (Sign Out)", color = MaterialTheme.colorScheme.error)
                        }
                    }
                }
            }
        }

        // Quick Actions
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = androidx.compose.foundation.BorderStroke(1.dp, MahaBorder)
            ) {
                Column {
                    ProfileMenuItem(
                        icon = Icons.Default.ConfirmationNumber,
                        title = "माझी तिकिटे (My Tickets)",
                        subtitle = "बुक केलेली सर्व तिकिटे पहा",
                        onClick = onNavigateToTickets
                    )
                    HorizontalDivider(color = MahaBorder, thickness = 0.5.dp)
                    ProfileMenuItem(
                        icon = Icons.Default.Language,
                        title = "अ‍ॅप भाषा (App Language)",
                        subtitle = "मराठी (प्राथमिक)",
                        onClick = {}
                    )
                    HorizontalDivider(color = MahaBorder, thickness = 0.5.dp)
                    ProfileMenuItem(
                        icon = Icons.Default.Notifications,
                        title = "सूचना (Notifications)",
                        subtitle = "नवीन कार्यक्रम आणि बुकिंग अपडेट्स",
                        onClick = {}
                    )
                }
            }
        }

        // Legal & Support
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = androidx.compose.foundation.BorderStroke(1.dp, MahaBorder)
            ) {
                Column {
                    ProfileMenuItem(
                        icon = Icons.Default.HelpOutline,
                        title = "मदत आणि सपोर्ट (Help & Support)",
                        subtitle = "आमच्याशी संपर्क साधा",
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("${BuildConfig.API_BASE_URL}/contact"))
                            context.startActivity(intent)
                        }
                    )
                    HorizontalDivider(color = MahaBorder, thickness = 0.5.dp)
                    ProfileMenuItem(
                        icon = Icons.Default.Description,
                        title = "नियम व अटी (Terms of Service)",
                        subtitle = "MahaTicket बुकिंग नियम",
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("${BuildConfig.API_BASE_URL}/terms"))
                            context.startActivity(intent)
                        }
                    )
                    HorizontalDivider(color = MahaBorder, thickness = 0.5.dp)
                    ProfileMenuItem(
                        icon = Icons.Default.PrivacyTip,
                        title = "गोपनीयता धोरण (Privacy Policy)",
                        subtitle = "तुमचा डेटा कसा सुरक्षित राहतो",
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("${BuildConfig.API_BASE_URL}/privacy"))
                            context.startActivity(intent)
                        }
                    )
                }
            }
        }

        // App Version & Footer
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "${BuildConfig.APP_NAME_MR} (${BuildConfig.APP_NAME})",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = "आवृत्ती ${BuildConfig.VERSION_NAME} • Made for Maharashtra",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                )
            }
        }
    }
}

@Composable
fun ProfileMenuItem(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Icon(
            Icons.AutoMirrored.Filled.ArrowForwardIos,
            contentDescription = null,
            tint = MahaTextSecondary,
            modifier = Modifier.size(14.dp)
        )
    }
}
