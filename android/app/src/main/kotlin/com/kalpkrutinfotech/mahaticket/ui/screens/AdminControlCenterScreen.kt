package com.kalpkrutinfotech.mahaticket.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.kalpkrutinfotech.mahaticket.theme.*
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.TicketGharViewModel

@Composable
fun AdminControlCenterScreen(
    viewModel: TicketGharViewModel,
    modifier: Modifier = Modifier
) {
    val language by viewModel.language.collectAsState()
    val events by viewModel.events.collectAsState()
    val bookings by viewModel.bookings.collectAsState()

    var showToast by remember { mutableStateOf<String?>(null) }
    var approvalStatus by remember { mutableStateOf("pending") }

    LaunchedEffect(showToast) {
        if (showToast != null) {
            kotlinx.coroutines.delay(3000)
            showToast = null
        }
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFFF9F9FF))
            .testTag("admin_control_center_screen"),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 100.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // 1. Top System Pulse Strip
        item {
            Surface(
                color = Color(0xFFE9EDFF),
                shape = RoundedCornerShape(20.dp),
                border = BorderStroke(1.dp, Color(0xFFDCE2F7)),
                shadowElevation = 1.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .background(Color(0xFF16A34A), CircleShape)
                            )
                            Text(
                                text = "थेट नेटवर्क सुरू • v4.8 Admin",
                                fontSize = 11.5.sp,
                                fontWeight = FontWeight.Bold,
                                color = MahaOrangeDeep
                            )
                        }
                        Text(
                            text = "कल्पकृत इन्फोटेक सिस्टीम्स",
                            fontSize = 11.sp,
                            color = TextSecondary
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "महाटिकिट नियंत्रण केंद्र",
                                fontSize = 19.sp,
                                fontWeight = FontWeight.Black,
                                color = TextPrimary
                            )
                            Text(
                                text = "महाराष्ट्र राज्य ऑपरेशन्स डॅशबोर्ड",
                                fontSize = 11.5.sp,
                                color = TextSecondary,
                                modifier = Modifier.padding(top = 2.dp)
                            )
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            IconButton(
                                onClick = { showToast = "पुणे व मुंबई विभागासाठी तात्काळ नोटीफिकेशन पाठवले!" },
                                modifier = Modifier
                                    .size(38.dp)
                                    .background(Color(0xFFFFF7ED), RoundedCornerShape(10.dp))
                            ) {
                                Icon(Icons.Default.Campaign, contentDescription = null, tint = MahaOrange, modifier = Modifier.size(18.dp))
                            }

                            Button(
                                onClick = { showToast = "दैनिक ऑपरेशन्स अहवाल डाउनलोड होत आहे..." },
                                colors = ButtonDefaults.buttonColors(containerColor = MahaOrange),
                                shape = RoundedCornerShape(10.dp),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                                modifier = Modifier.height(38.dp)
                            ) {
                                Icon(Icons.Default.Download, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("अहवाल", fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }
                    }
                }
            }
        }

        // 2. Metrics Grid (2x2)
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "थेट प्लॅटफॉर्म मॅट्रिक्स",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = "प्रत्येक ३० सेकंदांनी ताजे",
                        fontSize = 11.sp,
                        color = TextSecondary
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Metric 1: Sales
                    Surface(
                        color = Color.White,
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, MahaBorder),
                        shadowElevation = 1.dp,
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("स्थानिक तिकीट नोंदी", fontSize = 11.sp, color = TextSecondary)
                                Text("🎫", fontSize = 14.sp)
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Text("${bookings.size}", fontSize = 20.sp, fontWeight = FontWeight.Black, color = TextPrimary)
                            Text(if (bookings.isNotEmpty()) "थेट उपकरण नोंदी" else "कोणतीही नोंद नाही", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF16A34A))
                        }
                    }

                    // Metric 2: Venues
                    Surface(
                        color = Color.White,
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, MahaBorder),
                        shadowElevation = 1.dp,
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("सक्रिय कार्यक्रम", fontSize = 11.sp, color = TextSecondary)
                                Text("🎭", fontSize = 14.sp)
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Text("${events.size}", fontSize = 20.sp, fontWeight = FontWeight.Black, color = TextPrimary)
                            Text("थेट सर्व्हर सूची", fontSize = 10.sp, color = TextSecondary)
                        }
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Metric 3: Organizers
                    Surface(
                        color = Color.White,
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, MahaBorder),
                        shadowElevation = 1.dp,
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("संबद्ध नाट्यगृहे", fontSize = 11.sp, color = TextSecondary)
                                Text("👥", fontSize = 14.sp)
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            val venueCount = events.map { it.venue.nameMr }.distinct().size
                            Text("$venueCount", fontSize = 20.sp, fontWeight = FontWeight.Black, color = TextPrimary)
                            Text("सक्रिय ठिकाणे", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF16A34A))
                        }
                    }

                    // Metric 4: Pending
                    Surface(
                        color = Color.White,
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, MahaBorder),
                        shadowElevation = 1.dp,
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("सिस्टीम स्थिती", fontSize = 11.sp, color = TextSecondary)
                                Text("📋", fontSize = 14.sp)
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Text("सक्रिय", fontSize = 18.sp, fontWeight = FontWeight.Black, color = Color(0xFF16A34A))
                            Text("सर्व्हर ऑनलाइन", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF16A34A))
                        }
                    }
                }

                // Financial Revenue Card
                Surface(
                    color = Color(0xFFE9EDFF),
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, Color(0xFFDCE2F7)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("₹", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MahaOrange)
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("स्थानिक महसूल सारांश", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            }
                            Surface(
                                color = Color(0xFFFFF7ED),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("थेट आकडेवारी", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = MahaOrange, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        val localTotal = bookings.sumOf { it.totalAmount }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.Bottom
                        ) {
                            Column {
                                Text("₹$localTotal", fontSize = 22.sp, fontWeight = FontWeight.Black, color = TextPrimary)
                                Text("उपकरण बुकिंग मूल्य (Device GMV)", fontSize = 10.5.sp, color = TextSecondary)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text("अधिकृत पोर्टल", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                Text("तपशीलवार अहवाल वेब ॲडमिनवर", fontSize = 10.sp, color = TextSecondary)
                            }
                        }
                    }
                }
            }
        }

        // 3. Urgent Verification & Approval Queue
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.VerifiedUser, contentDescription = null, tint = MahaOrange, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "तातडीची तपासणी व मंजुरी",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    }

                    Surface(
                        color = if (approvalStatus == "pending") Color(0xFFFEE2E2) else Color(0xFFDCFCE7),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text(
                            text = if (approvalStatus == "pending") "१ प्रलंबित" else "मंजूर ✓",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (approvalStatus == "pending") Color(0xFFDC2626) else Color(0xFF16A34A),
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }
                }

                Surface(
                    color = Color.White,
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, MahaBorder),
                    shadowElevation = 1.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            AsyncImage(
                                model = "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=400",
                                contentDescription = null,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .size(70.dp, 95.dp)
                                    .clip(RoundedCornerShape(10.dp))
                            )

                            Column(
                                modifier = Modifier.weight(1f),
                                verticalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Surface(color = Color(0xFFFFF7ED), shape = RoundedCornerShape(6.dp)) {
                                        Text("मराठी संगीत नाटक", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = MahaOrange, modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp))
                                    }
                                    Text("पुणे केंद्र", fontSize = 9.sp, color = TextSecondary)
                                }
                                Text("कट्यार काळजात घुसली", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                Text("सुवर्णमहोत्सवी विशेष प्रयोग", fontSize = 11.sp, color = TextSecondary)
                                Text("आयोजक: स्वरश्री इव्हेंट्स, पुणे", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = MahaOrangeDeep)
                                Text("📍 बालगंधर्व रंगमंदिर • २० मे, सायं. ५:००", fontSize = 10.5.sp, color = TextSecondary)
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // Legal documents pills
                        Surface(
                            color = Color(0xFFF1F3FF),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(8.dp)) {
                                Text("कायदेशीर परवाने व दाखले:", fontSize = 9.5.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                                Spacer(modifier = Modifier.height(4.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text("✓ पोलीस परवाना", fontSize = 9.5.sp, fontWeight = FontWeight.Bold, color = Color(0xFF16A34A))
                                    Text("✓ करमणूक कर", fontSize = 9.5.sp, fontWeight = FontWeight.Bold, color = Color(0xFF16A34A))
                                    Text("✓ नाट्यगृह पावती", fontSize = 9.5.sp, fontWeight = FontWeight.Bold, color = Color(0xFF16A34A))
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Button(
                                onClick = {
                                    approvalStatus = "approved"
                                    showToast = "✓ 'कट्यार काळजात घुसली' प्रयोग मंजूर झाला!"
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF16A34A)),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.weight(1f).height(38.dp)
                            ) {
                                Text("मंजूर करा", fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            }

                            Button(
                                onClick = {
                                    showToast = "सुधारणा नोटीस आयोजकांना पाठवली"
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFFF7ED)),
                                border = BorderStroke(1.dp, Color(0xFFFFEDD5)),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.weight(1f).height(38.dp)
                            ) {
                                Text("सुधारणा", fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = MahaOrange)
                            }

                            Button(
                                onClick = {
                                    approvalStatus = "rejected"
                                    showToast = "प्रयोग नाकारण्यात आला"
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFEE2E2)),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.weight(1f).height(38.dp)
                            ) {
                                Text("नाकारा", fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = Color(0xFFDC2626))
                            }
                        }
                    }
                }
            }
        }

        // 4. Live Gate Scanner Stream
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "थेट गेट स्कॅनर प्रवाह",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(modifier = Modifier.size(6.dp).background(Color(0xFF16A34A), CircleShape))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("सक्रिय स्कॅनर्स: १८", fontSize = 11.sp, color = TextSecondary)
                    }
                }

                Surface(
                    color = Color.White,
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, MahaBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        // Scan 1
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFFF1F3FF), RoundedCornerShape(10.dp))
                                .padding(10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                Surface(shape = CircleShape, color = Color(0xFF16A34A), modifier = Modifier.size(32.dp)) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                    }
                                }
                                Column {
                                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Text("#TK-7892", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                        Text("प्रवेश वैध", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF16A34A))
                                    }
                                    Text("बालगंधर्व रंगमंदिर, पुणे • गेट २", fontSize = 10.sp, color = TextSecondary)
                                }
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text("आत्ताच", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                Text("सीट F-14", fontSize = 10.sp, color = TextSecondary)
                            }
                        }

                        // Scan 2 - Alert
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFFFEE2E2), RoundedCornerShape(10.dp))
                                .padding(10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                Surface(shape = CircleShape, color = Color(0xFFDC2626), modifier = Modifier.size(32.dp)) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(Icons.Default.Warning, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                    }
                                }
                                Column {
                                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Text("#TK-7840", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                        Text("पुनरावृत्ती अलर्ट!", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFFDC2626))
                                    }
                                    Text("प्रबोधनकार ठाकरे, बोरीवली • गेट ३", fontSize = 10.sp, color = TextSecondary)
                                }
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text("२ सेकंद आधी", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFFDC2626))
                                Text("दुपारी वापरले", fontSize = 10.sp, color = TextSecondary)
                            }
                        }
                    }
                }
            }
        }

        // 5. Emergency Controls
        item {
            Surface(
                color = Color(0xFFE9EDFF),
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, Color(0xFFDCE2F7)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Shield, contentDescription = null, tint = Color(0xFFDC2626), modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("आणीबाणी प्लॅटफॉर्म नियंत्रणे", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    }
                    Text("केवळ मुख्य प्रशासक व ऑपरेशन्स टीमसाठी सुरक्षित अ‍ॅक्सेस", fontSize = 10.5.sp, color = TextSecondary, modifier = Modifier.padding(top = 2.dp))

                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Button(
                            onClick = { showToast = "⚠️ तिकीट विक्री थांबवण्यात आली." },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.weight(1f).height(38.dp)
                        ) {
                            Text("तिकीट विक्री थांबवा", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }

                        Button(
                            onClick = { showToast = "✓ गेट लिंक रीसेट झाली." },
                            colors = ButtonDefaults.buttonColors(containerColor = Color.White),
                            border = BorderStroke(1.dp, MahaBorder),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.weight(1f).height(38.dp)
                        ) {
                            Text("गेट लिंक रीसेट", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        }
                    }
                }
            }
        }
    }
}
