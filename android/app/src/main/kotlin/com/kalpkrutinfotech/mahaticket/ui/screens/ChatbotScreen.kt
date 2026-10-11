package com.kalpkrutinfotech.mahaticket.ui.screens

import androidx.compose.foundation.BorderStroke
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
import androidx.compose.material.icons.automirrored.filled.Send
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
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.TicketGharViewModel
import com.kalpkrutinfotech.mahaticket.theme.*
import kotlinx.coroutines.launch

data class ChatMessage(
    val id: String = java.util.UUID.randomUUID().toString(),
    val sender: String, // "user" or "agent"
    val text: String,
    val timestamp: Long = System.currentTimeMillis(),
    val actionLabel: String? = null,
    val actionType: String? = null,
    val eventId: Int? = null,
    val sessionId: Int? = null
)

@Composable
fun ChatbotScreen(
    viewModel: TicketGharViewModel,
    modifier: Modifier = Modifier,
    onNavigateToExplore: () -> Unit = {},
    onNavigateToTickets: () -> Unit = {},
    onNavigateToEvent: (Int) -> Unit = { _ -> },
    onNavigateToSeats: (sessionId: Int, eventId: Int) -> Unit = { _, _ -> }
) {
    val language by viewModel.language.collectAsState()
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
                    "नमस्कार! मी टिकिटमित्र, महाटिकिटचा AI सहाय्यक आहे.\n(महाटिकिट हे कल्पकृत इन्फोटेक चे अधिकृत तिकीट व्यासपीठ आहे)\n\nमहाराष्ट्रातील नाटकांची माहिती, योग्य आसन निवड आणि तिकीट आरक्षणासाठी मी मदत करू शकतो. आपल्याला काय शोधायचे आहे?"
                else
                    "Hello! I am TikitMitra, your MahaTicket AI assistant.\n(MahaTicket is a product of Kalpkrut Infotech)\n\nI can help you discover plays, choose seats, and book tickets instantly across Maharashtra. How may I help you?",
                actionLabel = if (language == AppLanguage.MARATHI) "नाटके शोधा" else "Explore Plays",
                actionType = "explore_category"
            )
        )
    }

    val quickQuestions = remember(language) {
        if (language == AppLanguage.MARATHI) {
            listOf(
                "आजचे नाटक कोणते?",
                "तिकीट कसे बुक करावे?",
                "पुण्यात आज कोणते नाटक आहे?",
                "आसने कशी निवडायची?",
                "कूपन कोड कसा वापरायचा?",
                "माझी तिकिटे कुठे मिळतील?"
            )
        } else {
            listOf(
                "Which plays are showing today?",
                "How to book a ticket?",
                "Popular plays in Pune today",
                "How to select seats?",
                "Apply promo coupon",
                "Where is my ticket QR pass?"
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

            val history = chatMessages.map { (if (it.sender == "user") "user" else "model") to it.text }

            val systemContext = "You are the smart AI assistant for MahaTicket, Maharashtra's official Marathi theatre and cultural booking platform. Help users with real play suggestions, booking guidance, and venue details. Keep responses warm, helpful, and concise in Marathi or English. Emphasize that users can book up to 6 seats per transaction with 100% secure Razorpay checkout."

            val result = viewModel.geminiService.sendMessageWithAction(
                history = history,
                newMessage = textToSend,
                systemContext = systemContext
            )

            val serverAction = result.action
            val reply = result.reply

            val lower = textToSend.lowercase()
            val actionLabel: String
            val actionType: String
            var targetEventId: Int? = null
            var targetSessionId: Int? = null

            if (serverAction != null) {
                actionLabel = serverAction.label
                actionType = serverAction.type
                targetEventId = (serverAction.payload?.get("eventId") as? Number)?.toInt()
                    ?: (serverAction.payload?.get("eventId") as? String)?.toIntOrNull()
                targetSessionId = (serverAction.payload?.get("sessionId") as? Number)?.toInt()
                    ?: (serverAction.payload?.get("sessionId") as? String)?.toIntOrNull()
            } else {
                when {
                    lower.contains("seat") || lower.contains("जागा") || lower.contains("बुक") || lower.contains("book") -> {
                        actionLabel = if (language == AppLanguage.MARATHI) "थेट जागा निवडा" else "Select Seats"
                        actionType = "select_seats"
                        targetSessionId = 1
                        targetEventId = 1
                    }
                    lower.contains("ticket") || lower.contains("तिकीट") || lower.contains("पास") -> {
                        actionLabel = if (language == AppLanguage.MARATHI) "माझी तिकिटे पहा" else "My Tickets"
                        actionType = "my_tickets"
                    }
                    else -> {
                        actionLabel = if (language == AppLanguage.MARATHI) "नाटके एक्सप्लोर करा" else "Explore Events"
                        actionType = "explore_category"
                    }
                }
            }

            chatMessages.add(
                ChatMessage(
                    sender = "agent",
                    text = reply,
                    actionLabel = actionLabel,
                    actionType = actionType,
                    eventId = targetEventId,
                    sessionId = targetSessionId
                )
            )
            isThinking = false
            listState.animateScrollToItem(chatMessages.size - 1)
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MahaBg)
            .testTag("chatbot_screen")
    ) {
        // Chat Header (Stitch Light Theme)
        Surface(
            color = Color.White,
            modifier = Modifier.fillMaxWidth(),
            border = BorderStroke(1.dp, MahaBorder),
            shadowElevation = 1.dp
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
                            .size(38.dp)
                            .background(MahaWarm, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(text = "🎭", fontSize = 20.sp)
                    }

                    Spacer(modifier = Modifier.width(10.dp))

                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = if (language == AppLanguage.MARATHI) "टिकिटमित्र AI" else "TikitMitra AI",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Box(
                                modifier = Modifier
                                    .size(7.dp)
                                    .background(Color(0xFF16A34A), CircleShape)
                            )
                        }
                        Text(
                            text = if (language == AppLanguage.MARATHI)
                                "स्मार्ट तिकीट व नाट्य सल्लागार"
                            else
                                "Smart Ticketing & Show Advisor",
                            fontSize = 11.sp,
                            color = TextSecondary
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
                                    "Conversation reset. How can I assist with your next booking? 🎭",
                                actionLabel = if (language == AppLanguage.MARATHI) "नाटके शोधा" else "Explore Plays",
                                actionType = "explore_category"
                            )
                        )
                    }
                ) {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = "Restart Chat",
                        tint = TextSecondary
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
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(chatMessages) { msg ->
                val isUser = msg.sender == "user"
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = if (isUser) Alignment.End else Alignment.Start
                ) {
                    Surface(
                        color = if (isUser) MahaOrange else Color.White,
                        shape = RoundedCornerShape(
                            topStart = 14.dp,
                            topEnd = 14.dp,
                            bottomStart = if (isUser) 14.dp else 2.dp,
                            bottomEnd = if (isUser) 2.dp else 14.dp
                        ),
                        border = if (!isUser) BorderStroke(1.dp, MahaBorder) else null,
                        shadowElevation = 1.dp,
                        modifier = Modifier.widthIn(max = 320.dp)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                text = msg.text,
                                fontSize = 13.sp,
                                color = if (isUser) Color.White else TextPrimary,
                                lineHeight = 19.sp
                            )

                            // Contextual Action Shortcut leading to real booking / exploration flow
                            if (msg.actionLabel != null && msg.actionType != null) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Button(
                                    onClick = {
                                        when (msg.actionType) {
                                            "open_event" -> {
                                                onNavigateToEvent(msg.eventId ?: 1)
                                            }
                                            "select_seats" -> {
                                                onNavigateToSeats(msg.sessionId ?: 1, msg.eventId ?: 1)
                                            }
                                            "my_tickets" -> {
                                                onNavigateToTickets()
                                            }
                                            else -> {
                                                onNavigateToExplore()
                                            }
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = if (isUser) Color.White else MahaOrange
                                    ),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text(
                                        text = "${msg.actionLabel} ➜",
                                        color = if (isUser) MahaOrangeDeep else Color.White,
                                        fontSize = 11.5.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(2.dp))

                    Text(
                        text = if (isUser) "तुम्ही" else "टिकिटमित्र",
                        fontSize = 9.5.sp,
                        color = TextSecondary,
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
                        Text(text = "🎭", fontSize = 15.sp)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (language == AppLanguage.MARATHI) "टिकिटमित्र विचार करत आहे..." else "TikitMitra is typing...",
                            fontSize = 12.sp,
                            color = MahaOrangeDeep,
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
                        .clip(RoundedCornerShape(16.dp))
                        .clickable { handleSend(prompt) },
                    color = Color.White,
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, MahaBorder),
                    shadowElevation = 1.dp
                ) {
                    Text(
                        text = prompt,
                        fontSize = 11.sp,
                        color = TextPrimary,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                    )
                }
            }
        }

        // Input Bar
        Surface(
            color = Color.White,
            border = BorderStroke(1.dp, MahaBorder),
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 6.dp)
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
                                "टिकिटमित्राला विचारा (उदा. 4 जागा कोणत्या चांगल्या?)..."
                            else
                                "Ask TikitMitra about seats, plays, booking...",
                            fontSize = 12.sp,
                            color = TextSecondary
                        )
                    },
                    modifier = Modifier
                        .weight(1f)
                        .testTag("chat_input_field"),
                    shape = RoundedCornerShape(20.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MahaOrange,
                        unfocusedBorderColor = MahaBorder,
                        focusedContainerColor = MahaWarmLight,
                        unfocusedContainerColor = MahaWarmLight,
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary
                    ),
                    singleLine = true
                )

                Spacer(modifier = Modifier.width(8.dp))

                IconButton(
                    onClick = { handleSend(inputQuery) },
                    enabled = inputQuery.isNotBlank() && !isThinking,
                    modifier = Modifier
                        .size(42.dp)
                        .background(
                            if (inputQuery.isNotBlank()) MahaOrange else Color(0xFFE2E8F0),
                            CircleShape
                        )
                        .testTag("chat_send_button")
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.Send,
                        contentDescription = "Send",
                        tint = if (inputQuery.isNotBlank()) Color.White else Color.Gray,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}
