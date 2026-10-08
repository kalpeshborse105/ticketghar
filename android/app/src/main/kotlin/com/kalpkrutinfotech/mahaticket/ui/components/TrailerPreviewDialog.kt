package com.kalpkrutinfotech.mahaticket.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.PlayArrow
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
import androidx.compose.ui.window.Dialog
import com.kalpkrutinfotech.mahaticket.model.Event
import com.kalpkrutinfotech.mahaticket.theme.*

@Composable
fun TrailerPreviewDialog(
    event: Event,
    language: AppLanguage,
    onDismiss: () -> Unit,
    onBookNow: () -> Unit
) {
    var isPlaying by remember { mutableStateOf(false) }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = CinemaSurface,
            tonalElevation = 8.dp,
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp)
                .testTag("trailer_preview_modal")
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = if (language == AppLanguage.MARATHI) event.titleMr else event.titleEn,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = event.trailerTitle,
                            fontSize = 11.sp,
                            color = GoldAccent
                        )
                    }

                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close",
                            tint = Color.LightGray
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Simulated High-Fidelity Video Player View
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(190.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color.Black),
                    contentAlignment = Alignment.Center
                ) {
                    if (isPlaying) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center,
                            modifier = Modifier.padding(16.dp)
                        ) {
                            Text(text = "🎬 Playing Trailer...", color = GoldBright, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = event.trailerVideoSnippet,
                                color = Color.White,
                                fontSize = 12.sp,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                lineHeight = 16.sp
                            )
                        }
                    } else {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(56.dp)
                                    .clip(CircleShape)
                                    .background(TheatricalCrimson)
                                    .clickable { isPlaying = true },
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.PlayArrow,
                                    contentDescription = "Play",
                                    tint = Color.White,
                                    modifier = Modifier.size(32.dp)
                                )
                            }
                            Spacer(modifier = Modifier.height(10.dp))
                            Text(
                                text = if (language == AppLanguage.MARATHI) "ट्रेलर पाहण्यासाठी टॅप करा" else "Tap to Play Trailer",
                                color = Color(0xFFCBD5E1),
                                fontSize = 12.sp
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Synopsis
                Text(
                    text = if (language == AppLanguage.MARATHI) "नाट्य सारांश (Synopsis)" else "Synopsis",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = GoldBright
                )

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = if (language == AppLanguage.MARATHI) event.synopsisMr else event.synopsisEn,
                    fontSize = 12.sp,
                    color = Color(0xFFCBD5E1),
                    lineHeight = 17.sp
                )

                Spacer(modifier = Modifier.height(10.dp))

                // Cast & Director
                Text(
                    text = "${if (language == AppLanguage.MARATHI) "दिग्दर्शक" else "Director"}: ${event.director}",
                    fontSize = 11.sp,
                    color = Color(0xFF94A3B8)
                )
                if (event.cast.isNotEmpty()) {
                    Text(
                        text = "${if (language == AppLanguage.MARATHI) "कलाकार" else "Cast"}: ${event.cast.joinToString(", ")}",
                        fontSize = 11.sp,
                        color = Color(0xFF94A3B8),
                        lineHeight = 15.sp
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Book Now Button
                Button(
                    onClick = {
                        onDismiss()
                        onBookNow()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .testTag("trailer_modal_book_now"),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = GoldAccent)
                ) {
                    Text(
                        text = if (language == AppLanguage.MARATHI) "आता जागा निवडा आणि बुक करा 🎭" else "Select Seats & Book 🎭",
                        color = Color.Black,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}
