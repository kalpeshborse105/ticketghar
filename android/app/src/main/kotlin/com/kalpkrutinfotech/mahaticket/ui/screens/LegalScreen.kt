package com.kalpkrutinfotech.mahaticket.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Policy
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kalpkrutinfotech.mahaticket.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LegalScreen(
    policyType: String,
    onNavigateBack: () -> Unit
) {
    val (titleMr, titleEn, content) = when (policyType.lowercase()) {
        "about" -> Triple(
            "आमच्याबद्दल (About MahaTicket)",
            "About MahaTicket",
            """
            महाटिकिट (MahaTicket) हे महाराष्ट्रातील नाट्यगृहे, नाट्यप्रयोग, संगीत मैफिली व सांस्कृतिक कार्यक्रमांसाठीचे अधिकृत आणि पारदर्शक तिकीट आरक्षण व्यासपीठ आहे.
            
            ध्येय व उद्दिष्ट:
            • रसिकांना अखंड, जलद आणि पारदर्शक तिकीट आरक्षण अनुभव देणे.
            • नाट्य निर्माते, आयोजक आणि नाट्यगृहांच्या आसन व्यवस्थापनात डिजिटल क्रांती घडवणे.
            • मराठी रंगभूमीचा समृद्ध सांस्कृतिक वारसा जतन करणे आणि अत्याधुनिक तंत्रज्ञानाशी जोडणे.
            
            कार्यालय:
            कल्पकृत इन्फोटेक (Kalpkrut Infotech)
            पुणे, महाराष्ट्र, भारत.
            संपर्क: contact.mahaticket@gmail.com
            """.trimIndent()
        )
        "refund", "cancellation" -> Triple(
            "परतावा व रद्दीकरण धोरण (Refund & Cancellation)",
            "Refund & Cancellation Policy",
            """
            १. तिकीट रद्दीकरण नियम:
            कार्यक्रम सुरू होण्याच्या २४ तास आधी रद्दीकरण केल्यास ७५% परतावा दिला जाईल. १२ ते २४ तास आधी ५०% परतावा, आणि १२ तासांच्या आत रद्दीकरण केल्यास कोणताही परतावा दिला जाणार नाही.
            
            २. आयोजकांमार्फत कार्यक्रम रद्द झाल्यास:
            जर नाट्यप्रयोग किंवा कार्यक्रम तांत्रिक किंवा अनपेक्षित कारणांमुळे आयोजकांमार्फत रद्द केला गेला, तर १००% मूळ तिकीट रक्कम (Ticket Face Value) ग्राहकाच्या बँक खात्यात ५ ते ७ कामकाजाच्या दिवसांत (Business Days) जमा केली जाईल.
            
            ३. परतावा पद्धत:
            सर्व परतावे मूळ पेमेंट पद्धतीद्वारे (Razorpay / UPI / बँक कार्ड) स्वयंचलितपणे जमा होतात.
            """.trimIndent()
        )
        "privacy" -> Triple(
            "गोपनीयता धोरण (Privacy Policy)",
            "Privacy Policy",
            """
            १. माहिती गोळा करणे:
            आम्ही केवळ तिकीट आरक्षण, ई-तिकीट पाठवणे, प्रवेश पडताळणी आणि ग्राहक सहाय्यासाठी आवश्यक असणारी माहिती (नाव, मोबाईल नंबर, ईमेल आयडी) सुरक्षितपणे संकलित करतो.
            
            २. डेटा सुरक्षा:
            तुमची वैयक्तिक माहिती कोणत्याही तृतीय पक्षाला विकली जात नाही. पेमेंट व्यवहार पूर्णपणे PCI-DSS प्रमाणित Razorpay पेमेंट गेटवेद्वारे सुरक्षित केले जातात.
            
            ३. एसएमएस व सूचना:
            आम्ही स्पॅम करत नाही. केवळ तुमच्या बुक केलेल्या कार्यक्रमाचे तिकीट, शो वेळ स्मरणपत्रे आणि महत्त्वाच्या सूचना पाठवल्या जातात.
            """.trimIndent()
        )
        "terms" -> Triple(
            "नियम व अटी (Terms & Conditions)",
            "Terms & Conditions",
            """
            १. तिकीट आणि प्रवेश:
            प्रत्येक प्रेक्षकाकडे वैध QR कोड असलेले तिकीट असणे आवश्यक आहे. एका तिकीटावर एकाच वेळी एका व्यक्तीला प्रवेश दिला जाईल.
            
            २. नाट्यगृह शिस्त:
            नाट्यप्रयोग सुरू झाल्यानंतर प्रेक्षागृहात प्रवेश आयोजक व नाट्यगृह व्यवस्थापनाच्या नियमांनुसार मर्यादित केला जाऊ शकतो. मोबाईल सायलेंट मोडवर ठेवणे बंधनकारक आहे.
            
            ३. डुप्लिकेट किंवा गैरवापर:
            आधीच स्कॅन केलेले किंवा रद्द केलेले तिकीट गेट स्कॅनरद्वारे त्वरित नाकारले जाईल. तिकीटाची फेरफार करणे बेकायदेशीर आहे.
            """.trimIndent()
        )
        "charges", "fees" -> Triple(
            "प्लॅटफॉर्म व सेवा शुल्क माहिती (Platform Fees)",
            "Platform Fee Policy",
            """
            १. पारदर्शक किंमत मॉडेल:
            महाटिकिटवर तिकीटाचा मूळ दर (Face Value) थेट नाट्य निर्माता / आयोजकाद्वारे ठरवला जातो.
            
            २. प्लॅटफॉर्म सुविधा शुल्क:
            सुरक्षित सर्व्हर, रीअल-टाईम सीट लॉकिंग आणि डिजिटल ई-पास सुविधा सुरळीत चालवण्यासाठी प्रशासकीय धोरणानुसार अत्यल्प प्लॅटफॉर्म शुल्क आकारले जाऊ शकते.
            
            ३. जीएसटी व कर:
            सर्व लागू शासकीय कर (GST) नियमांनुसार पारदर्शकपणे चेकआउटच्या वेळी तपशीलवार दर्शविले जातात. कोणताही छुपा चार्ज आकारला जात नाही.
            """.trimIndent()
        )
        else -> Triple(
            "कायदेशीर माहिती (Legal & Compliance)",
            "Legal & Compliance",
            """
            महाटिकिट प्रणालीच्या सर्व अटी, शर्ती, आणि ग्राहक हक्क माहिती येथे उपलब्ध आहे. अधिक माहितीसाठी support@mahaticket.in वर संपर्क साधा.
            """.trimIndent()
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = titleMr,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = titleEn,
                            fontSize = 11.sp,
                            color = GoldAccent
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = CinemaSurface
                )
            )
        },
        containerColor = CinemaBg,
        modifier = Modifier.testTag("legal_screen")
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Surface(
                    color = CinemaSurface,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Policy,
                                contentDescription = null,
                                tint = GoldAccent,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = "अधिकृत महाटिकिट धोरण (Official Policy)",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = GoldBright
                            )
                        }

                        HorizontalDivider(
                            color = Color(0xFF334155),
                            thickness = 1.dp,
                            modifier = Modifier.padding(vertical = 12.dp)
                        )

                        Text(
                            text = content,
                            fontSize = 13.sp,
                            color = Color(0xFFE2E8F0),
                            lineHeight = 22.sp
                        )
                    }
                }
            }
        }
    }
}
