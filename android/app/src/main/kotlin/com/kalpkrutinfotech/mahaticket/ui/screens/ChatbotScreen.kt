package com.kalpkrutinfotech.mahaticket.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kalpkrutinfotech.mahaticket.model.AppTab
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.TicketGharViewModel
import com.kalpkrutinfotech.mahaticket.theme.*
import kotlinx.coroutines.launch

data class ChatMessage(
    val id: String = java.util.UUID.randomUUID().toString(),
    val sender: String, // "user" or "agent"
    val text: String,
    val timestamp: Long = System.currentTimeMillis(),
    val actionLabel: String? = null,
    val actionTab: AppTab? = null
)

@Composable
fun ChatbotScreen(
    viewModel: TicketGharViewModel,
    modifier: Modifier = Modifier
) {
    val language by viewModel.language.collectAsState()
    val events by viewModel.events.collectAsState()
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()

    var inputQuery by remember { mutableStateOf("") }
    var isThinking by remember { mutableStateOf(false) }

    // Multi-turn conversation memory
    val chatMessages = remember {
        mutableStateListOf(
            ChatMessage(
                sender = "agent",
                text = if (language == AppLanguage.MARATHI)
                    "नमस्कार! मी महाटिकिट सहाय्यक आहे.\n\nकार्यक्रम निवडणे, आसन बुकिंग किंवा पेमेंटबद्दल मदत हवी आहे का?"
                else
                    "Hello! I am the MahaTicket assistant.\n\nHow can I help with events, seat booking, or checkout today?",
                actionLabel = if (language == AppLanguage.MARATHI) "कार्यक्रम शोधा" else "Explore Events",
                actionTab = AppTab.EXPLORE
            )
        )
    }

    val quickQuestions = remember(language) {
        if (language == AppLanguage.MARATHI) {
            listOf(
                "आजचे कार्यक्रम कोणते?",
                "आसने कशी निवडायची?",
                "कूपन कसा लागू करायचा?",
                "Razorpay पेमेंट कसे कार्य करते?",
                "माझी तिकिटे कुठे दिसतील?"
            )
        } else {
            listOf(
                "What events are available today?",
                "How do I select seats?",
                "How do coupons work?",
                "How does Razorpay payment work?",
                "Where can I find My Tickets?"
            )
        }
    }

    fun handleSend(textToSend: String) {
        if (textToSend.isBlank() || isThinking) return
        val userMsg = ChatMessage(sender = "user", text = textToSend)
        chatMessages.add(userMsg)
        inputQuery = ""

        isThinking = true
        scope.launch {
            listState.animateScrollToItem(chatMessages.size - 1)

            // Multi-turn history formatting
            val history = chatMessages.map { (if (it.sender == "user") "user" else "model") to it.text }

            val systemContext = "You are the MahaTicket booking support assistant by Kalpkrut Infotech. Guide users through event booking, seats, coupons, and Razorpay checkout. Keep responses polite, concise, and helpful in Marathi or English based on the user's query. Do not invent events, prices, or availability."

            val reply = viewModel.geminiService.sendMessage(
                history = history,
                newMessage = textToSend,
                systemContext = systemContext
            )

            // Determine if contextual shortcut button is appropriate
            val lower = textToSend.lowercase()
            val action = when {
                lower.contains("seat") || lower.contains("जागा") || lower.contains("book") ->
                    (if (language == AppLanguage.MARATHI) "थेट जागा निवडा" else "Select Seats") to AppTab.LIVE_BOOKING
                lower.contains("ticket") || lower.contains("तिकीट") ->
                    (if (language == AppLanguage.MARATHI) "माझी तिकिटे पहा" else "My Tickets") to AppTab.MY_TICKETS
                else -> null
            }

            chatMessages.add(
                ChatMessage(
                    sender = "agent",
                    text = reply,
                    actionLabel = action?.first,
                    actionTab = action?.second
                )
            )
            isThinking = false
            listState.animateScrollToItem(chatMessages.size - 1)
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(CinemaBg)
            .testTag("chatbot_screen")
    ) {
        // Chat Header
        Surface(
            color = CinemaSurface,
            tonalElevation = 6.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(42.dp)
                            .background(TheatricalCrimson, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(text = "🎭", fontSize = 22.sp)
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = if (language == AppLanguage.MARATHI) "नाट्यमित्र (NatyaMitra AI)" else "NatyaMitra AI Assistant",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .background(SuccessEmerald, CircleShape)
                            )
                        }
                        Text(
                            text = if (language == AppLanguage.MARATHI)
                                "मल्टी-स्टेप बुकिंग व तिकीट सहाय्यक"
                            else
                                "Context-Aware Multi-Step Booking Agent",
                            fontSize = 11.sp,
                            color = GoldAccent
                        )
                    }
                }

                // Clear Conversation Button
                IconButton(
                    onClick = {
                        chatMessages.clear()
                        chatMessages.add(
                            ChatMessage(
                                sender = "agent",
                                text = if (language == AppLanguage.MARATHI)
                                    "संभाषण रीसेट केले आहे. तुम्हाला नवीन तिकीट किंवा नाटकांबद्दल कशी मदत हवी आहे? 🎭"
                                else
                                    "Conversation reset. How can I assist with your next booking? 🎭"
                            )
                        )
                    }
                ) {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = "Restart Chat",
                        tint = Color(0xFF94A3B8)
                    )
                }
            }
        }

        // Messages Feed
        LazyColumn(
            state = listState,
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            contentPadding = PaddingValues(vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(chatMessages) { msg ->
                val isUser = msg.sender == "user"
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = if (isUser) Alignment.End else Alignment.Start
                ) {
                    Surface(
                        color = if (isUser) TheatricalCrimson else Color(0xFF1E293B),
                        shape = RoundedCornerShape(
                            topStart = 16.dp,
                            topEnd = 16.dp,
                            bottomStart = if (isUser) 16.dp else 4.dp,
                            bottomEnd = if (isUser) 4.dp else 16.dp
                        ),
                        border = if (!isUser) androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155)) else null,
                        modifier = Modifier.widthIn(max = 320.dp)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(
                                text = msg.text,
                                fontSize = 13.sp,
                                color = Color.White,
                                lineHeight = 19.sp
                            )

                            // Contextual Action Shortcut
                            if (msg.actionLabel != null && msg.actionTab != null) {
                                Spacer(modifier = Modifier.height(10.dp))
                                Button(
                                    onClick = { viewModel.setTab(msg.actionTab) },
                                    colors = ButtonDefaults.buttonColors(containerColor = GoldAccent),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text(
                                        text = "${msg.actionLabel} ➜",
                                        color = Color.Black,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = if (isUser) "You" else "NatyaMitra",
                        fontSize = 10.sp,
                        color = Color(0xFF64748B),
                        modifier = Modifier.padding(horizontal = 4.dp)
                    )
                }
            }

            if (isThinking) {
                item {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(8.dp)
                    ) {
                        Text(text = "🎭", fontSize = 16.sp)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (language == AppLanguage.MARATHI) "नाट्यमित्र विचार करत आहे..." else "NatyaMitra is thinking...",
                            fontSize = 12.sp,
                            color = GoldAccent,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
        }

        // Quick Suggestion Chips Carousel
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 12.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            quickQuestions.forEach { prompt ->
                Surface(
                    modifier = Modifier
                        .clip(RoundedCornerShape(14.dp))
                        .clickable { handleSend(prompt) },
                    color = Color(0xFF131A29),
                    shape = RoundedCornerShape(14.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, GoldAccent.copy(alpha = 0.4f))
                ) {
                    Text(
                        text = prompt,
                        fontSize = 11.sp,
                        color = Color(0xFFE2E8F0),
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                    )
                }
            }
        }

        // Input Bar
        Surface(
            color = CinemaSurface,
            tonalElevation = 8.dp,
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 8.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = inputQuery,
                    onValueChange = { inputQuery = it },
                    placeholder = {
                        Text(
                            text = if (language == AppLanguage.MARATHI)
                                "नाट्यमित्राला विचारा (उदा. 4 जागा कोणत्या चांगल्या आहेत?)..."
                            else
                                "Ask NatyaMitra about seats, plays, booking...",
                            fontSize = 12.sp,
                            color = Color(0xFF64748B)
                        )
                    },
                    modifier = Modifier
                        .weight(1f)
                        .testTag("chat_input_field"),
                    shape = RoundedCornerShape(20.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = GoldAccent,
                        unfocusedBorderColor = Color(0xFF334155),
                        focusedContainerColor = Color(0xFF0F1420),
                        unfocusedContainerColor = Color(0xFF0F1420),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    ),
                    singleLine = true
                )

                Spacer(modifier = Modifier.width(8.dp))

                IconButton(
                    onClick = { handleSend(inputQuery) },
                    enabled = inputQuery.isNotBlank() && !isThinking,
                    modifier = Modifier
                        .size(44.dp)
                        .background(
                            if (inputQuery.isNotBlank()) GoldAccent else Color(0xFF334155),
                            CircleShape
                        )
                        .testTag("chat_send_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.Send,
                        contentDescription = "Send",
                        tint = if (inputQuery.isNotBlank()) Color.Black else Color.Gray,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}

