package com.kalpkrutinfotech.mahaticket.ui.components

import android.graphics.Bitmap
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.kalpkrutinfotech.mahaticket.model.Booking
import com.kalpkrutinfotech.mahaticket.theme.*
import com.kalpkrutinfotech.mahaticket.util.DateTimeUtils

@Composable
fun TicketPassCard(
    booking: Booking,
    language: AppLanguage = AppLanguage.MARATHI,
    onShareClick: () -> Unit = {},
    onDownloadPdfClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val isMarathi = language == AppLanguage.MARATHI

    Card(
        modifier = modifier
            .fillMaxWidth()
            .testTag("ticket_pass_card_${booking.bookingId}"),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
        border = BorderStroke(1.dp, MahaBorder)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // Ticket Header Banner (Stitch Saffron Gradient)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.horizontalGradient(
                            colors = listOf(MahaOrange, MahaOrangeDeep)
                        )
                    )
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(text = "🎭 ", fontSize = 18.sp)
                        Column {
                            Text(
                                text = "महाटिकिट • डिजिटल पास",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.5.sp
                            )
                            Text(
                                text = "अधिकृत प्रवेश पत्रिका (M-Ticket)",
                                color = Color.White.copy(alpha = 0.85f),
                                fontSize = 10.sp
                            )
                        }
                    }

                    // Booking ID Pill
                    Surface(
                        color = Color.White.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            text = "#${booking.bookingId}",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.5.sp,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }

            // Event Details Section
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = if (isMarathi) booking.eventTitleMr else booking.eventTitleEn,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )

                if (isMarathi && booking.eventTitleEn.isNotBlank()) {
                    Text(
                        text = booking.eventTitleEn,
                        fontSize = 11.5.sp,
                        color = TextSecondary,
                        modifier = Modifier.padding(top = 1.dp)
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Venue & Address
                Text(
                    text = "🏛️ ${booking.venueName}",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MahaOrangeDeep
                )
                if (booking.venueAddress.isNotBlank()) {
                    Text(
                        text = booking.venueAddress,
                        fontSize = 11.sp,
                        color = TextSecondary,
                        lineHeight = 15.sp,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Date, Time & Seats Grid
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1.3f)) {
                        Text(
                            text = if (isMarathi) "तारीख व वेळ" else "Date & Time",
                            fontSize = 10.sp,
                            color = TextSecondary
                        )
                        val formattedDateTime = DateTimeUtils.formatTicketPassDateTime(
                            booking.showDate.ifBlank { booking.showTime },
                            isMarathi = isMarathi
                        )
                        Text(
                            text = formattedDateTime,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    }

                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(0.9f)) {
                        Text(
                            text = if (isMarathi) "श्रेणी" else "Tier",
                            fontSize = 10.sp,
                            color = TextSecondary
                        )
                        Text(
                            text = if (isMarathi) booking.seatTier.labelMr else booking.seatTier.labelEn,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    }

                    Column(horizontalAlignment = Alignment.End, modifier = Modifier.weight(0.9f)) {
                        Text(
                            text = if (isMarathi) "जागा क्रमांक" else "Seat Numbers",
                            fontSize = 10.sp,
                            color = TextSecondary
                        )
                        Surface(
                            color = MahaWarm,
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = booking.seatIds.joinToString(", "),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = MahaOrangeDeep,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
            }

            // Perforation Tear-Off Line with Notches
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(20.dp),
                contentAlignment = Alignment.Center
            ) {
                Canvas(modifier = Modifier.fillMaxWidth()) {
                    val pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 10f), 0f)
                    drawLine(
                        color = Color(0xFFCBD5E1),
                        start = Offset(0f, size.height / 2),
                        end = Offset(size.width, size.height / 2),
                        strokeWidth = 1.5f,
                        pathEffect = pathEffect
                    )
                }
            }

            // QR Code Section & Gate Entry
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 16.dp, end = 16.dp, bottom = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Authentic ZXing QR Code generated from server-issued qrCodeData
                val qrBitmap = rememberQrBitmap(booking.qrCodeData.ifBlank { booking.bookingId })

                Box(
                    modifier = Modifier
                        .size(150.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color(0xFFF8FAFC))
                        .padding(8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    if (qrBitmap != null) {
                        Image(
                            bitmap = qrBitmap,
                            contentDescription = "Ticket Entry QR Code",
                            modifier = Modifier.fillMaxSize()
                        )
                    } else {
                        SimulatedQrGraphic(seed = booking.bookingId)
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = if (isMarathi) "प्रवेशद्वारावर स्कॅन करण्यासाठी हा QR दाखवा" else "Scan QR Code at Venue Gate",
                    fontSize = 11.5.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Security Notice Callout (MTSEC verified)
                Surface(
                    color = Color(0xFFFEF3C7),
                    shape = RoundedCornerShape(8.dp),
                    border = BorderStroke(1.dp, Color(0xFFFDE68A)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(10.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(text = "🛡️ ", fontSize = 13.sp)
                            Text(
                                text = if (isMarathi) "सुरक्षित डिजिटल तिकीट (Encrypted MTSEC)" else "Secure Encrypted Ticket (MTSEC)",
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.5.sp,
                                color = Color(0xFF92400E)
                            )
                        }
                        Spacer(modifier = Modifier.height(3.dp))
                        Text(
                            text = if (isMarathi)
                                "• हे तिकीट एनक्रिप्टेड असून केवळ अधिकृत आयोजक/गेट ऑपरेटरद्वारेच सुरक्षितपणे सत्यापित केले जाते."
                            else
                                "• Ticket is cryptographically secured and verified exclusively by authorized gate operators.",
                            fontSize = 10.5.sp,
                            color = Color(0xFF78350F),
                            lineHeight = 14.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Venue Entry Rules Callout
                Surface(
                    color = Color(0xFFF8FAFC),
                    shape = RoundedCornerShape(8.dp),
                    border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(10.dp)) {
                        Text(
                            text = if (isMarathi) "📌 नाट्यगृह प्रवेश नियम:" else "📌 Venue Entry Guidelines:",
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            color = TextPrimary
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = if (isMarathi)
                                "१. प्रयोग सुरू होण्यापूर्वी १५ मिनिटे आधी सभागृहात उपस्थित राहावे.\n२. तिसऱ्या बेलनंतर सभागृहाचे मुख्य दरवाजे बंद केले जातील."
                            else
                                "1. Please arrive 15 minutes before the showtime.\n2. Auditorium doors close promptly after the third bell.",
                            fontSize = 10.sp,
                            color = TextSecondary,
                            lineHeight = 13.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Check-in Status Badge
                if (booking.isCheckedIn) {
                    Surface(
                        color = Color(0xFFDCFCE7),
                        shape = RoundedCornerShape(6.dp),
                        border = BorderStroke(1.dp, Color(0xFF86EFAC))
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = "Checked In",
                                tint = Color(0xFF16A34A),
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (isMarathi) "प्रवेश पडताळणी पूर्ण" else "Gate Entry Verified",
                                color = Color(0xFF16A34A),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                } else {
                    Surface(
                        color = MahaWarm,
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            text = if (isMarathi) "✓ अधिकृत प्रवेश पत्रिका" else "Valid Official Pass",
                            color = MahaOrangeDeep,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Actions: Share & PDF Download Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (onDownloadPdfClick != null) {
                        Button(
                            onClick = onDownloadPdfClick,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = MahaOrangeDeep)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Download,
                                contentDescription = "Download PDF",
                                modifier = Modifier.size(16.dp),
                                tint = Color.White
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (isMarathi) "PDF पास" else "PDF Pass",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }

                    OutlinedButton(
                        onClick = onShareClick,
                        modifier = Modifier.weight(1f).testTag("share_ticket_button"),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = MahaOrange),
                        border = BorderStroke(1.dp, MahaBorder)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Share,
                            contentDescription = "Share",
                            modifier = Modifier.size(16.dp),
                            tint = MahaOrange
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = if (isMarathi) "शेअर करा" else "Share",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MahaOrange
                        )
                    }
                }
            }
        }
    }
}

/**
 * Encodes string content into an authentic QR code ImageBitmap using ZXing.
 */
@Composable
fun rememberQrBitmap(content: String, sizePx: Int = 512): ImageBitmap? {
    return remember(content, sizePx) {
        try {
            if (content.isBlank()) return@remember null
            val hints = mapOf(
                EncodeHintType.CHARACTER_SET to "UTF-8",
                EncodeHintType.MARGIN to 1
            )
            val bitMatrix = QRCodeWriter().encode(
                content,
                BarcodeFormat.QR_CODE,
                sizePx,
                sizePx,
                hints
            )
            val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.RGB_565)
            for (x in 0 until sizePx) {
                for (y in 0 until sizePx) {
                    bitmap.setPixel(
                        x,
                        y,
                        if (bitMatrix.get(x, y)) android.graphics.Color.BLACK else android.graphics.Color.WHITE
                    )
                }
            }
            bitmap.asImageBitmap()
        } catch (_: Exception) {
            null
        }
    }
}

@Composable
fun SimulatedQrGraphic(seed: String) {
    Canvas(modifier = Modifier.fillMaxSize()) {
        val gridSize = 13
        val cellSize = size.width / gridSize
        val hash = seed.hashCode()

        // Corner locator boxes
        drawRect(Color(0xFF1E293B), Offset(0f, 0f), Size(cellSize * 3, cellSize * 3))
        drawRect(Color(0xFFF8FAFC), Offset(cellSize * 0.6f, cellSize * 0.6f), Size(cellSize * 1.8f, cellSize * 1.8f))
        drawRect(Color(0xFF1E293B), Offset(cellSize * 1f, cellSize * 1f), Size(cellSize * 1f, cellSize * 1f))

        drawRect(Color(0xFF1E293B), Offset((gridSize - 3) * cellSize, 0f), Size(cellSize * 3, cellSize * 3))
        drawRect(Color(0xFFF8FAFC), Offset((gridSize - 2.4f) * cellSize, cellSize * 0.6f), Size(cellSize * 1.8f, cellSize * 1.8f))
        drawRect(Color(0xFF1E293B), Offset((gridSize - 2f) * cellSize, cellSize * 1f), Size(cellSize * 1f, cellSize * 1f))

        drawRect(Color(0xFF1E293B), Offset(0f, (gridSize - 3) * cellSize), Size(cellSize * 3, cellSize * 3))
        drawRect(Color(0xFFF8FAFC), Offset(cellSize * 0.6f, (gridSize - 2.4f) * cellSize), Size(cellSize * 1.8f, cellSize * 1.8f))
        drawRect(Color(0xFF1E293B), Offset(cellSize * 1f, (gridSize - 2f) * cellSize), Size(cellSize * 1f, cellSize * 1f))

        for (r in 0 until gridSize) {
            for (c in 0 until gridSize) {
                val isCorner = (r < 3 && c < 3) || (r < 3 && c >= gridSize - 3) || (r >= gridSize - 3 && c < 3)
                if (!isCorner) {
                    val bit = ((hash xor (r * 31 + c * 17)) and 1) == 1
                    if (bit) {
                        drawRect(
                            Color(0xFF1E293B),
                            Offset(c * cellSize, r * cellSize),
                            Size(cellSize * 0.9f, cellSize * 0.9f)
                        )
                    }
                }
            }
        }
    }
}
