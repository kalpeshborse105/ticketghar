package com.kalpkrutinfotech.mahaticket.ui.screens

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.kalpkrutinfotech.mahaticket.MahaTicketApp
import com.kalpkrutinfotech.mahaticket.theme.*
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.BookingViewModel
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.BookingViewModelFactory

@Composable
fun BookingSuccessScreen(
    orderNumber: String,
    onViewTicket: (String) -> Unit,
    onGoHome: () -> Unit
) {
    var isAnimatedIn by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        isAnimatedIn = true
    }

    val checkmarkScale by animateFloatAsState(
        targetValue = if (isAnimatedIn) 1f else 0.3f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow),
        label = "checkmarkScale"
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item { Spacer(modifier = Modifier.height(16.dp)) }

        // Celebration Green Badge
        item {
            Box(
                modifier = Modifier
                    .size(90.dp)
                    .scale(checkmarkScale)
                    .background(Color(0xFFECFDF5), CircleShape)
                    .border(3.dp, Color(0xFF10B981), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.Check,
                    contentDescription = "Success",
                    tint = Color(0xFF059669),
                    modifier = Modifier.size(52.dp)
                )
            }
        }

        // Title & Confirmation
        item {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "बुकिंग यशस्वी झाली!",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Black,
                    color = MaterialTheme.colorScheme.onBackground
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "आपले तिकीट निश्चित झाले आहे व ई-पास तयार आहे",
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center
                )
            }
        }

        // Digital Ticket Pass Preview Stub Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, Color(0xFFE5E7EB)),
                elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
            ) {
                Column {
                    // Header band in warm orange
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                Brush.horizontalGradient(
                                    listOf(Color(0xFFEA580C), Color(0xFFC2410C))
                                )
                            )
                            .padding(horizontal = 16.dp, vertical = 10.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "महाटिकिट अधिकृत ई-पास",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = Color.White.copy(alpha = 0.25f)
                            ) {
                                Text(
                                    text = "CONFIRMED",
                                    color = Color.White,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Black,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }

                    // Ticket details body
                    Column(modifier = Modifier.padding(18.dp)) {
                        SuccessDetailRow("बुकिंग क्रमांक (Order No)", orderNumber)
                        SuccessDetailRow("स्थिती (Status)", "यशस्वी (Paid & Confirmed)")
                        SuccessDetailRow("तिकीट वितरण (Delivery)", "WhatsApp & SMS द्वारे पाठवले")

                        HorizontalDivider(
                            modifier = Modifier.padding(vertical = 12.dp),
                            color = Color(0xFFE5E7EB)
                        )

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
                                    Icons.Default.QrCodeScanner,
                                    contentDescription = null,
                                    tint = Color(0xFFEA580C),
                                    modifier = Modifier.size(24.dp)
                                )
                                Text(
                                    text = "प्रवेशद्वारावर QR स्कॅन करा",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                            }

                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = Color(0xFFECFDF5)
                            ) {
                                Text(
                                    text = "वैध पास",
                                    color = Color(0xFF059669),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        // Action Buttons
        item {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Button(
                    onClick = { onViewTicket(orderNumber) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEA580C)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(
                        Icons.Default.ConfirmationNumber,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "डिजिटल तिकीट पहा (View Ticket)",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }

                OutlinedButton(
                    onClick = onGoHome,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, Color(0xFFEA580C)),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFEA580C))
                ) {
                    Icon(
                        Icons.Default.Home,
                        contentDescription = null,
                        tint = Color(0xFFEA580C),
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "मुख्य पृष्ठावर जा (Home)",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
fun SuccessDetailRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            fontSize = 12.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}
