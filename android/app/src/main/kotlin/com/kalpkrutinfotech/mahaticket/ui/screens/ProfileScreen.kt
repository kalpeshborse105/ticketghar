package com.kalpkrutinfotech.mahaticket.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.ui.graphics.Color
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
        // 1. Profile Header Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, Color(0xFFE5E7EB)),
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
                            .background(Color(0xFFFFF7ED))
                            .border(2.dp, Color(0xFFFED7AA), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Person,
                            contentDescription = null,
                            modifier = Modifier.size(42.dp),
                            tint = Color(0xFFEA580C)
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = if (isLoggedIn) "महाटिकिट सदस्य" else "महाटिकिट वापरकर्ता (Guest)",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    Text(
                        text = if (isLoggedIn) "+91 98765 43210" else "आपली सर्व तिकिटे आपल्या फोनवर सुरक्षित आहेत",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    if (!isLoggedIn) {
                        Button(
                            onClick = onNavigateToLogin,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEA580C)),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.Login, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("लॉगिन करा / Sign In", fontWeight = FontWeight.Bold)
                        }
                    } else {
                        OutlinedButton(
                            onClick = { isLoggedIn = false },
                            shape = RoundedCornerShape(10.dp),
                            border = BorderStroke(1.dp, Color(0xFFEF4444)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("लॉगआउट करा (Sign Out)", color = Color(0xFFEF4444), fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // 2. Main Account & Booking Actions
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, Color(0xFFE5E7EB))
            ) {
                Column {
                    ModernProfileMenuItem(
                        icon = Icons.Default.ConfirmationNumber,
                        title = "माझी तिकिटे (My Tickets)",
                        subtitle = "बुक केलेली सर्व तिकिटे व ई-पास पहा",
                        onClick = onNavigateToTickets
                    )
                    HorizontalDivider(color = Color(0xFFF3F4F6), thickness = 1.dp)
                    ModernProfileMenuItem(
                        icon = Icons.Default.Translate,
                        title = "अ‍ॅप भाषा (App Language)",
                        subtitle = "मराठी (प्राथमिक भाषा)",
                        onClick = {}
                    )
                    HorizontalDivider(color = Color(0xFFF3F4F6), thickness = 1.dp)
                    ModernProfileMenuItem(
                        icon = Icons.Default.Notifications,
                        title = "सूचना (Notifications)",
                        subtitle = "नवीन कार्यक्रम, ऑफर आणि शो स्मरणपत्रे",
                        onClick = {}
                    )
                }
            }
        }

        // 3. Organizer Partnership
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, Color(0xFFFED7AA))
            ) {
                ModernProfileMenuItem(
                    icon = Icons.Default.Business,
                    title = "नाट्य व कार्यक्रम आयोजक (Partner With Us)",
                    subtitle = "आपला कार्यक्रम महाटिकिटवर सूचीबद्ध करा",
                    onClick = {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("${BuildConfig.API_BASE_URL}/contact"))
                        context.startActivity(intent)
                    }
                )
            }
        }

        // 4. Legal & Support Links
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, Color(0xFFE5E7EB))
            ) {
                Column {
                    ModernProfileMenuItem(
                        icon = Icons.Default.HelpOutline,
                        title = "मदत आणि सपोर्ट (Help Centre)",
                        subtitle = "बुकिंग संबंधित प्रश्न व ग्राहक सहाय्य",
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("${BuildConfig.API_BASE_URL}/contact"))
                            context.startActivity(intent)
                        }
                    )
                    HorizontalDivider(color = Color(0xFFF3F4F6), thickness = 1.dp)
                    ModernProfileMenuItem(
                        icon = Icons.Default.Info,
                        title = "आमच्याबद्दल (About MahaTicket)",
                        subtitle = "महाराष्ट्राचे अधिकृत तिकीट बुकिंग व्यासपीठ",
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("${BuildConfig.API_BASE_URL}/about"))
                            context.startActivity(intent)
                        }
                    )
                    HorizontalDivider(color = Color(0xFFF3F4F6), thickness = 1.dp)
                    ModernProfileMenuItem(
                        icon = Icons.Default.AssignmentReturn,
                        title = "परतावा धोरण (Refund Policy)",
                        subtitle = "तिकीट रद्द करणे व परतावा नियम",
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("${BuildConfig.API_BASE_URL}/refund"))
                            context.startActivity(intent)
                        }
                    )
                    HorizontalDivider(color = Color(0xFFF3F4F6), thickness = 1.dp)
                    ModernProfileMenuItem(
                        icon = Icons.Default.Description,
                        title = "नियम व अटी (Terms & Conditions)",
                        subtitle = "वापरकर्त्यांसाठी नियम व मार्गदर्शक तत्त्वे",
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("${BuildConfig.API_BASE_URL}/terms"))
                            context.startActivity(intent)
                        }
                    )
                    HorizontalDivider(color = Color(0xFFF3F4F6), thickness = 1.dp)
                    ModernProfileMenuItem(
                        icon = Icons.Default.PrivacyTip,
                        title = "गोपनीयता धोरण (Privacy Policy)",
                        subtitle = "तुमचा डेटा आणि सुरक्षा माहिती",
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("${BuildConfig.API_BASE_URL}/privacy"))
                            context.startActivity(intent)
                        }
                    )
                }
            }
        }

        // 5. App Version & Company Branding
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 14.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "${BuildConfig.APP_NAME_MR} (${BuildConfig.APP_NAME})",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "आवृत्ती ${BuildConfig.VERSION_NAME} • Kalpkrut Infotech",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "महाराष्ट्रासाठी अभिमानाने निर्मित (Made for Maharashtra)",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Medium,
                    color = Color(0xFFEA580C)
                )
            }
        }
    }
}

@Composable
fun ModernProfileMenuItem(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(Color(0xFFFFF7ED)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = Color(0xFFEA580C),
                modifier = Modifier.size(20.dp)
            )
        }
        Spacer(modifier = Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                fontSize = 14.sp
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 11.sp
            )
        }
        Icon(
            Icons.AutoMirrored.Filled.ArrowForwardIos,
            contentDescription = null,
            tint = Color(0xFF9CA3AF),
            modifier = Modifier.size(13.dp)
        )
    }
}
