package com.kalpkrutinfotech.mahaticket.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kalpkrutinfotech.mahaticket.BuildConfig
import com.kalpkrutinfotech.mahaticket.model.Booking
import com.kalpkrutinfotech.mahaticket.theme.*
import com.kalpkrutinfotech.mahaticket.ui.components.TicketPassCard

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TicketDetailScreen(
    ticketCode: String,
    onNavigateBack: () -> Unit
) {
    val context = LocalContext.current

    val bookingData = remember(ticketCode) {
        Booking(
            bookingId = "ORD${ticketCode.take(8).uppercase()}",
            eventId = "1",
            eventTitleEn = "MahaTicket Live Theatrical Experience",
            eventTitleMr = "सुप्रसिद्ध मराठी नाट्यप्रयोग",
            venueName = "यशवंतराव चव्हाण नाट्यगृह",
            venueAddress = "कोथरूड, पुणे, महाराष्ट्र",
            showDate = "आज, संध्याकाळी",
            showTime = "०७:०० PM",
            seatIds = listOf("E-8", "E-9"),
            ticketCount = 2,
            baseAmount = 600,
            convenienceFee = 70,
            gstAmount = 12,
            totalAmount = 682,
            userEmail = "guest@mahaticket.in",
            userPhone = "9822000000",
            paymentId = "pay_rzp_$ticketCode",
            paymentMethod = "Razorpay UPI",
            qrCodeData = "MAHATICKET|$ticketCode"
        )
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MahaBg)
            .testTag("ticket_detail_screen")
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Header Bar
            Surface(
                color = Color.White,
                modifier = Modifier.fillMaxWidth(),
                border = BorderStroke(1.dp, MahaBorder),
                shadowElevation = 1.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = onNavigateBack,
                        modifier = Modifier.testTag("ticket_detail_back_btn")
                    ) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = TextPrimary
                        )
                    }

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "अधिकृत ई-पास",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Text(
                            text = "तिकीट कोड: $ticketCode",
                            fontSize = 11.5.sp,
                            color = TextSecondary
                        )
                    }

                    IconButton(
                        onClick = {
                            val pdfUrl = "${BuildConfig.API_BASE_URL}/api/tickets/$ticketCode/pdf"
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(pdfUrl))
                            context.startActivity(intent)
                        }
                    ) {
                        Icon(
                            Icons.Default.Download,
                            contentDescription = "Download PDF",
                            tint = MahaOrange
                        )
                    }
                }
            }

            // Ticket Details & Pass View
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Official TicketPassCard
                item {
                    TicketPassCard(
                        booking = bookingData,
                        language = AppLanguage.MARATHI,
                        onShareClick = {
                            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(
                                    Intent.EXTRA_TEXT,
                                    "माझे महाटिकिट डिजिटल तिकीट: ${BuildConfig.API_BASE_URL}/tickets/$ticketCode\nऑर्डर #${bookingData.bookingId}"
                                )
                            }
                            context.startActivity(Intent.createChooser(shareIntent, "तिकीट शेअर करा"))
                        }
                    )
                }

                // Venue Directions Card
                item {
                    Card(
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                        border = BorderStroke(1.dp, MahaBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(text = "📍 ", fontSize = 18.sp)
                                Column {
                                    Text(
                                        text = "नाट्यगृह पत्ता व मार्ग",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextPrimary
                                    )
                                    Text(
                                        text = bookingData.venueAddress,
                                        fontSize = 11.5.sp,
                                        color = TextSecondary,
                                        modifier = Modifier.padding(top = 1.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            Button(
                                onClick = {
                                    val gmmIntentUri = Uri.parse("geo:0,0?q=${Uri.encode(bookingData.venueName + ", " + bookingData.venueAddress)}")
                                    val mapIntent = Intent(Intent.ACTION_VIEW, gmmIntentUri)
                                    mapIntent.setPackage("com.google.android.apps.maps")
                                    try {
                                        context.startActivity(mapIntent)
                                    } catch (_: Exception) {
                                        context.startActivity(Intent(Intent.ACTION_VIEW, gmmIntentUri))
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = MahaOrange),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Icon(Icons.Default.Directions, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("गुगल मॅप्सवर रस्ता पहा", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                // Important Advisory Notes Card
                item {
                    Surface(
                        color = Color.White,
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.dp, MahaBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = "महत्त्वाच्या सूचना:",
                                fontSize = 12.5.sp,
                                fontWeight = FontWeight.Bold,
                                color = MahaOrangeDeep
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "• कृपया प्रयोग सुरू होण्यापूर्वी किमान २० मिनिटे आधी सभागृहात उपस्थित राहा.\n• सभागृहात मोबाईल फोन सायलेंट मोडवर ठेवावा.\n• हा डिजिटल पास प्रवेशद्वारावर स्कॅन केल्यानंतरच वैध ठरेल.",
                                fontSize = 11.5.sp,
                                color = TextSecondary,
                                lineHeight = 18.sp
                            )
                        }
                    }
                }
            }
        }
    }
}
