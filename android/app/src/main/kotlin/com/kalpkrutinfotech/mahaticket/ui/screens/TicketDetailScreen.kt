package com.kalpkrutinfotech.mahaticket.ui.screens

import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Environment
import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kalpkrutinfotech.mahaticket.BuildConfig
import com.kalpkrutinfotech.mahaticket.data.api.RetrofitClient
import com.kalpkrutinfotech.mahaticket.data.api.SingleTicketDetailsResponse
import com.kalpkrutinfotech.mahaticket.model.Booking
import com.kalpkrutinfotech.mahaticket.model.SeatTier
import com.kalpkrutinfotech.mahaticket.theme.*
import com.kalpkrutinfotech.mahaticket.ui.components.TheaterLoaderCard
import com.kalpkrutinfotech.mahaticket.ui.components.TicketPassCard
import com.kalpkrutinfotech.mahaticket.util.DateTimeUtils
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TicketDetailScreen(
    ticketCode: String,
    onNavigateBack: () -> Unit,
    language: AppLanguage = AppLanguage.MARATHI
) {
    val isMarathi = language == AppLanguage.MARATHI
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var ticketResponse by remember { mutableStateOf<SingleTicketDetailsResponse?>(null) }
    var isDownloadingPdf by remember { mutableStateOf(false) }

    fun loadTicket() {
        isLoading = true
        errorMessage = null
        coroutineScope.launch {
            try {
                val res = withContext(Dispatchers.IO) {
                    RetrofitClient.apiService.getTicketDetails(ticketCode)
                }
                if (res.isSuccessful && res.body() != null) {
                    ticketResponse = res.body()
                    isLoading = false
                } else {
                    errorMessage = "तिकीट शोधण्यात त्रुटी आली. कृपया तिकीट कोड तपासा."
                    isLoading = false
                }
            } catch (e: Exception) {
                errorMessage = "नेटवर्क त्रुटी: तिकीट माहिती लोड करता आली नाही. कृपया इंटरनेट कनेक्शन तपासा."
                isLoading = false
            }
        }
    }

    LaunchedEffect(ticketCode) {
        loadTicket()
    }

    // Function to download official PDF pass using Android DownloadManager
    fun triggerPdfDownload() {
        if (isDownloadingPdf) return
        isDownloadingPdf = true

        try {
            val downloadUrl = if (ticketResponse?.downloadPdfUrl != null) {
                if (ticketResponse!!.downloadPdfUrl!!.startsWith("http")) {
                    ticketResponse!!.downloadPdfUrl!!
                } else {
                    "${BuildConfig.API_BASE_URL}${ticketResponse!!.downloadPdfUrl}"
                }
            } else {
                "${BuildConfig.API_BASE_URL}/api/tickets/$ticketCode/pdf?download=1"
            }

            val request = DownloadManager.Request(Uri.parse(downloadUrl)).apply {
                setTitle("MahaTicket_${ticketCode}.pdf")
                setDescription("अधिकृत महाटिकिट डिजिटल प्रवेश पत्रिका")
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationInExternalPublicDir(
                    Environment.DIRECTORY_DOWNLOADS,
                    "MahaTicket_${ticketCode}.pdf"
                )
                setAllowedOverMetered(true)
                setAllowedOverRoaming(true)
            }

            val manager = context.getSystemService(Context.DOWNLOAD_SERVICE) as? DownloadManager
            if (manager != null) {
                manager.enqueue(request)
                Toast.makeText(
                    context,
                    "✓ PDF तिकीट डाऊनलोड सुरू झाले... Downloads फोल्डर तपासा.",
                    Toast.LENGTH_LONG
                ).show()
            } else {
                val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(downloadUrl))
                context.startActivity(browserIntent)
            }
        } catch (e: Exception) {
            Toast.makeText(
                context,
                "डाऊनलोड अयशस्वी: ${e.localizedMessage ?: "ब्राउझरमध्ये उघडत आहे"}",
                Toast.LENGTH_SHORT
            ).show()
            val fallbackUrl = "${BuildConfig.API_BASE_URL}/api/tickets/$ticketCode/pdf?download=1"
            try {
                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(fallbackUrl)))
            } catch (_: Exception) {}
        } finally {
            isDownloadingPdf = false
        }
    }

    // Map verified server response to UI Booking model
    val bookingData: Booking? = remember(ticketResponse) {
        val resp = ticketResponse ?: return@remember null
        val ord = resp.order
        val tk = resp.ticket
        val ev = resp.event
        val vn = resp.venue
        val ses = resp.session

        val seatsList = ord?.seats?.takeIf { it.isNotEmpty() } ?: listOf(tk?.seatCode ?: "Seat")
        val showDateTime = ses?.sessionStartTime ?: ""
        val qrPayloadString = tk?.qrPayload ?: "${BuildConfig.API_BASE_URL}/tickets/$ticketCode"

        Booking(
            bookingId = ord?.orderNumber ?: ticketCode,
            eventId = ev?.id?.toString() ?: "1",
            eventTitleEn = ev?.title ?: "MahaTicket Event",
            eventTitleMr = ev?.titleMr ?: ev?.title ?: "महाटिकिट कार्यक्रम",
            venueName = vn?.nameMr ?: vn?.name ?: "नाट्यगृह",
            venueAddress = vn?.address ?: vn?.city ?: "महाराष्ट्र",
            showDate = showDateTime,
            showTime = showDateTime,
            seatIds = seatsList,
            ticketCount = ord?.ticketCount ?: seatsList.size,
            baseAmount = ord?.grandTotal ?: 0,
            convenienceFee = 0,
            gstAmount = 0,
            totalAmount = ord?.grandTotal ?: 0,
            userEmail = ord?.email ?: "",
            userPhone = ord?.phone ?: "",
            paymentId = ord?.id?.toString() ?: "",
            paymentMethod = "Verified Booking",
            qrCodeData = qrPayloadString,
            seatTier = SeatTier.EXECUTIVE,
            isCheckedIn = tk?.status == "used"
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
                        onClick = { triggerPdfDownload() }
                    ) {
                        Icon(
                            Icons.Default.Download,
                            contentDescription = "Download PDF",
                            tint = MahaOrange
                        )
                    }
                }
            }

            // Body
            when {
                isLoading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        TheaterLoaderCard(message = "अधिकृत डिजिटल तिकीट लोड होत आहे...")
                    }
                }
                errorMessage != null -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.ErrorOutline,
                            contentDescription = "Error",
                            tint = Color(0xFFDC2626),
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = errorMessage ?: "त्रुटी आली",
                            color = TextPrimary,
                            fontSize = 14.sp,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = { loadTicket() },
                            colors = ButtonDefaults.buttonColors(containerColor = MahaOrange)
                        ) {
                            Text("पुन्हा प्रयत्न करा (Retry)", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                bookingData != null -> {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .weight(1f),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        // Official TicketPassCard with authentic server data and ZXing QR code
                        item {
                            TicketPassCard(
                                booking = bookingData,
                                language = AppLanguage.MARATHI,
                                onShareClick = {
                                    val shareUrl = ticketResponse?.publicShareUrl ?: "${BuildConfig.API_BASE_URL}/tickets/$ticketCode"
                                    val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                        type = "text/plain"
                                        putExtra(
                                            Intent.EXTRA_TEXT,
                                            "माझे महाटिकिट डिजिटल तिकीट: $shareUrl\nऑर्डर #${bookingData.bookingId}"
                                        )
                                    }
                                    context.startActivity(Intent.createChooser(shareIntent, "तिकीट शेअर करा"))
                                },
                                onDownloadPdfClick = { triggerPdfDownload() }
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
                                            val query = Uri.encode("${bookingData.venueName}, ${bookingData.venueAddress}")
                                            val gmmIntentUri = Uri.parse("geo:0,0?q=$query")
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
                                        Text("गुगल मॅप्सवर रस्ता पहा (Get Directions)", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
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
    }
}
