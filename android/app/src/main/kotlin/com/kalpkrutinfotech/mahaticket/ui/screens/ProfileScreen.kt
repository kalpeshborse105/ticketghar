package com.kalpkrutinfotech.mahaticket.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForwardIos
import androidx.compose.material.icons.automirrored.filled.HelpOutline
import androidx.compose.material.icons.automirrored.filled.Login
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
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
            .background(CinemaBg)
            .testTag("profile_screen"),
        contentPadding = PaddingValues(16.dp, 16.dp, 16.dp, 90.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 1. Profile Header Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = CinemaSurface),
                elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(76.dp)
                            .clip(CircleShape)
                            .background(TheatricalCrimson)
                            .border(2.dp, GoldAccent, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = if (isLoggedIn) "🎭" else "👤",
                            fontSize = 36.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = if (isLoggedIn) "महाटिकिट सदस्य" else "महाटिकिट वापरकर्ता (Guest)",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )

                    Spacer(modifier = Modifier.height(2.dp))

                    Text(
                        text = if (isLoggedIn) "+91 98765 43210" else "आपली सर्व तिकिटे आपल्या फोनवर सुरक्षित आहेत",
                        fontSize = 12.sp,
                        color = Color(0xFF94A3B8)
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            color = if (isLoggedIn) Color(0xFF065F46) else Color(0xFF1E293B),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                text = if (isLoggedIn) "✓ सत्यापित खाते" else "अतिथी वापरकर्ता",
                                color = if (isLoggedIn) GoldBright else Color(0xFFCBD5E1),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }

                        Surface(
                            color = TheatricalCrimson.copy(alpha = 0.2f),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                text = "👑 रसिक सदस्य",
                                color = TheatricalCrimsonLight,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    if (!isLoggedIn) {
                        Button(
                            onClick = onNavigateToLogin,
                            colors = ButtonDefaults.buttonColors(containerColor = TheatricalCrimson),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(46.dp)
                        ) {
                            Icon(Icons.AutoMirrored.Filled.Login, contentDescription = null, modifier = Modifier.size(18.dp), tint = Color.White)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("लॉगिन करा / Sign In", fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    } else {
                        OutlinedButton(
                            onClick = { isLoggedIn = false },
                            shape = RoundedCornerShape(10.dp),
                            border = BorderStroke(1.dp, TheatricalCrimson),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = TheatricalCrimsonLight),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("लॉगआउट करा (Sign Out)", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // 2. Main Account & Booking Actions Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = CinemaSurface)
            ) {
                Column {
                    CinemaProfileMenuItem(
                        icon = Icons.Default.ConfirmationNumber,
                        title = "माझी तिकिटे (My Tickets)",
                        subtitle = "बुक केलेली सर्व तिकिटे व ई-पास पहा",
                        onClick = onNavigateToTickets
                    )
                    HorizontalDivider(color = Color(0xFF1E293B), thickness = 1.dp)
                    CinemaProfileMenuItem(
                        icon = Icons.Default.Translate,
                        title = "अ‍ॅप भाषा (App Language)",
                        subtitle = "मराठी (प्राथमिक भाषा) / English",
                        onClick = {}
                    )
                    HorizontalDivider(color = Color(0xFF1E293B), thickness = 1.dp)
                    CinemaProfileMenuItem(
                        icon = Icons.Default.Notifications,
                        title = "सूचना (Notifications)",
                        subtitle = "नवीन कार्यक्रम, ऑफर आणि शो स्मरणपत्रे",
                        onClick = {}
                    )
                }
            }
        }

        // 3. Organizer Partnership Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = CinemaSurface),
                border = BorderStroke(1.dp, GoldAccent.copy(alpha = 0.4f))
            ) {
                CinemaProfileMenuItem(
                    icon = Icons.Default.Business,
                    title = "नाट्य व कार्यक्रम आयोजक (Partner With Us)",
                    subtitle = "आपला कार्यक्रम महाटिकिटवर सूचीबद्ध करा",
                    iconTint = GoldAccent,
                    onClick = {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("${BuildConfig.API_BASE_URL}/contact"))
                        context.startActivity(intent)
                    }
                )
            }
        }

        // 4. Legal & Support Links Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = CinemaSurface)
            ) {
                Column {
                    CinemaProfileMenuItem(
                        icon = Icons.AutoMirrored.Filled.HelpOutline,
                        title = "मदत आणि सपोर्ट (Help Centre)",
                        subtitle = "बुकिंग संबंधित प्रश्न व ग्राहक सहाय्य",
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("${BuildConfig.API_BASE_URL}/contact"))
                            context.startActivity(intent)
                        }
                    )
                    HorizontalDivider(color = Color(0xFF1E293B), thickness = 1.dp)
                    CinemaProfileMenuItem(
                        icon = Icons.Default.Info,
                        title = "आमच्याबद्दल (About MahaTicket)",
                        subtitle = "महाराष्ट्राचे अधिकृत तिकीट बुकिंग व्यासपीठ",
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("${BuildConfig.API_BASE_URL}/about"))
                            context.startActivity(intent)
                        }
                    )
                    HorizontalDivider(color = Color(0xFF1E293B), thickness = 1.dp)
                    CinemaProfileMenuItem(
                        icon = Icons.Default.AssignmentReturn,
                        title = "परतावा धोरण (Refund Policy)",
                        subtitle = "तिकीट रद्द करणे व परतावा नियम",
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("${BuildConfig.API_BASE_URL}/refund"))
                            context.startActivity(intent)
                        }
                    )
                    HorizontalDivider(color = Color(0xFF1E293B), thickness = 1.dp)
                    CinemaProfileMenuItem(
                        icon = Icons.Default.Description,
                        title = "नियम व अटी (Terms & Conditions)",
                        subtitle = "वापरकर्त्यांसाठी नियम व मार्गदर्शक तत्त्वे",
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("${BuildConfig.API_BASE_URL}/terms"))
                            context.startActivity(intent)
                        }
                    )
                    HorizontalDivider(color = Color(0xFF1E293B), thickness = 1.dp)
                    CinemaProfileMenuItem(
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

        // 5. App Version Branding
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "${BuildConfig.APP_NAME_MR} (${BuildConfig.APP_NAME})",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = GoldBright
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "आवृत्ती ${BuildConfig.VERSION_NAME} • Made with ❤️ in Maharashtra",
                    fontSize = 11.sp,
                    color = Color(0xFF64748B)
                )
            }
        }
    }
}

@Composable
private fun CinemaProfileMenuItem(
    icon: ImageVector,
    title: String,
    subtitle: String,
    iconTint: Color = GoldAccent,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Surface(
            color = Color(0xFF1E293B),
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier.size(40.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    icon,
                    contentDescription = null,
                    tint = iconTint,
                    modifier = Modifier.size(20.dp)
                )
            }
        }

        Spacer(modifier = Modifier.width(14.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = subtitle,
                fontSize = 11.sp,
                color = Color(0xFF94A3B8)
            )
        }

        Icon(
            Icons.AutoMirrored.Filled.ArrowForwardIos,
            contentDescription = null,
            tint = Color(0xFF64748B),
            modifier = Modifier.size(14.dp)
        )
    }
}
