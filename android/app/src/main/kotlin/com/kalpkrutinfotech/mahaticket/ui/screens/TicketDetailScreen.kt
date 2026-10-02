package com.kalpkrutinfotech.mahaticket.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.*
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.kalpkrutinfotech.mahaticket.BuildConfig
import com.kalpkrutinfotech.mahaticket.theme.*
import java.net.URLEncoder

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TicketDetailScreen(
    ticketCode: String,
    onNavigateBack: () -> Unit
) {
    val context = LocalContext.current

    val mockTicket = remember {
        TicketDisplayData(
            ticketCode = ticketCode,
            orderNumber = "ORD${ticketCode.take(8)}",
            eventTitle = "नाटक / संगीत महोत्सव",
            eventTitleEn = "MahaTicket Live Experience",
            venueName = "यशवंतराव चव्हाण नाट्यगृह",
            venueAddress = "कोथरूड, पुणे, महाराष्ट्र",
            showtime = "आज, संध्याकाळी ७:०० वा.",
            seatCode = "A-12, A-13",
            attendeeName = "मान्यवर प्रेक्षक (Valued Guest)",
            qrPayload = "TICKET:$ticketCode",
            status = "confirmed"
        )
    }

    var isCardVisible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        isCardVisible = true
    }
    val cardScale by animateFloatAsState(
        targetValue = if (isCardVisible) 1f else 0.95f,
        animationSpec = tween(durationMillis = 250),
        label = "ticketCardScale"
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "अधिकृत ई-पास (Digital Pass)",
                        fontWeight = FontWeight.Bold,
                        fontSize = 17.sp
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = MaterialTheme.colorScheme.onSurface
                        )
                    }
                },
                actions = {
                    IconButton(onClick = {
                        val pdfUrl = "${BuildConfig.API_BASE_URL}/api/tickets/$ticketCode/pdf"
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(pdfUrl))
                        context.startActivity(intent)
                    }) {
                        Icon(
                            Icons.Default.Download,
                            contentDescription = "Download PDF",
                            tint = Color(0xFFEA580C)
                        )
                    }

                    IconButton(onClick = {
                        val shareIntent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(
                                Intent.EXTRA_TEXT,
                                "माझे महाटिकिट तिकीट पहा: ${BuildConfig.API_BASE_URL}/tickets/$ticketCode"
                            )
                        }
                        context.startActivity(Intent.createChooser(shareIntent, "तिकीट शेअर करा"))
                    }) {
                        Icon(
                            Icons.Default.Share,
                            contentDescription = "Share Ticket",
                            tint = Color(0xFFEA580C)
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Authentic Ticket Pass Container matching website `/tickets/[ticketCode]`
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .scale(cardScale),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, Color(0xFFE5E7EB)),
                    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
                ) {
                    Column {
                        // 1. Top Orange Header
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(
                                    Brush.horizontalGradient(
                                        listOf(Color(0xFFEA580C), Color(0xFFC2410C))
                                    )
                                )
                                .padding(18.dp)
                        ) {
                            Column {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.ConfirmationNumber,
                                            contentDescription = null,
                                            tint = Color.White,
                                            modifier = Modifier.size(18.dp)
                                        )
                                        Text(
                                            text = "महाटिकिट अधिकृत ई-पास",
                                            color = Color.White,
                                            fontWeight = FontWeight.Black,
                                            fontSize = 13.sp
                                        )
                                    }

                                    Surface(
                                        shape = RoundedCornerShape(6.dp),
                                        color = Color.White.copy(alpha = 0.25f)
                                    ) {
                                        Text(
                                            text = "प्रवेश वैध",
                                            color = Color.White,
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                Text(
                                    text = mockTicket.eventTitle,
                                    color = Color.White,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Black
                                )
                                Text(
                                    text = mockTicket.eventTitleEn,
                                    color = Color.White.copy(alpha = 0.85f),
                                    fontSize = 12.sp
                                )
                            }
                        }

                        // 2. Perforated Notch Visual Divider with Dotted Line
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(20.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Left semicircle notch
                            Box(
                                modifier = Modifier
                                    .size(20.dp)
                                    .offset(x = (-10).dp)
                                    .background(MaterialTheme.colorScheme.background, CircleShape)
                                    .border(1.dp, Color(0xFFE5E7EB), CircleShape)
                            )
                            // Dashed / Dotted Line
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(1.dp)
                                    .background(Color(0xFFD1D5DB))
                            )
                            // Right semicircle notch
                            Box(
                                modifier = Modifier
                                    .size(20.dp)
                                    .offset(x = 10.dp)
                                    .background(MaterialTheme.colorScheme.background, CircleShape)
                                    .border(1.dp, Color(0xFFE5E7EB), CircleShape)
                            )
                        }

                        // 3. Middle Body: QR Code & Seat Info
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(20.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            // Scannable Gate QR Code Card
                            Card(
                                shape = RoundedCornerShape(14.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                border = BorderStroke(2.dp, Color(0xFFFED7AA)),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                modifier = Modifier.padding(bottom = 12.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(190.dp)
                                        .padding(12.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    val qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" +
                                            URLEncoder.encode(mockTicket.qrPayload, "UTF-8")
                                    AsyncImage(
                                        model = qrUrl,
                                        contentDescription = "Ticket Gate QR Code",
                                        modifier = Modifier.fillMaxSize()
                                    )
                                }
                            }

                            Text(
                                text = "सभागृह प्रवेशद्वारावर हा QR कोड स्कॅन करा",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFEA580C)
                            )

                            Spacer(modifier = Modifier.height(16.dp))

                            // Grid of Details: Venue, Show, Seats, Holder
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                TicketInfoBlock(label = "आसन क्रमांक", value = mockTicket.seatCode, isHighlight = true)
                                TicketInfoBlock(label = "बुकिंग क्रमांक", value = mockTicket.orderNumber)
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                TicketInfoBlock(label = "शो वेळ व दिनांक", value = mockTicket.showtime)
                                TicketInfoBlock(label = "सभागृह", value = mockTicket.venueName)
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                TicketInfoBlock(label = "तिकीट धारक", value = mockTicket.attendeeName)
                                TicketInfoBlock(label = "तिकीट कोड", value = ticketCode)
                            }
                        }

                        // 4. Perforated Notch Visual Divider 2
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(20.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(20.dp)
                                    .offset(x = (-10).dp)
                                    .background(MaterialTheme.colorScheme.background, CircleShape)
                                    .border(1.dp, Color(0xFFE5E7EB), CircleShape)
                            )
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(1.dp)
                                    .background(Color(0xFFD1D5DB))
                            )
                            Box(
                                modifier = Modifier
                                    .size(20.dp)
                                    .offset(x = 10.dp)
                                    .background(MaterialTheme.colorScheme.background, CircleShape)
                                    .border(1.dp, Color(0xFFE5E7EB), CircleShape)
                            )
                        }

                        // 5. Entry Rules & Guidelines (प्रवेश नियम)
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp)
                        ) {
                            Text(
                                text = "महत्त्वाचे प्रवेश नियम व सूचना:",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            RuleBulletItem("कार्यक्रमाच्या वेळेपूर्वी ३० मिनिटे अगोदर सभागृहात उपस्थित राहावे.")
                            RuleBulletItem("मोबाईलमधील हा डिजिटल QR कोड किंवा छापील PDF प्रवेशद्वारावर स्कॅन करणे आवश्यक आहे.")
                            RuleBulletItem("सभागृहात बाहेरील खाद्यपदार्थ व शीतपेये नेण्यास सक्त मनाई आहे.")
                            RuleBulletItem("नाटकाचा पहिला घंटा वाजल्यानंतर सभागृहात शांतता राखावी.")
                        }
                    }
                }
            }

            // Quick Download & Share Action Bar
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Button(
                        onClick = {
                            val pdfUrl = "${BuildConfig.API_BASE_URL}/api/tickets/$ticketCode/pdf"
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(pdfUrl))
                            context.startActivity(intent)
                        },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEA580C)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("PDF डाउनलोड करा", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }

                    OutlinedButton(
                        onClick = {
                            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(
                                    Intent.EXTRA_TEXT,
                                    "माझे महाटिकिट तिकीट: ${BuildConfig.API_BASE_URL}/tickets/$ticketCode"
                                )
                            }
                            context.startActivity(Intent.createChooser(shareIntent, "तिकीट पाठवा"))
                        },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, Color(0xFFEA580C)),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFEA580C))
                    ) {
                        Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("WhatsApp शेअर", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
fun TicketInfoBlock(label: String, value: String, isHighlight: Boolean = false) {
    Column(modifier = Modifier.widthIn(max = 150.dp)) {
        Text(
            text = label,
            fontSize = 11.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            fontSize = if (isHighlight) 15.sp else 13.sp,
            fontWeight = FontWeight.Bold,
            color = if (isHighlight) Color(0xFFEA580C) else MaterialTheme.colorScheme.onSurface
        )
    }
}

@Composable
fun RuleBulletItem(text: String) {
    Row(
        modifier = Modifier.padding(vertical = 2.dp),
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Text("•", color = Color(0xFFEA580C), fontSize = 12.sp, fontWeight = FontWeight.Bold)
        Text(
            text = text,
            fontSize = 11.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            lineHeight = 15.sp
        )
    }
}

data class TicketDisplayData(
    val ticketCode: String,
    val orderNumber: String,
    val eventTitle: String,
    val eventTitleEn: String,
    val venueName: String,
    val venueAddress: String,
    val showtime: String,
    val seatCode: String,
    val attendeeName: String,
    val qrPayload: String,
    val status: String
)
