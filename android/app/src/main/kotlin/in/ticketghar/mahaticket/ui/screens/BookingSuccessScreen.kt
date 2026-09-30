package `in`.ticketghar.mahaticket.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.alpha
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.lifecycle.viewmodel.compose.viewModel
import `in`.ticketghar.mahaticket.MahaTicketApp
import `in`.ticketghar.mahaticket.model.BookingOrder
import `in`.ticketghar.mahaticket.theme.*
import `in`.ticketghar.mahaticket.ui.viewmodel.BookingViewModel
import `in`.ticketghar.mahaticket.ui.viewmodel.BookingViewModelFactory

@Composable
fun BookingSuccessScreen(
    orderNumber: String,
    onViewTicket: (String) -> Unit,
    onGoHome: () -> Unit
) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as MahaTicketApp
    val bookingViewModel: BookingViewModel = viewModel(
        factory = BookingViewModelFactory(app.bookingRepository, app.networkMonitor)
    )

    val bookingOrder by bookingViewModel.bookingOrder.collectAsState()

    // Mock booking order for display
    val mockOrder = remember {
        BookingOrder(
            orderNumber = orderNumber,
            grandTotal = 50000,
            tickets = listOf(),
            eventTitle = "नाटक शीर्षक",
            venueName = "सभागृह",
            showtime = "आज, 7:00 PM"
        )
    }

    var isAnimatedIn by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        isAnimatedIn = true
    }
    val checkmarkScale by animateFloatAsState(
        targetValue = if (isAnimatedIn) 1f else 0.4f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow),
        label = "checkmarkScale"
    )
    val checkmarkAlpha by animateFloatAsState(
        targetValue = if (isAnimatedIn) 1f else 0f,
        animationSpec = tween(durationMillis = 280),
        label = "checkmarkAlpha"
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item { Spacer(modifier = Modifier.height(32.dp)) }

        // Success Icon with subtle spring animation
        item {
            Surface(
                shape = CircleShape,
                color = MahaSuccess.copy(alpha = 0.15f),
                modifier = Modifier
                    .size(100.dp)
                    .scale(checkmarkScale)
                    .alpha(checkmarkAlpha)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Default.CheckCircle,
                        contentDescription = null,
                        modifier = Modifier.size(60.dp),
                        tint = MahaSuccess
                    )
                }
            }
        }

        // Success Message
        item {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "बुकिंग यशस्वी!",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "तुमचे तिकीट बुक झाले आहे",
                    fontSize = 15.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center
                )
            }
        }

        // Order Details Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp)
                ) {
                    DetailRow("ऑर्डर क्रमांक", orderNumber)
                    Divider(modifier = Modifier.padding(vertical = 12.dp), color = MahaBorder)
                    DetailRow("कार्यक्रम", mockOrder.eventTitle)
                    DetailRow("सभागृह", mockOrder.venueName)
                    DetailRow("शो वेळ", mockOrder.showtime)
                    Divider(modifier = Modifier.padding(vertical = 12.dp), color = MahaBorder)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "एकूण रक्कम",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "₹${mockOrder.grandTotal / 100}",
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }
        }

        // Action Buttons
        item {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Button(
                    onClick = { onViewTicket(orderNumber) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary
                    ),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Default.ConfirmationNumber, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("तिकीट पहा", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                }

                OutlinedButton(
                    onClick = onGoHome,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = MaterialTheme.colorScheme.primary
                    ),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Default.Home, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("होमवर जा", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }

        // Info Note
        item {
            Surface(
                color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f),
                shape = RoundedCornerShape(8.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Info,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "तुमचे तिकीट ईमेल व SMS द्वारे पाठवले गेले आहे",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        lineHeight = 16.sp
                    )
                }
            }
        }
    }
}

@Composable
fun DetailRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}
