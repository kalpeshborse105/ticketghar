package com.kalpkrutinfotech.mahaticket.ui.screens

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.kalpkrutinfotech.mahaticket.BuildConfig
import com.kalpkrutinfotech.mahaticket.MahaTicketApp
import com.kalpkrutinfotech.mahaticket.theme.*
import kotlinx.coroutines.launch

@Composable
fun ProfileScreen(
    language: AppLanguage = AppLanguage.MARATHI,
    onLanguageToggle: (AppLanguage) -> Unit = {},
    onNavigateToLogin: () -> Unit = {},
    onNavigateToTickets: () -> Unit = {},
    onNavigateToLegal: (String) -> Unit = {}
) {
    val isMarathi = language == AppLanguage.MARATHI
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val sessionManager = remember { com.kalpkrutinfotech.mahaticket.util.UserSessionManager.getInstance(context) }
    val isLoggedIn by sessionManager.isLoggedIn.collectAsState()
    val userName by sessionManager.userName.collectAsState()
    val userPhone by sessionManager.userPhone.collectAsState()
    val userEmail by sessionManager.userEmail.collectAsState()
    val userAvatar by sessionManager.userAvatar.collectAsState()

    var showEditProfileDialog by remember { mutableStateOf(false) }

    // Image Picker Launcher for Profile Photo Upload
    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            try {
                val inputStream = context.contentResolver.openInputStream(uri)
                val avatarFile = java.io.File(context.filesDir, "avatar_${System.currentTimeMillis()}.jpg")
                avatarFile.outputStream().use { output ->
                    inputStream?.copyTo(output)
                }
                val localAvatarUri = avatarFile.toURI().toString()
                sessionManager.saveAvatarUrl(localAvatarUri)

                // Sync with Next.js profile API
                coroutineScope.launch {
                    val app = context.applicationContext as? MahaTicketApp
                    val result = app?.authRepository?.updateProfile(
                        fullName = userName,
                        phoneNumber = userPhone,
                        avatarUrl = localAvatarUri
                    )
                    Toast.makeText(context, "प्रोफाइल फोटो यशस्वीरीत्या बदलला", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                sessionManager.saveAvatarUrl(uri.toString())
            }
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MahaBg)
            .testTag("profile_screen"),
        contentPadding = PaddingValues(16.dp, 16.dp, 16.dp, 90.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // 1. Profile Header Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                border = BorderStroke(1.dp, MahaBorder)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Profile Avatar with Camera Upload Action
                    Box(
                        modifier = Modifier
                            .size(80.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Surface(
                            modifier = Modifier
                                .size(76.dp)
                                .clip(CircleShape)
                                .clickable { imagePickerLauncher.launch("image/*") },
                            shape = CircleShape,
                            color = MahaWarm,
                            border = BorderStroke(2.dp, MahaOrange)
                        ) {
                            if (!userAvatar.isNullOrBlank()) {
                                AsyncImage(
                                    model = userAvatar,
                                    contentDescription = "Profile Photo",
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize()
                                )
                            } else {
                                Box(
                                    contentAlignment = Alignment.Center,
                                    modifier = Modifier.fillMaxSize()
                                ) {
                                    Text(
                                        text = if (isLoggedIn) "🎭" else "👤",
                                        fontSize = 32.sp
                                    )
                                }
                            }
                        }

                        // Camera Upload Icon Badge
                        Surface(
                            modifier = Modifier
                                .align(Alignment.BottomEnd)
                                .size(26.dp)
                                .clip(CircleShape)
                                .clickable { imagePickerLauncher.launch("image/*") },
                            color = MahaOrange,
                            shape = CircleShape,
                            border = BorderStroke(1.5.dp, Color.White),
                            shadowElevation = 2.dp
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = Icons.Default.CameraAlt,
                                    contentDescription = "Change Photo",
                                    tint = Color.White,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Text(
                        text = if (isLoggedIn) (userName?.ifBlank { null } ?: "महाटिकिट सदस्य") else "महाटिकिट वापरकर्ता",
                        fontSize = 17.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )

                    Spacer(modifier = Modifier.height(2.dp))

                    Text(
                        text = if (isLoggedIn) (userPhone?.ifBlank { null } ?: userEmail ?: "सत्यापित सदस्य") else "आपली सर्व तिकिटे सुरक्षित आहेत",
                        fontSize = 12.sp,
                        color = TextSecondary
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            color = if (isLoggedIn) Color(0xFFDCFCE7) else MahaWarmLight,
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                text = if (isLoggedIn) "✓ सत्यापित खाते" else "अतिथी वापरकर्ता",
                                color = if (isLoggedIn) Color(0xFF16A34A) else TextSecondary,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }

                        Surface(
                            color = MahaWarm,
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                text = "रसिक सदस्य",
                                color = MahaOrangeDeep,
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
                            colors = ButtonDefaults.buttonColors(containerColor = MahaOrange),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(44.dp)
                        ) {
                            Icon(Icons.AutoMirrored.Filled.Login, contentDescription = null, modifier = Modifier.size(18.dp), tint = Color.White)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("लॉगिन करा", fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    } else {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            OutlinedButton(
                                onClick = { showEditProfileDialog = true },
                                shape = RoundedCornerShape(8.dp),
                                border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(15.dp), tint = TextPrimary)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("नाव बदला", fontWeight = FontWeight.SemiBold, color = TextPrimary, fontSize = 12.sp)
                            }

                            OutlinedButton(
                                onClick = { sessionManager.clearSession() },
                                shape = RoundedCornerShape(8.dp),
                                border = BorderStroke(1.dp, MahaOrange),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = MahaOrange),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("लॉगआउट करा", fontWeight = FontWeight.Bold, color = MahaOrange, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }

        // 2. Main Account & Booking Actions Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                border = BorderStroke(1.dp, MahaBorder)
            ) {
                Column {
                    CinemaProfileMenuItem(
                        icon = Icons.Default.ConfirmationNumber,
                        title = if (isMarathi) "माझी तिकिटे" else "My Tickets",
                        subtitle = if (isMarathi) "बुक केलेली सर्व तिकिटे व ई-पास पहा" else "View all booked tickets and e-passes",
                        onClick = onNavigateToTickets
                    )
                    HorizontalDivider(color = MahaBorder, thickness = 0.5.dp)
                    CinemaProfileMenuItem(
                        icon = Icons.Default.Translate,
                        title = if (isMarathi) "अ‍ॅप भाषा (App Language)" else "App Language (अ‍ॅप भाषा)",
                        subtitle = if (isMarathi) "मराठी (सक्रिय) • इंग्रजीसाठी येथे टॅप करा" else "English (Active) • Tap to switch to Marathi",
                        onClick = {
                            val next = if (isMarathi) AppLanguage.ENGLISH else AppLanguage.MARATHI
                            onLanguageToggle(next)
                        }
                    )
                    HorizontalDivider(color = MahaBorder, thickness = 0.5.dp)
                    CinemaProfileMenuItem(
                        icon = Icons.Default.Notifications,
                        title = if (isMarathi) "सूचना व स्मरणपत्रे" else "Notifications & Alerts",
                        subtitle = if (isMarathi) "नवीन कार्यक्रम आणि शो स्मरणपत्रे" else "Show reminders and new event alerts",
                        onClick = {}
                    )
                }
            }
        }

        // 3. Organizer Partnership Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                border = BorderStroke(1.dp, MahaBorder)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        modifier = Modifier.weight(1f),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Surface(
                            color = MahaWarm,
                            shape = CircleShape,
                            modifier = Modifier.size(42.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(text = "🎪", fontSize = 20.sp)
                            }
                        }
                        Column {
                            Text(
                                text = "नाट्य निर्माते व आयोजक आहात?",
                                fontSize = 13.5.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = "महाटिकिट वर आपले नाटक किंवा कार्यक्रम लिस्ट करा",
                                fontSize = 11.sp,
                                color = TextSecondary,
                                modifier = Modifier.padding(top = 1.dp)
                            )
                        }
                    }

                    Surface(
                        color = MahaOrange,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.clickable {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("${BuildConfig.API_BASE_URL}/organizer/join"))
                            context.startActivity(intent)
                        }
                    ) {
                        Text(
                            text = "नोंदणी",
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                        )
                    }
                }
            }
        }

        // 4. Support & Legal Policies
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                border = BorderStroke(1.dp, MahaBorder)
            ) {
                Column {
                    CinemaProfileMenuItem(
                        icon = Icons.AutoMirrored.Filled.HelpOutline,
                        title = "मदत आणि संपर्क",
                        subtitle = "ग्राहक सेवा आणि सहाय्य केंद्र",
                        onClick = { onNavigateToLegal("help") }
                    )
                    HorizontalDivider(color = MahaBorder, thickness = 0.5.dp)
                    CinemaProfileMenuItem(
                        icon = Icons.Default.PrivacyTip,
                        title = "गोपनीयता धोरण (Privacy Policy)",
                        subtitle = "डेटा सुरक्षा आणि वापर धोरण",
                        onClick = { onNavigateToLegal("privacy") }
                    )
                    HorizontalDivider(color = MahaBorder, thickness = 0.5.dp)
                    CinemaProfileMenuItem(
                        icon = Icons.Default.Gavel,
                        title = "नियम व अटी (Terms of Service)",
                        subtitle = "अधिकृत बुकिंग नियम आणि परतावा धोरण",
                        onClick = { onNavigateToLegal("terms") }
                    )
                }
            }
        }

        // 5. Version Info
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "महाटिकिट • अधिकृत तिकीट आरक्षण प्लॅटफॉर्म",
                    fontSize = 11.5.sp,
                    fontWeight = FontWeight.Medium,
                    color = TextSecondary
                )
                Text(
                    text = "आवृत्ती २.४.० • कल्पकृत इन्फोटेक प्रा. लि.",
                    fontSize = 10.5.sp,
                    color = TextSecondary,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }
        }
    }

    if (showEditProfileDialog) {
        var editName by remember { mutableStateOf(userName ?: "") }
        var editPhone by remember { mutableStateOf(userPhone ?: "") }
        var isSaving by remember { mutableStateOf(false) }

        androidx.compose.ui.window.Dialog(onDismissRequest = { if (!isSaving) showEditProfileDialog = false }) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Color.White,
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxWidth().padding(8.dp)
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Text(
                        text = "प्रोफाइल माहिती बदला",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )

                    OutlinedTextField(
                        value = editName,
                        onValueChange = { editName = it },
                        label = { Text("पूर्ण नाव (Full Name)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = editPhone,
                        onValueChange = { editPhone = it },
                        label = { Text("मोबाईल क्रमांक (Phone Number)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        TextButton(
                            onClick = { showEditProfileDialog = false },
                            enabled = !isSaving
                        ) {
                            Text("रद्द करा", color = TextSecondary)
                        }

                        Spacer(modifier = Modifier.width(8.dp))

                        Button(
                            onClick = {
                                isSaving = true
                                coroutineScope.launch {
                                    val app = context.applicationContext as? MahaTicketApp
                                    app?.authRepository?.updateProfile(
                                        fullName = editName.trim(),
                                        phoneNumber = editPhone.trim(),
                                        avatarUrl = userAvatar
                                    )
                                    sessionManager.saveProfile(editName.trim(), editPhone.trim(), userAvatar)
                                    isSaving = false
                                    showEditProfileDialog = false
                                    Toast.makeText(context, "माहिती यशस्वीरीत्या जतन केली", Toast.LENGTH_SHORT).show()
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = MahaOrange),
                            enabled = !isSaving
                        ) {
                            if (isSaving) {
                                CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                            } else {
                                Text("जतन करा", color = Color.White, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CinemaProfileMenuItem(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(
            modifier = Modifier.weight(1f),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Surface(
                color = MahaWarmLight,
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.size(36.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = MahaOrange,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Column {
                Text(
                    text = title,
                    fontSize = 13.5.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary
                )
                Text(
                    text = subtitle,
                    fontSize = 11.sp,
                    color = TextSecondary,
                    modifier = Modifier.padding(top = 1.dp)
                )
            }
        }

        Icon(
            imageVector = Icons.AutoMirrored.Filled.ArrowForwardIos,
            contentDescription = null,
            tint = TextSecondary,
            modifier = Modifier.size(13.dp)
        )
    }
}
