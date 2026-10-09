package com.kalpkrutinfotech.mahaticket.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.kalpkrutinfotech.mahaticket.theme.*

@Composable
fun TheaterLoaderDialog(
    message: String = "तिकीट प्रणाली कार्यरत आहे... / Preparing your tickets...",
    onDismissRequest: () -> Unit = {}
) {
    Dialog(onDismissRequest = onDismissRequest) {
        TheaterLoaderCard(message = message)
    }
}

/**
 * Stitch Canonical Marathi Theatre Loading Mask:
 * Dual Contemplative / Joyful Mask with Natya Mukut (Golden Crown),
 * Marathi Chandrakor Tikka, Ornamental Halo Ring, and Radiant Aura.
 */
@Composable
fun TheaterLoaderCard(
    message: String = "कृपया प्रतीक्षा करा...",
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "ticket_loading_anim")

    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 0.92f,
        targetValue = 1.06f,
        animationSpec = infiniteRepeatable(
            animation = tween(900, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseScale"
    )

    Surface(
        modifier = modifier
            .wrapContentWidth()
            .padding(16.dp),
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        border = androidx.compose.foundation.BorderStroke(1.dp, MahaBorder),
        shadowElevation = 3.dp
    ) {
        Column(
            modifier = Modifier
                .padding(horizontal = 24.dp, vertical = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Ticket Sticker with pulsing animation
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .scale(pulseScale)
                    .background(Color(0xFFFFF7ED), CircleShape)
                    .border(1.5.dp, Color(0xFFFFEDD5), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "🎟️",
                    fontSize = 32.sp
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = "महाटिकिट • MahaTicket",
                color = MahaOrangeDeep,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                letterSpacing = 0.3.sp
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = message.ifBlank { "कृपया प्रतीक्षा करा..." },
                color = TextSecondary,
                fontSize = 12.sp,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Three Shimmering Golden Loading Dots
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                val dotOffset by infiniteTransition.animateFloat(
                    initialValue = 0f,
                    targetValue = 3f,
                    animationSpec = infiniteRepeatable(
                        animation = tween(900, easing = LinearEasing),
                        repeatMode = RepeatMode.Restart
                    ),
                    label = "dotOffset"
                )

                repeat(3) { index ->
                    val isCurrent = (dotOffset.toInt() % 3) == index
                    Box(
                        modifier = Modifier
                            .size(if (isCurrent) 8.dp else 6.dp)
                            .background(
                                color = if (isCurrent) MahaOrange else Color(0xFFCBD5E1),
                                shape = CircleShape
                            )
                    )
                }
            }
        }
    }
}

/**
 * Native Canvas drawing of the Stitch Dual Natya Mask:
 * - Crown (Mukut) with Tilak jewel & rays
 * - Symmetrical left contemplative & right joyful faces
 * - Forehead Chandrakor tikka
 * - Ticket perforation base notch
 */
@Composable
fun MarathiTheatreMaskCanvas(modifier: Modifier = Modifier) {
    Canvas(modifier = modifier) {
        val w = size.width
        val h = size.height
        val cx = w / 2f
        val cy = h / 2f
        val scale = w / 320f

        // 1. Halo Rings
        drawCircle(
            color = Color(0xFFFED7AA),
            radius = 130f * scale,
            center = Offset(cx, cy),
            style = Stroke(
                width = 2.2f * scale,
                pathEffect = PathEffect.dashPathEffect(floatArrayOf(6f * scale, 6f * scale), 0f)
            )
        )
        drawCircle(
            color = MahaOrange.copy(alpha = 0.35f),
            radius = 118f * scale,
            center = Offset(cx, cy),
            style = Stroke(width = 1.5f * scale)
        )

        // 2. Crown / Natya Mukut (Top)
        val crownCenterY = 56f * scale
        // Central teardrop jewel
        val jewelPath = Path().apply {
            moveTo(cx, crownCenterY - 14f * scale)
            quadraticTo(cx - 10f * scale, crownCenterY, cx, crownCenterY + 16f * scale)
            quadraticTo(cx + 10f * scale, crownCenterY, cx, crownCenterY - 14f * scale)
        }
        drawPath(
            path = jewelPath,
            brush = Brush.verticalGradient(
                colors = listOf(Color(0xFFF59E0B), Color(0xFFD97706)),
                startY = crownCenterY - 14f * scale,
                endY = crownCenterY + 16f * scale
            )
        )
        drawCircle(color = Color(0xFFFFF7ED), radius = 2.5f * scale, center = Offset(cx, crownCenterY + 6f * scale))

        // Crown rays arch
        val raysPath = Path().apply {
            moveTo(cx - 22f * scale, crownCenterY + 10f * scale)
            quadraticTo(cx, crownCenterY + 2f * scale, cx + 22f * scale, crownCenterY + 10f * scale)
        }
        drawPath(
            path = raysPath,
            color = Color(0xFFF59E0B),
            style = Stroke(width = 2.5f * scale, cap = StrokeCap.Round)
        )
        drawCircle(color = Color(0xFFF59E0B), radius = 2.5f * scale, center = Offset(cx - 26f * scale, crownCenterY + 12f * scale))
        drawCircle(color = Color(0xFFF59E0B), radius = 2.5f * scale, center = Offset(cx + 26f * scale, crownCenterY + 12f * scale))

        // 3. Mask Bodies (Left = Contemplative, Right = Joyful)
        val maskTop = 78f * scale
        val maskBottom = 258f * scale
        val maskLeft = 82f * scale
        val maskRight = 238f * scale

        // Left Face (Searching / Contemplative)
        val leftFacePath = Path().apply {
            moveTo(cx, maskTop)
            cubicTo(maskLeft + 33f * scale, maskTop, maskLeft, 112f * scale, maskLeft, 164f * scale)
            cubicTo(maskLeft, 212f * scale, maskLeft + 32f * scale, maskBottom - 10f * scale, cx, maskBottom)
            lineTo(cx, maskTop)
            close()
        }
        drawPath(path = leftFacePath, color = Color(0xFFF8FAFC))

        // Right Face (Celebration / Theater Natak Smile)
        val rightFacePath = Path().apply {
            moveTo(cx, maskTop)
            cubicTo(maskRight - 33f * scale, maskTop, maskRight, 112f * scale, maskRight, 164f * scale)
            cubicTo(maskRight, 212f * scale, maskRight - 32f * scale, maskBottom - 10f * scale, cx, maskBottom)
            lineTo(cx, maskTop)
            close()
        }
        drawPath(path = rightFacePath, color = Color(0xFFFFF7ED))

        // Right face subtle orange sheen
        drawPath(
            path = rightFacePath,
            brush = Brush.horizontalGradient(
                colors = listOf(Color.Transparent, MahaOrange.copy(alpha = 0.12f)),
                startX = cx,
                endX = maskRight
            )
        )

        // Outer Mask Contour Rim
        val fullMaskPath = Path().apply {
            moveTo(cx, maskTop)
            cubicTo(maskLeft + 33f * scale, maskTop, maskLeft, 112f * scale, maskLeft, 164f * scale)
            cubicTo(maskLeft, 212f * scale, maskLeft + 32f * scale, maskBottom - 10f * scale, cx, maskBottom)
            cubicTo(maskRight - 32f * scale, maskBottom - 10f * scale, maskRight, 212f * scale, maskRight, 164f * scale)
            cubicTo(maskRight, 112f * scale, maskRight - 33f * scale, maskTop, cx, maskTop)
            close()
        }
        drawPath(
            path = fullMaskPath,
            color = MahaOrange,
            style = Stroke(width = 3.5f * scale)
        )

        // Symmetrical Center Divider
        drawLine(
            color = MahaOrange.copy(alpha = 0.45f),
            start = Offset(cx, maskTop + 2f * scale),
            end = Offset(cx, maskBottom - 2f * scale),
            strokeWidth = 2f * scale,
            pathEffect = PathEffect.dashPathEffect(floatArrayOf(4f * scale, 3f * scale), 0f)
        )

        // 4. LEFT SIDE FEATURES (Contemplative)
        // Eyebrow
        val leftBrow = Path().apply {
            moveTo(cx - 50f * scale, 132f * scale)
            quadraticTo(cx - 30f * scale, 122f * scale, cx - 12f * scale, 130f * scale)
        }
        drawPath(path = leftBrow, color = Color(0xFF475569), style = Stroke(width = 3.2f * scale, cap = StrokeCap.Round))

        // Almond Eye
        val leftEye = Path().apply {
            moveTo(cx - 48f * scale, 148f * scale)
            cubicTo(cx - 38f * scale, 140f * scale, cx - 22f * scale, 140f * scale, cx - 12f * scale, 148f * scale)
            cubicTo(cx - 22f * scale, 154f * scale, cx - 38f * scale, 154f * scale, cx - 48f * scale, 148f * scale)
            close()
        }
        drawPath(path = leftEye, color = Color(0xFF334155))
        drawCircle(color = Color.White, radius = 2.8f * scale, center = Offset(cx - 30f * scale, 147f * scale))

        // Patient Mouth
        val leftMouth = Path().apply {
            moveTo(cx - 36f * scale, 222f * scale)
            quadraticTo(cx - 18f * scale, 216f * scale, cx - 2f * scale, 218f * scale)
        }
        drawPath(path = leftMouth, color = Color(0xFF475569), style = Stroke(width = 3.2f * scale, cap = StrokeCap.Round))

        // 5. RIGHT SIDE FEATURES (Joyful Natak)
        // Arched Eyebrow
        val rightBrow = Path().apply {
            moveTo(cx + 12f * scale, 128f * scale)
            quadraticTo(cx + 30f * scale, 116f * scale, cx + 50f * scale, 126f * scale)
        }
        drawPath(path = rightBrow, color = MahaOrangeDeep, style = Stroke(width = 3.6f * scale, cap = StrokeCap.Round))

        // Wide Celebrating Eye
        val rightEye = Path().apply {
            moveTo(cx + 12f * scale, 145f * scale)
            cubicTo(cx + 22f * scale, 135f * scale, cx + 38f * scale, 135f * scale, cx + 48f * scale, 145f * scale)
            cubicTo(cx + 38f * scale, 157f * scale, cx + 22f * scale, 157f * scale, cx + 12f * scale, 145f * scale)
            close()
        }
        drawPath(path = rightEye, color = MahaOrangeDeep)
        drawCircle(color = Color.White, radius = 3.5f * scale, center = Offset(cx + 30f * scale, 145f * scale))
        drawCircle(color = MahaOrange, radius = 1.5f * scale, center = Offset(cx + 32f * scale, 143.5f * scale))

        // Vibrant Theatre Smile
        val rightSmile = Path().apply {
            moveTo(cx + 2f * scale, 218f * scale)
            quadraticTo(cx + 22f * scale, 234f * scale, cx + 44f * scale, 214f * scale)
        }
        drawPath(path = rightSmile, color = MahaOrange, style = Stroke(width = 3.6f * scale, cap = StrokeCap.Round))

        // 6. Auspicious Marathi Chandrakor Tikka on Forehead
        val tikkaPath = Path().apply {
            moveTo(cx, 94f * scale)
            arcTo(
                rect = androidx.compose.ui.geometry.Rect(cx - 9f * scale, 94f * scale, cx + 9f * scale, 112f * scale),
                startAngleDegrees = -90f,
                sweepAngleDegrees = 90f,
                forceMoveTo = false
            )
            arcTo(
                rect = androidx.compose.ui.geometry.Rect(cx - 7f * scale, 98f * scale, cx + 7f * scale, 112f * scale),
                startAngleDegrees = 0f,
                sweepAngleDegrees = -90f,
                forceMoveTo = false
            )
            close()
        }
        drawPath(path = tikkaPath, color = MahaOrange)
        drawCircle(color = MahaOrangeDeep, radius = 2f * scale, center = Offset(cx, 105f * scale))

        // 7. Base Ticket Stub Notch Perforation
        val stubY = 274f * scale
        drawRoundRect(
            color = Color(0xFFFFF7ED),
            topLeft = Offset(cx - 36f * scale, stubY),
            size = Size(72f * scale, 11f * scale),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(5f * scale, 5f * scale)
        )
        drawRoundRect(
            color = MahaOrange,
            topLeft = Offset(cx - 36f * scale, stubY),
            size = Size(72f * scale, 11f * scale),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(5f * scale, 5f * scale),
            style = Stroke(width = 1.2f * scale)
        )
        // Perforation holes
        listOf(-22f, -11f, 0f, 11f, 22f).forEach { offX ->
            drawCircle(
                color = if (offX == 0f) MahaOrangeDeep else MahaOrange,
                radius = 1.8f * scale,
                center = Offset(cx + offX * scale, stubY + 5.5f * scale)
            )
        }
    }
}
