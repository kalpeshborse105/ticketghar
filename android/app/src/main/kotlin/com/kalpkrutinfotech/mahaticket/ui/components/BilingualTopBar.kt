package com.kalpkrutinfotech.mahaticket.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kalpkrutinfotech.mahaticket.theme.AppLanguage
import com.kalpkrutinfotech.mahaticket.theme.CinemaSurface
import com.kalpkrutinfotech.mahaticket.theme.GoldAccent
import com.kalpkrutinfotech.mahaticket.theme.TheatricalCrimson
import com.kalpkrutinfotech.mahaticket.theme.UserRole

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BilingualTopBar(
    currentLanguage: AppLanguage,
    onLanguageToggle: (AppLanguage) -> Unit,
    currentRole: UserRole,
    onRoleSelected: (UserRole) -> Unit,
    notificationCount: Int,
    onNotificationClick: () -> Unit,
    onChatbotClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    var showRoleMenu by remember { mutableStateOf(false) }

    TopAppBar(
        modifier = modifier
            .background(CinemaSurface)
            .testTag("bilingual_top_app_bar"),
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = CinemaSurface,
            titleContentColor = Color.White
        ),
        title = {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(start = 4.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .background(TheatricalCrimson, RoundedCornerShape(10.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(text = "🎭", fontSize = 22.sp)
                }

                Spacer(modifier = Modifier.width(10.dp))

                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = if (currentLanguage == AppLanguage.MARATHI) "महाटिकिट" else "MahaTicket",
                            fontWeight = FontWeight.Black,
                            fontSize = 18.sp,
                            color = Color.White
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Box(
                            modifier = Modifier
                                .background(GoldAccent.copy(alpha = 0.2f), RoundedCornerShape(4.dp))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = "LIVE",
                                color = GoldAccent,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    Text(
                        text = "Kalpkrut Control Center",
                        fontSize = 10.sp,
                        color = Color(0xFF94A3B8),
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        },
        actions = {
            // Language Toggle Chip
            Surface(
                modifier = Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .clickable {
                        val next = if (currentLanguage == AppLanguage.MARATHI) AppLanguage.ENGLISH else AppLanguage.MARATHI
                        onLanguageToggle(next)
                    }
                    .testTag("language_toggle_button"),
                color = Color(0xFF1E293B),
                shape = RoundedCornerShape(16.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(text = "🌐", fontSize = 12.sp)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = if (currentLanguage == AppLanguage.MARATHI) "मराठी" else "ENG",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = GoldAccent
                    )
                }
            }

            Spacer(modifier = Modifier.width(6.dp))

            // Role Switcher Dropdown (Customer / Organizer / Admin)
            Box {
                Surface(
                    modifier = Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .clickable { showRoleMenu = true }
                        .testTag("role_switcher_button"),
                    color = when (currentRole) {
                        UserRole.ADMIN -> TheatricalCrimson.copy(alpha = 0.3f)
                        UserRole.ORGANIZER -> GoldAccent.copy(alpha = 0.25f)
                        UserRole.PUBLIC_USER -> Color(0xFF1E293B)
                    },
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = when (currentRole) {
                                UserRole.ADMIN -> "👑 "
                                UserRole.ORGANIZER -> "🎪 "
                                UserRole.PUBLIC_USER -> "👤 "
                            },
                            fontSize = 12.sp
                        )
                        Text(
                            text = if (currentLanguage == AppLanguage.MARATHI) currentRole.labelMr else currentRole.labelEn,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White
                        )
                        Icon(
                            imageVector = Icons.Default.ArrowDropDown,
                            contentDescription = "Select Role",
                            tint = Color.LightGray,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }

                DropdownMenu(
                    expanded = showRoleMenu,
                    onDismissRequest = { showRoleMenu = false },
                    modifier = Modifier.background(Color(0xFF1E293B))
                ) {
                    UserRole.entries.forEach { role ->
                        DropdownMenuItem(
                            text = {
                                Text(
                                    text = if (currentLanguage == AppLanguage.MARATHI) role.labelMr else role.labelEn,
                                    color = if (role == currentRole) GoldAccent else Color.White,
                                    fontWeight = if (role == currentRole) FontWeight.Bold else FontWeight.Normal
                                )
                            },
                            leadingIcon = {
                                Text(
                                    text = when (role) {
                                        UserRole.ADMIN -> "👑"
                                        UserRole.ORGANIZER -> "🎪"
                                        UserRole.PUBLIC_USER -> "👤"
                                    }
                                )
                            },
                            onClick = {
                                onRoleSelected(role)
                                showRoleMenu = false
                            }
                        )
                    }
                }
            }

            // NatyaMitra AI Assistant Button
            IconButton(
                onClick = onChatbotClick,
                modifier = Modifier.testTag("ai_chatbot_topbar_button")
            ) {
                Surface(
                    color = GoldAccent.copy(alpha = 0.2f),
                    shape = RoundedCornerShape(8.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, GoldAccent.copy(alpha = 0.5f))
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(text = "✨", fontSize = 11.sp)
                        Spacer(modifier = Modifier.width(2.dp))
                        Text(
                            text = "AI",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = GoldAccent
                        )
                    }
                }
            }

            // Notification Bell
            IconButton(
                onClick = onNotificationClick,
                modifier = Modifier.testTag("notifications_button")
            ) {
                Box {
                    Icon(
                        imageVector = Icons.Outlined.Notifications,
                        contentDescription = "Notifications",
                        tint = Color.White
                    )
                    if (notificationCount > 0) {
                        Box(
                            modifier = Modifier
                                .size(16.dp)
                                .align(Alignment.TopEnd)
                                .background(TheatricalCrimson, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "$notificationCount",
                                color = Color.White,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    )
}
