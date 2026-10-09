export type Language = 'mr' | 'en';

export type EventCategory =
  | 'plays'
  | 'movies'
  | 'music'
  | 'comedy'
  | 'cultural'
  | 'workshops'
  | 'sports'
  | 'festivals'
  | 'family'
  | 'business'
  | 'all';

export interface EventItem {
  id: number;
  organizerId: number;
  venueId: number;
  title: string;
  titleMr: string;
  slug: string;
  category: string;
  categoryMr: string;
  language: string;
  ageGuidance: string;
  durationMinutes: number;
  description: string;
  descriptionMr: string;
  posterUrl: string;
  bannerUrl?: string | null;
  status: 'draft' | 'submitted' | 'published' | 'unpublish' | 'cancelled' | 'rejected';
  featured: number;
  convenienceFeeType: string;
  convenienceFeeValue: number;
  gstPercent: number;
  cancellationPolicy: string;
  venue?: VenueItem;
  organizer?: OrganizerItem;
  sessions?: EventSessionItem[];
  minPrice?: number;
  rating?: number | null;
  ratingCount?: number | null;
  trailerUrl?: string | null;
  videoUrl?: string | null;
  cast?: string | null;
  tag?: string | null;
}

export interface VenueItem {
  id: number;
  name: string;
  nameMr: string;
  address: string;
  city: string;
  state: string;
  pincode?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  facilities?: string | null;
  totalCapacity: number;
  hasSeatLayout: number;
}

export interface OrganizerItem {
  id: number;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  city: string;
  verificationStatus: string;
  commissionType: string;
  commissionRate: number; // basis points, e.g. 600 = 6%
}

export interface EventSessionItem {
  id: number;
  eventId: number;
  sessionStartTime: string | Date;
  sessionEndTime: string | Date;
  status: string;
  ticketTypes?: TicketTypeItem[];
}

export interface TicketTypeItem {
  id: number;
  eventId: number;
  sessionId: number;
  sectionId?: number | null;
  name: string;
  nameMr: string;
  price: number; // in paise
  totalQuota: number;
  availableQuota: number;
  isSeated: number;
}

export interface SeatItem {
  id: number;
  venueId: number;
  sectionId: number;
  rowLabel: string;
  seatNumber: number;
  seatCode: string;
  tier: string;
  isAccessible: number;
  status?: 'available' | 'held' | 'booked' | 'blocked' | 'selected';
  ticketTypeId?: number;
  price?: number;
  sectionName?: string;
  sectionNameMr?: string;
}

export interface PricingBreakdown {
  ticketCount: number;
  ticketFaceValueTotal: number; // in paise
  platformFeeTotal: number; // in paise
  taxTotal: number; // in paise (18% on platform fee)
  gatewayCostEstimate: number; // in paise
  discountTotal: number; // in paise
  grandTotal: number; // in paise
  appliedCoupon?: string | null;
}

export interface OrderItem {
  id: number;
  orderNumber: string;
  userId: number;
  userEmail: string;
  userPhone: string;
  userName: string;
  eventId: number;
  sessionId: number;
  ticketCount: number;
  ticketFaceValueTotal: number;
  platformFeeTotal: number;
  taxTotal: number;
  gatewayCostEstimate: number;
  discountTotal: number;
  grandTotal: number;
  currency: string;
  paymentStatus: string;
  orderStatus: string;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  createdAt: string | Date;
  event?: EventItem;
  session?: EventSessionItem;
  tickets?: TicketDetailItem[];
}

export interface TicketDetailItem {
  id: number;
  ticketCode: string;
  orderId: number;
  sessionId: number;
  seatCode: string;
  attendeeName: string;
  faceValue: number;
  status: 'valid' | 'used' | 'cancelled' | 'refunded';
  qrPayload: string;
  qrDataUrl?: string;
  securityHash: string;
  createdAt: string | Date;
}

export interface SettlementLedgerItem {
  id: number;
  settlementReference: string;
  organizerId: number;
  organizerName?: string;
  companyName?: string;
  eventId: number;
  eventTitle?: string;
  totalGrossTicketSales: number;
  totalPlatformFeesCollected: number;
  totalPaymentGatewayCost: number;
  totalTaxCollected: number;
  platformCommissionEarned: number;
  totalRefundDeductions: number;
  netPayableToOrganizer: number;
  status: 'pending' | 'in_process' | 'settled' | 'disputed';
  payoutUtr?: string | null;
  settledAt?: string | Date | null;
  createdAt: string | Date;
}
