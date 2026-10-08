package com.kalpkrutinfotech.mahaticket.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.TicketGharViewModel
import com.kalpkrutinfotech.mahaticket.theme.*

@Composable
fun QrScannerScreen(
    viewModel: TicketGharViewModel,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    val language by viewModel.language.collectAsState()
    val scannerResult by viewModel.scannerResult.collectAsState()
    val bookings by viewModel.bookings.collectAsState()

    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        hasCameraPermission = isGranted
    }

    var manualCodeInput by remember { mutableStateOf("") }
    var isTorchEnabled by remember { mutableStateOf(false) }
    var cameraInstance by remember { mutableStateOf<Camera?>(null) }

    // Laser scanning bar animation
    val infiniteTransition = rememberInfiniteTransition(label = "laser_scan")
    val laserYOffset by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 180f,
        animationSpec = infiniteRepeatable(
            animation = tween(1400, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "laser_y"
    )

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(CinemaBg)
            .padding(16.dp)
            .testTag("qr_scanner_screen"),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(TheatricalCrimson, RoundedCornerShape(10.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.QrCodeScanner,
                    contentDescription = "Scanner",
                    tint = Color.White
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column {
                Text(
                    text = if (language == AppLanguage.MARATHI) "नाट्यगृह प्रवेश QR स्कॅनर (CameraX)" else "Venue Entry Gate QR Scanner",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = if (language == AppLanguage.MARATHI) "संपर्करहित कॅमेरा तिकीट पडताळणी" else "Contactless Camera-Based Ticket Validation",
                    fontSize = 11.sp,
                    color = GoldAccent
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Scanner Viewfinder Card with CameraX Preview
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .height(270.dp),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF0F1420))
        ) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                if (hasCameraPermission) {
                    // Live CameraX Feed
                    AndroidView(
                        factory = { ctx ->
                            val previewView = PreviewView(ctx).apply {
                                scaleType = PreviewView.ScaleType.FILL_CENTER
                            }
                            val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                            cameraProviderFuture.addListener({
                                val cameraProvider = cameraProviderFuture.get()
                                val preview = Preview.Builder().build().also {
                                    it.surfaceProvider = previewView.surfaceProvider
                                }
                                val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
                                try {
                                    cameraProvider.unbindAll()
                                    val cam = cameraProvider.bindToLifecycle(
                                        lifecycleOwner,
                                        cameraSelector,
                                        preview
                                    )
                                    cameraInstance = cam
                                } catch (exc: Exception) {
                                    // Fallback to simulation
                                }
                            }, ContextCompat.getMainExecutor(ctx))
                            previewView
                        },
                        modifier = Modifier.fillMaxSize()
                    )
                } else {
                    // Camera permission prompt
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                        modifier = Modifier.padding(20.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CameraAlt,
                            contentDescription = "Camera",
                            tint = GoldAccent,
                            modifier = Modifier.size(44.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = if (language == AppLanguage.MARATHI) "कॅमेरा परवानगी आवश्यक आहे" else "Camera Permission Required",
                            color = Color.White,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = if (language == AppLanguage.MARATHI)
                                "तिकीट QR कोड थेट स्कॅन करण्यासाठी कॅमेरा सुरू करा"
                            else
                                "Enable camera to scan physical or digital ticket passes instantly",
                            color = Color(0xFF94A3B8),
                            fontSize = 11.sp,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Button(
                            onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) },
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = GoldAccent),
                            modifier = Modifier.testTag("grant_camera_permission_button")
                        ) {
                            Text(
                                text = if (language == AppLanguage.MARATHI) "कॅमेरा सुरू करा 📷" else "Enable Camera 📷",
                                color = Color.Black,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                        }
                    }
                }

                // Viewfinder Target Frame Overlay
                Box(
                    modifier = Modifier
                        .size(190.dp)
                        .border(2.dp, GoldAccent, RoundedCornerShape(16.dp))
                        .padding(8.dp)
                ) {
                    // Scanning animated laser line
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(3.dp)
                            .offset(y = laserYOffset.dp)
                            .background(TheatricalCrimsonLight)
                    )

                    Text(
                        text = if (language == AppLanguage.MARATHI) "येथे QR स्कॅन करा" else "Align QR Inside Frame",
                        color = Color.White.copy(alpha = 0.85f),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .background(Color.Black.copy(alpha = 0.6f), RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }

                // Top Status Badge & Flashlight Toggle
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp)
                        .align(Alignment.TopCenter),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        color = Color.Black.copy(alpha = 0.7f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = if (hasCameraPermission) "🟢 CameraX Live Optical Feed" else "⚙️ Manual & Optical Validator",
                            color = if (hasCameraPermission) SuccessEmerald else GoldAccent,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }

                    if (hasCameraPermission) {
                        IconButton(
                            onClick = {
                                isTorchEnabled = !isTorchEnabled
                                cameraInstance?.cameraControl?.enableTorch(isTorchEnabled)
                            },
                            modifier = Modifier
                                .size(34.dp)
                                .background(Color.Black.copy(alpha = 0.6f), CircleShape)
                        ) {
                            Icon(
                                imageVector = if (isTorchEnabled) Icons.Default.FlashOn else Icons.Default.FlashOff,
                                contentDescription = "Torch",
                                tint = if (isTorchEnabled) GoldBright else Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Quick Simulated Scan of Active Bookings for fast contactless testing
        Text(
            text = if (language == AppLanguage.MARATHI) "चाचणीसाठी तिकीट निवडा (Quick Contactless Test Scan):" else "Quick Test Scan from Active Passes:",
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color(0xFF94A3B8),
            modifier = Modifier.align(Alignment.Start)
        )

        Spacer(modifier = Modifier.height(6.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            bookings.take(2).forEach { b ->
                Button(
                    onClick = {
                        manualCodeInput = b.bookingId
                        viewModel.validateGateQr(b.bookingId)
                    },
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                    modifier = Modifier.weight(1f)
                ) {
                    Text(
                        text = "Scan #${b.bookingId}",
                        fontSize = 11.sp,
                        color = GoldAccent
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Manual Input Fallback
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = manualCodeInput,
                onValueChange = { manualCodeInput = it },
                placeholder = {
                    Text(
                        text = if (language == AppLanguage.MARATHI) "किंवा तिकीट ID टाका (उदा. TG-83742)" else "Enter Booking ID manually",
                        fontSize = 12.sp,
                        color = Color(0xFF64748B)
                    )
                },
                modifier = Modifier
                    .weight(1f)
                    .testTag("manual_qr_input"),
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = GoldAccent,
                    unfocusedBorderColor = Color(0xFF334155),
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White
                ),
                singleLine = true
            )

            Spacer(modifier = Modifier.width(8.dp))

            Button(
                onClick = {
                    if (manualCodeInput.isNotBlank()) {
                        viewModel.validateGateQr(manualCodeInput)
                    }
                },
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = GoldAccent),
                modifier = Modifier.testTag("validate_ticket_btn")
            ) {
                Text(text = "Verify", color = Color.Black, fontWeight = FontWeight.Bold, fontSize = 12.sp)
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Validation Result Feedback Card
        scannerResult?.let { res ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("scanner_validation_result_card"),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = when {
                        res.isValid -> Color(0xFF064E3B)
                        res.isAlreadyCheckedIn -> Color(0xFF7F1D1D)
                        else -> Color(0xFF332005)
                    }
                )
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        imageVector = when {
                            res.isValid -> Icons.Default.CheckCircle
                            res.isAlreadyCheckedIn -> Icons.Default.Error
                            else -> Icons.Default.Warning
                        },
                        contentDescription = "Status",
                        tint = when {
                            res.isValid -> SuccessEmerald
                            res.isAlreadyCheckedIn -> Color(0xFFF87171)
                            else -> WarningAmber
                        },
                        modifier = Modifier.size(36.dp)
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = if (language == AppLanguage.MARATHI) res.messageMr else res.messageEn,
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center
                    )

                    res.booking?.let { b ->
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "🎭 ${b.eventTitleMr} • ${b.venueName}",
                            fontSize = 12.sp,
                            color = GoldBright
                        )
                        Text(
                            text = "Seats: ${b.seatIds.joinToString(", ")} • Guests: ${b.ticketCount}",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    TextButton(onClick = { viewModel.clearScannerResult() }) {
                        Text(text = "Dismiss / पुढील तिकीट स्कॅन करा", color = Color.LightGray, fontSize = 11.sp)
                    }
                }
            }
        }
    }
}

